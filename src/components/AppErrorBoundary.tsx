import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** App id, for the dev console message. */
  appId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors thrown by a lazily-loaded app component so a single
 * broken app shows a calm, on-brand fallback instead of leaving the host stuck
 * on its Suspense spinner (or tearing down the whole shell). Brand voice; no
 * emoji, no exclamation points, tokens only.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(`[Foundry] app "${this.props.appId}" failed to render:`, error, info);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--foundry-font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--foundry-text-subtle)',
              marginBottom: 8,
            }}
          >
            Out of order
          </div>
          <div
            style={{
              fontFamily: 'var(--foundry-font-display)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--foundry-text)',
              marginBottom: 8,
            }}
          >
            This app could not be opened
          </div>
          <div style={{ fontFamily: 'var(--foundry-font-body)', fontSize: 14, color: 'var(--foundry-text-muted)', lineHeight: 1.5 }}>
            Something in the app failed while rendering. Return to the dashboard and try again.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
