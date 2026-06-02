import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Space Grotesk, sans-serif' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 16 }}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
