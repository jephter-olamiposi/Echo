import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-(--color-bg) text-(--color-text-primary) p-8 transition-colors duration-300">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/10 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold mb-2 text-(--color-text-primary)">Something went wrong</h2>
            <p className="text-(--color-text-secondary) mb-8 text-[15px]">
              An unexpected error occurred. Please refresh the app or restart if the problem persists.
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-(--color-text-primary) text-(--color-bg) rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Refresh app
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-6 py-3 bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-primary) rounded-xl font-semibold text-[15px] hover:bg-(--color-surface) active:scale-[0.98] transition-all"
              >
                Try again
              </button>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-(--color-text-tertiary) hover:text-(--color-text-secondary)">
                  Error Details (Dev Mode)
                </summary>
                <pre className="mt-2 p-3 bg-(--color-surface-raised) rounded-lg text-xs text-red-400 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}