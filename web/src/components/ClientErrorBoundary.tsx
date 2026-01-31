'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>
          <h2 style={{ color: 'var(--text)' }}>Ошибка загрузки</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
