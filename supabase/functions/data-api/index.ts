import { createDataApiHandler } from "../_shared/data-api.ts";
import { environment } from "../_shared/serve.ts";

const runtime = (
  globalThis as unknown as {
    Deno: {
      env: { get(name: string): string | undefined };
      serve(handler: (request: Request) => Promise<Response>): void;
    };
  }
).Deno;

runtime.serve(
  createDataApiHandler(environment((name) => runtime.env.get(name))),
);
