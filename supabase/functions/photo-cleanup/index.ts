import {
  createPhotoCleanupHandler,
  readPhotoCleanupEnvironment,
} from "../_shared/photo-cleanup.ts";

const runtime = (
  globalThis as unknown as {
    Deno: {
      env: { get(name: string): string | undefined };
      serve(handler: (request: Request) => Promise<Response>): void;
    };
  }
).Deno;

runtime.serve(
  createPhotoCleanupHandler(
    readPhotoCleanupEnvironment((name) => runtime.env.get(name)),
  ),
);
