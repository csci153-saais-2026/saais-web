import { readMailEnvironment, createMailHandler } from "../_shared/mail.ts";
import { reconcilePendingDeletedPhotos } from "../_shared/photo-cleanup.ts";

const runtime = (
  globalThis as unknown as {
    Deno: {
      env: { get(name: string): string | undefined };
      serve(handler: (request: Request) => Promise<Response>): void;
    };
  }
).Deno;

const env = readMailEnvironment((name) => runtime.env.get(name));

runtime.serve(
  createMailHandler(env, fetch, {
    reconcilePhotos: () => reconcilePendingDeletedPhotos(env, fetch),
  }),
);
