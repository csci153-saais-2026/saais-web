import {
  createAuthHookHandler,
  readAuthHookEnvironment,
} from "../_shared/auth-hook.ts";

const runtime = (
  globalThis as unknown as {
    Deno: {
      env: { get(name: string): string | undefined };
      serve(handler: (request: Request) => Promise<Response>): void;
    };
  }
).Deno;

runtime.serve(
  createAuthHookHandler(
    readAuthHookEnvironment((name) => runtime.env.get(name)),
  ),
);
