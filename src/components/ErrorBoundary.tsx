import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LedgerSync UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center bg-[var(--background)] p-6">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--status-mismatch)]/40 px-5 py-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--status-mismatch)] mb-2">
            Something went wrong
          </div>
          <pre className="font-mono text-[11px] text-[var(--foreground)] whitespace-pre-wrap break-words mb-4">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity uppercase tracking-widest"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
