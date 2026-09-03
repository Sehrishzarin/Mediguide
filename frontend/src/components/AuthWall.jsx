import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthWall() {
  const { login, register } = useAuth();
  const [authTab, setAuthTab] = useState('login'); // 'login' or 'signup'
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('user'); // ONLY 'user' or 'organization'
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      let res;
      if (authTab === 'login') {
        res = await login(email, password);
      } else {
        // Enforce signup restrictions (only user or organization)
        const signupRole = selectedRole === 'organization' ? 'organization' : 'user';
        res = await register({ name, email, password, role: signupRole });
      }

      if (!res.success) {
        setErrorMsg(res.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg('Could not connect to authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wall-container">
      <div className="auth-wall-card">
        {/* App Branding */}
        <div className="auth-brand">
          <div className="auth-logo">🏥</div>
          <h2>MediGuide</h2>
          <p className="auth-subtitle">Healthcare & Emergency Network</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthTab('login'); setErrorMsg(''); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${authTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setAuthTab('signup'); setErrorMsg(''); }}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {authTab === 'signup' && (
            <>
              <div className="form-field">
                <label>Account Type</label>
                <div className="role-selector-group">
                  <button
                    type="button"
                    className={`role-select-btn ${selectedRole === 'user' ? 'selected' : ''}`}
                    onClick={() => setSelectedRole('user')}
                  >
                    👤 Patient / User
                  </button>
                  <button
                    type="button"
                    className={`role-select-btn ${selectedRole === 'organization' ? 'selected' : ''}`}
                    onClick={() => setSelectedRole('organization')}
                  >
                    🏥 Medical Provider
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Full Name / Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder={selectedRole === 'organization' ? 'e.g. City General Clinic' : 'e.g. Sarah Jenkins'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-auth-primary" disabled={submitting}>
            {submitting 
              ? 'Processing...' 
              : authTab === 'login' ? 'Sign In to Portal' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer-hint">
          {authTab === 'login' ? (
            <p>Admin or Provider? Sign in directly using your registered email.</p>
          ) : (
            <p>Admin accounts are managed system-wide and cannot be created via public signup.</p>
          )}
        </div>
      </div>
    </div>
  );
}
