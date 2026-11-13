import contract from './contract.json' with { type: 'json' };
import mattContract from './matt-contract.json' with { type: 'json' };
import { mattRoutes } from './matt-routes.ts';
import { assistantAnswer, type AssistantConfig } from './matt-assistant.ts';

type Parameter = { name: string; in: string; schema: { type?: string } };
export type Operation = {
  id: string; method: string; path: string; parameters: Parameter[];
  bodyRequired: boolean; input: unknown; status: number; errors: number[];
  matt?: boolean;
};
export type Environment = { url: string; publicKey: string; publicKeys?: string[]; origins: string[]; assistant?: AssistantConfig };
export type RouteGroup = string;
type Dependencies = { env: Environment; fetch?: typeof fetch; operations?: Operation[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxBodyBytes = 1024 * 1024;

function error(status: number, code: string, message: string, headers: Headers) {
  return Response.json({ code, message, details: null, hint: null }, { status, headers });
}

async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > maxBodyBytes) throw new Error('BODY_SIZE');
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) { await reader.cancel(); throw new Error('BODY_SIZE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!bytes) return undefined;
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new Error('JSON_REQUIRED');
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}

// Each prefix owns its route list. Matt can compose his students routes with
// jeromeStudentOperations without replacing handlers or registering duplicates.
export function operationsFor(group: RouteGroup): Operation[] {
  const matchesGroup = (operation: Operation) => operation.path.split('/')[3] === group;
  return [...contract.operations.filter(matchesGroup), ...mattContract.operations
    .filter(operation => mattRoutes.has(operation.id) && !operation.public && matchesGroup(operation))
    .map(operation => ({ ...operation, matt: true }))];
}

export function createHandler(group: RouteGroup, dependencies: Dependencies) {
  const { env } = dependencies;
  const fetcher = dependencies.fetch || fetch;
  const operations = dependencies.operations || operationsFor(group);
  return async (request: Request): Promise<Response> => {
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Expose-Headers': 'X-Excluded-Count, Retry-After',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' });
    const origin = request.headers.get('origin');
    if (origin && !env.origins.includes(origin)) return error(403, '42501', 'Origin is not allowed.', headers);
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const url = new URL(request.url);
      // Supabase hosted and local gateways forward /<function>/<route>.
      const path = url.pathname.startsWith('/functions/v1/') ? url.pathname : '/functions/v1' + url.pathname;
      const segments = path.split('/');
      const operation = operations.find(candidate => candidate.method === request.method &&
        candidate.path.split('/').length === segments.length && candidate.path.split('/').every((part, i) => part.startsWith('{') || part === segments[i]));
      if (!operation) return error(404, 'NOT_FOUND', 'Route not found.', headers);
      const authorization = request.headers.get('authorization');
      if (!env.url || !env.publicKey) return error(500, 'XX000', 'Server configuration is incomplete.', headers);
      const projectKey = request.headers.get('apikey') || '';
      if (!(env.publicKeys || [env.publicKey]).includes(projectKey) || !authorization || !/^Bearer \S+$/i.test(authorization))
        return error(401, 'PGRST301', 'A project key and user session are required.', headers);
      const params: Record<string, string | number | boolean> = Object.create(null);
      for (const parameter of operation.parameters.filter(parameter => parameter.in === 'path')) {
        const index = operation.path.split('/').indexOf(`{${parameter.name}}`);
        let value: string;
        try { value = decodeURIComponent(segments[index]); }
        catch { return error(400, '22023', 'Invalid resource identifier.', headers); }
        if (!uuid.test(value)) return error(400, '22023', 'Invalid resource identifier.', headers);
        params[parameter.name] = value;
      }
      for (const [name, value] of url.searchParams) {
        const parameter = operation.parameters.find(candidate => candidate.in === 'query' && candidate.name === name);
        if (!parameter || Object.hasOwn(params, name)) return error(400, '22023', 'Invalid or repeated query parameter.', headers);
        if (parameter.schema.type === 'integer') {
          const number = Number(value);
          if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(number)) return error(400, '22023', 'Invalid integer query parameter.', headers);
          params[name] = number;
        } else if (parameter.schema.type === 'boolean') {
          if (value !== 'true' && value !== 'false') return error(400, '22023', 'Invalid boolean query parameter.', headers);
          params[name] = value === 'true';
        } else params[name] = value;
      }
      let body: unknown;
      try { body = await readJson(request); }
      catch { return error(400, '22023', 'A bounded valid JSON body is required.', headers); }
      if ((operation.bodyRequired && body === undefined) || (!operation.input && body !== undefined))
        return error(400, '22023', 'Request body does not match this operation.', headers);
      const upstreamHeaders = { apikey: projectKey, Authorization: authorization, 'Content-Type': 'application/json' };
      // Auth verifies the access token, independently of browser-provided claims.
      const user = await fetcher(`${env.url}/auth/v1/user`, { headers: upstreamHeaders, signal: AbortSignal.timeout(10000) });
      if (!user.ok) return error(user.status === 401 || user.status === 403 ? 401 : 500, 'PGRST301', 'The user session could not be verified.', headers);
      const identity = await user.json() as { id?: string };
      if (!identity.id || !uuid.test(identity.id)) return error(401, 'PGRST301', 'Invalid user session.', headers);
      // Use the caller JWT, never a service-role credential. SQL rechecks active
      // session/profile/role/scope at commit and makes the operation atomic.
      const assistant = operation.id === 'askAdvisingAssistant';
      if (assistant && !env.assistant) return error(500, 'XX000', 'The advising assistant is unavailable.', headers);
      const rpc = assistant ? 'matt_assistant_context' : operation.matt ? 'matt_operation' : 'jerome_operation';
      const rpcBody = assistant ? { p_student_id: params.student_id, p_body: body ?? {} }
        : { p_operation: operation.id, p_params: params, p_body: body ?? {} };
      const result = await fetcher(`${env.url}/rest/v1/rpc/${rpc}`, { method: 'POST', headers: upstreamHeaders,
        body: JSON.stringify(rpcBody), signal: AbortSignal.timeout(30000) });
      if (!result.ok) {
        const status = operation.errors.includes(result.status) ? result.status : 500;
        const upstream = await result.json().catch(() => ({})) as { code?: string; message?: string; details?: string };
        // Only controlled PT errors contain reviewed public messages. Database
        // constraint details and SQL row dumps never leave the function.
        const controlled = /^PT(400|401|403|404|409|429)$/.test(upstream.code || '');
        if (status === 429) headers.set('Retry-After', '60');
        const conflict = operation.matt && status === 409 && controlled &&
          ['ENROLLMENT_CONFIRMATION_REQUIRED', 'GRADE_ALREADY_RECORDED', 'ALREADY_ENROLLED'].includes(upstream.details || '')
          ? upstream.details : undefined;
        return error(status, conflict ?? (controlled ? upstream.code! : status === 409 ? '23505' : 'XX000'),
          controlled ? (upstream.message || 'Request rejected.').slice(0, 1000) : 'The operation could not be completed.', headers);
      }
      if (operation.status === 204) return new Response(null, { status: 204, headers });
      const data = await result.json();
      if (assistant && env.assistant) {
        return Response.json(await assistantAnswer(env.assistant, fetcher, data), { status: operation.status, headers });
      }
      if (operation.id === 'listRecommendations') {
        headers.set('X-Excluded-Count', String(data.excluded_count));
        return Response.json(data.rows, { status: operation.status, headers });
      }
      return Response.json(data, { status: operation.status, headers });
    } catch {
      return error(500, 'XX000', 'The operation could not be completed.', headers);
    }
  };
}
