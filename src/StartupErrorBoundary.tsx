import { Component, type ErrorInfo, type ReactNode } from "react";

export class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application rendering failed:", error, info);
  }

  render() {
    return this.state.hasError ? (
      <main role="alert">
        The application encountered an error. Please reload.
      </main>
    ) : (
      this.props.children
    );
  }
}
