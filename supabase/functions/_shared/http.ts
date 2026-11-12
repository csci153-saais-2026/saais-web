import contract from './contract.json' with { type: 'json' };

export type Operation = (typeof contract.operations)[number];
export type Environment = { url: string; publicKey: string; origins: string[] };
export type RouteGroup = 'catalog' | 'school-terms' | 'students' | 'curriculum-transfers' | 'notifications';
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
  return contract.operations.filter(operation => operation.path.split('/')[3] === group);
}

export function createHandler(group: RouteGroup, dependencies: Dependencies) {
  const { env } = dependencies;
  const fetcher = dependencies.fetch || fetch;
  const operations = dependencies.operations || operationsFor(group);
  return async (request: Request): Promise<Response> => {
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Methods': 'POST, PATCH, PUT, DELETE, OPTIONS',
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
      if (request.headers.get('apikey') !== env.publicKey || !authorization || !/^Bearer \S+$/i.test(authorization))
        return error(401, 'PGRST301', 'A project key and user session are required.', headers);
      if (url.search.length) return error(400, '22023', 'Query parameters are not supported for this operation.', headers);
      const params: Record<string, string> = {};
      for (const parameter of operation.parameters) {
        const index = operation.path.split('/').indexOf(`{${parameter.name}}`);
        const value = decodeURIComponent(segments[index]);
        if (!uuid.test(value)) return error(400, '22023', 'Invalid resource identifier.', headers);
        params[parameter.name] = value;
      }
      let body: unknown;
      try { body = await readJson(request); }
      catch { return error(400, '22023', 'A bounded valid JSON body is required.', headers); }
      if ((operation.bodyRequired && body === undefined) || (!operation.input && body !== undefined))
        return error(400, '22023', 'Request body does not match this operation.', headers);
      const upstreamHeaders = { apikey: env.publicKey, Authorization: authorization, 'Content-Type': 'application/json' };
      // Auth verifies the access token, independently of browser-provided claims.
      const user = await fetcher(`${env.url}/auth/v1/user`, { headers: upstreamHeaders, signal: AbortSignal.timeout(10000) });
      if (!user.ok) return error(user.status === 401 || user.status === 403 ? 401 : 500, 'PGRST301', 'The user session could not be verified.', headers);
      const identity = await user.json() as { id?: string };
      if (!identity.id || !uuid.test(identity.id)) return error(401, 'PGRST301', 'Invalid user session.', headers);
      // Use the caller JWT, never a service-role credential. SQL rechecks active
      // session/profile/role/scope at commit and makes the operation atomic.
      const result = await fetcher(`${env.url}/rest/v1/rpc/jerome_operation`, { method: 'POST', headers: upstreamHeaders,
        body: JSON.stringify({ p_operation: operation.id, p_params: params, p_body: body ?? {} }), signal: AbortSignal.timeout(30000) });
      if (!result.ok) {
        const status = operation.errors.includes(result.status) ? result.status : 500;
        const upstream = await result.json().catch(() => ({})) as { code?: string; message?: string };
        // Only controlled PT errors contain reviewed public messages. Database
        // constraint details and SQL row dumps never leave the function.
        const controlled = /^PT(400|401|403|404|409|429)$/.test(upstream.code || '');
        if (status === 429) headers.set('Retry-After', '60');
        return error(status, controlled ? upstream.code! : status === 409 ? '23505' : 'XX000',
          controlled ? (upstream.message || 'Request rejected.').slice(0, 1000) : 'The operation could not be completed.', headers);
      }
      if (operation.status === 204) return new Response(null, { status: 204, headers });
      return Response.json(await result.json(), { status: operation.status, headers });
    } catch {
      return error(500, 'XX000', 'The operation could not be completed.', headers);
    }
  };
}
