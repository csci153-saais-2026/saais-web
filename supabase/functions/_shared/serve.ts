import { createHandler, type Environment, type RouteGroup } from './http.ts';
import { readAssistantConfig } from './matt-assistant.ts';

export function environment(get: (name: string) => string | undefined): Environment {
  let named: Record<string, unknown> = {};
  try { named = JSON.parse(get('SUPABASE_PUBLISHABLE_KEYS') || '{}'); } catch { /* Legacy deployments provide the single-key variables. */ }
  const keys = [get('SUPABASE_PUBLISHABLE_KEY'), named.default, ...Object.values(named), get('SUPABASE_ANON_KEY')]
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  return { url: (get('SUPABASE_URL') || '').replace(/\/$/, ''), publicKey: keys[0] || '', publicKeys: [...new Set(keys)],
    origins: (get('CORS_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean),
    assistant: readAssistantConfig(get) };
}

export function serve(group: RouteGroup) {
  const runtime = (globalThis as unknown as { Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void } }).Deno;
  const env = environment(name => runtime.env.get(name));
  runtime.serve(createHandler(group, { env }));
}
