import { readMailEnvironment, createMailHandler } from "../_shared/mail.ts";

const runtime = (
  globalThis as unknown as {
    Deno: {
      env: { get(name: string): string | undefined };
      serve(handler: (request: Request) => Promise<Response>): void;
    };
  }
).Deno;

runtime.serve(
  createMailHandler(readMailEnvironment((name) => runtime.env.get(name))),
);
