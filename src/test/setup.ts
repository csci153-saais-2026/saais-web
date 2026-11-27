import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act, configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// Lazy route modules and MSW-backed requests can take longer under coverage
// instrumentation, especially on CI. Keep async queries patient without
// increasing the timeout for individual test cases.
configure({
  asyncUtilTimeout: 5000,
  // Skeletons draw a hidden copy of the page from sample data. Text queries
  // should only ever see real content, never that copy (the selector must
  // match descendants too: `ignore` only skips elements that match it).
  defaultIgnore: "script, style, [skullet-loading], [skullet-loading] *",
});

// jsdom has no ResizeObserver; Radix primitives (e.g. Checkbox) measure themselves with it.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom defines matchMedia as undefined; SidebarProvider / useIsMobile read the 768px breakpoint with it.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Floating UI (used by Radix menus, popovers and selects) probes
// `element.matches(':popover-open')` / `':modal'`. jsdom's selector engine
// (nwsapi) recurses through `:modal` -> `:fullscreen` and stalls the event
// loop for ~15s each time a menu opens, so answer those probes directly.
if (typeof Element !== "undefined") {
  const nativeMatches = Element.prototype.matches;
  Element.prototype.matches = function matches(selector: string) {
    if (selector === ":popover-open" || selector === ":modal") return false;
    return nativeMatches.call(this, selector);
  };
}

// Success/error confirmations render through the app-wide Sonner `<Toaster />`
// (mounted in `App`). Mount a fresh one around every test so page tests can
// assert on them; remounting also drops toasts still animating out, so a
// message from one test can never satisfy a lookup in the next.
let toasterHost: HTMLDivElement | null = null;
let toasterRoot: Root | null = null;

beforeEach(async () => {
  if (typeof document === "undefined") return;
  toasterHost = document.createElement("div");
  document.body.append(toasterHost);
  toasterRoot = createRoot(toasterHost);
  await act(async () => {
    toasterRoot?.render(createElement(Toaster));
  });
});

afterEach(async () => {
  if (typeof document === "undefined") return;
  await act(async () => {
    toast.dismiss();
    toasterRoot?.unmount();
  });
  toasterHost?.remove();
  toasterHost = null;
  toasterRoot = null;
});
