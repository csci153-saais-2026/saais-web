import { configure } from '@testing-library/react'

// Lazy route modules and MSW-backed requests can take longer under coverage
// instrumentation, especially on CI. Keep async queries patient without
// increasing the timeout for individual test cases.
configure({ asyncUtilTimeout: 5000 })

// jsdom has no ResizeObserver; Radix primitives (e.g. Checkbox) measure themselves with it.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
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
  })
}
