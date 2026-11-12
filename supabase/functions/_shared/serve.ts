import { createHandler, type RouteGroup } from './http.ts';

export function serve(group: RouteGroup) {
  const runtime = (globalThis as unknown as { Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void } }).Deno;
  const env = { url: (runtime.env.get('SUPABASE_URL') || '').replace(/\/$/, ''),
    publicKey: runtime.env.get('SUPABASE_PUBLISHABLE_KEY') || runtime.env.get('SUPABASE_ANON_KEY') || '',
    origins: (runtime.env.get('CORS_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean) };
  runtime.serve(createHandler(group, { env }));
}
