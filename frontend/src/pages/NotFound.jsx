import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0fdf4',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '3rem 2.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        maxWidth: '420px',
        width: '100%'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🔍</div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: '0.5rem 0' }}>Page Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.6, margin: '1rem 0 1.5rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link to="/" style={{
            display: 'inline-block',
            background: '#0d9488',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem'
          }}>
            Go to Home
          </Link>
          <Link to="/patient/login" style={{
            display: 'inline-block',
            color: '#0d9488',
            padding: '0.5rem',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}>
            Sign in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}
