import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Plain inline styles on design tokens: this must render even if the app's modules fail
      return (
        <div role="alert" style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: 'var(--sp-4)'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-8) var(--sp-6)',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center'
          }}>
            <span aria-hidden="true" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              marginBottom: 'var(--sp-3)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </span>
            <h1 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text)' }}>Something went wrong</h1>
            <p style={{ marginTop: 'var(--sp-2)', color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
              MediGuide hit an unexpected problem. Refreshing the page usually fixes it.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 'var(--sp-5)',
                minHeight: 'var(--tap)',
                padding: '0 var(--sp-5)',
                background: 'var(--brand)',
                color: '#fff',
                borderRadius: 'var(--r-md)',
                fontWeight: 600,
                fontSize: 'var(--fs-sm)'
              }}
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
