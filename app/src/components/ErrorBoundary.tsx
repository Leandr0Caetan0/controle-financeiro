import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
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
        <div style={{ minHeight: '100vh', background: '#0F0F13', color: '#FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: '640px', width: '100%', background: 'rgba(127,29,29,0.4)', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '1.5rem' }}>
            <h1 style={{ color: '#FCA5A5', fontWeight: 'bold', marginBottom: '1rem' }}>⚠️ Erro de Renderização</h1>
            <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#FCA5A5' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#7f1d1d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
