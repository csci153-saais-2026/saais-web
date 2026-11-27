import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StartupErrorBoundary } from "./StartupErrorBoundary";
import "./index.css";
import { resolveSaaisEnvConfig } from "@/lib/supabase/client";

async function enableMockingIfConfigured(): Promise<void> {
  if (
    !import.meta.env.DEV &&
    import.meta.env.VITE_API_MODE?.trim().toLowerCase() !== "mock"
  ) {
    return;
  }
  const envConfig = resolveSaaisEnvConfig();
  const explicitExternalPrism = Boolean(
    import.meta.env.VITE_API_BASE_URL?.trim(),
  );
  if (envConfig.mode === "mock" && !explicitExternalPrism) {
    const { startBrowserMockWorker } = await import("@/mocks/browser");
    await startBrowserMockWorker();
  }
}

async function start(): Promise<void> {
  const root = createRoot(document.getElementById("root")!);
  try {
    resolveSaaisEnvConfig();
  } catch (error) {
    console.error("Invalid API configuration:", error);
    root.render(
      <main role="alert">
        The application could not start. Check the API configuration and reload.
      </main>,
    );
    return;
  }

  let mockStartupError = false;
  try {
    await enableMockingIfConfigured();
  } catch (error) {
    console.error("Could not start the mock API worker:", error);
    mockStartupError = true;
  }

  // A production build on the mock accepts any password, so say it is a demo.
  const isDemo =
    !import.meta.env.DEV && resolveSaaisEnvConfig().mode === "mock";

  try {
    const { default: App } = await import("./App.tsx");
    root.render(
      <StrictMode>
        {mockStartupError && (
          <div
            role="alert"
            className="border-b border-destructive bg-destructive/10 px-4 py-2 text-sm"
          >
            The mock API could not start. API requests may fail.
          </div>
        )}
        <StartupErrorBoundary>
          <App />
        </StartupErrorBoundary>
        {isDemo && (
          // Fixed and click-through, so it never moves or blocks the app.
          <div
            role="note"
            className="pointer-events-none fixed bottom-2 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-white shadow-lg"
          >
            DEMO: sample data, not real records
          </div>
        )}
      </StrictMode>,
    );
  } catch (error) {
    console.error("Could not start the application:", error);
    root.render(
      <main role="alert">
        The application could not start. Check the API configuration and reload.
      </main>,
    );
  }
}

void start();
