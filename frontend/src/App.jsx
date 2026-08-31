import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkHealth, fetchOrganizations } from './services/api';
import AuthWall from './components/AuthWall';
import AdminPortal from './components/AdminPortal';
import OrganizationPortal from './components/OrganizationPortal';
import NavigationDrawer from './components/NavigationDrawer';
import './App.css';

function MainApp() {
  const { user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, message: 'Connecting...' });
  const [organizations, setOrganizations] = useState([]);
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    checkHealth()
      .then((data) => {
        if (data.status === 'success') {
          setBackendStatus({ online: true, message: 'Backend Online' });
        } else {
          setBackendStatus({ online: false, message: 'API Error' });
        }
      })
      .catch(() => {
        setBackendStatus({ online: false, message: 'Backend Offline' });
      });

    loadOrganizations();
  }, []);

  const loadOrganizations = async (type = '') => {
    try {
      const res = await fetchOrganizations(type);
      if (res.success) {
        setOrganizations(res.data);
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  const handleFilterType = (type) => {
    const newType = selectedType === type ? '' : type;
    setSelectedType(newType);
    loadOrganizations(newType);
  };

  if (loading) {
    return (
      <div className="app-shell flex-center">
        <div className="loading-spinner"></div>
        <p>Loading MediGuide Network...</p>
      </div>
    );
  }

  // 1. AUTHENTICATION WALL
  if (!user) {
    return <AuthWall />;
  }

  // 2. AUTOMATIC ROLE ROUTING: ADMIN PORTAL
  if (user.role === 'admin') {
    return <AdminPortal />;
  }

  // 3. AUTOMATIC ROLE ROUTING: ORGANIZATION PORTAL
  if (user.role === 'organization') {
    return <OrganizationPortal />;
  }

  // 4. AUTOMATIC ROLE ROUTING: PATIENT USER PORTAL
  return (
    <div className="app-shell">
      {/* Side Navigation Drawer */}
      <NavigationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Top Mobile Header with Hamburger Button */}
      <header className="portal-top-bar">
        <div className="top-bar-left">
          <button 
            className="hamburger-btn" 
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Navigation Drawer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="portal-title-box">
            <span className="badge-user">PATIENT</span>
            <h3>{user.name}</h3>
          </div>
        </div>

        <div className="top-bar-right">
          <div className={`status-pill ${backendStatus.online ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{backendStatus.message}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mobile-body">
        {(activeTab === 'home' || activeTab === 'facilities') && (
          <>
            {/* AI Assistant Banner */}
            <section className="hero-banner">
              <div className="hero-badge">AI Powered</div>
              <h3>MediGuide Symptom Checker</h3>
              <p>Describe how you feel to get instant guidance and medical advice.</p>
              <button className="btn-primary">Start Health Check</button>
            </section>

            {/* Quick Actions / Categories Grid */}
            <section className="section">
              <h4 className="section-title">Filter Nearby Facilities</h4>
              <div className="quick-actions-grid">
                <div 
                  className={`action-card ${selectedType === 'Hospital' ? 'active-filter' : ''}`}
                  onClick={() => handleFilterType('Hospital')}
                >
                  <div className="action-icon">🏥</div>
                  <span>Hospitals</span>
                </div>
                <div 
                  className={`action-card ${selectedType === 'Clinic' ? 'active-filter' : ''}`}
                  onClick={() => handleFilterType('Clinic')}
                >
                  <div className="action-icon">🩺</div>
                  <span>Clinics</span>
                </div>
                <div 
                  className={`action-card ${selectedType === 'Pharmacy' ? 'active-filter' : ''}`}
                  onClick={() => handleFilterType('Pharmacy')}
                >
                  <div className="action-icon">💊</div>
                  <span>Pharmacies</span>
                </div>
                <div 
                  className={`action-card ${selectedType === 'Diagnostic Center' ? 'active-filter' : ''}`}
                  onClick={() => handleFilterType('Diagnostic Center')}
                >
                  <div className="action-icon">🔬</div>
                  <span>Diagnostics</span>
                </div>
              </div>
            </section>

            {/* Nearby Organizations List */}
            <section className="section">
              <div className="section-header">
                <h4 className="section-title">
                  {selectedType ? `${selectedType}s Nearby` : 'Nearby Healthcare Facilities'} ({organizations.length})
                </h4>
              </div>

              <div className="org-list">
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <div key={org._id || org.name} className="org-card">
                      <div className="org-icon">
                        {org.type === 'Hospital' ? '🏥' : org.type === 'Pharmacy' ? '💊' : '🩺'}
                      </div>
                      <div className="org-details">
                        <div className="org-top">
                          <h5>{org.name}</h5>
                          <span className="rating-tag">⭐ {org.rating}</span>
                        </div>
                        <p className="org-address">📍 {org.address}</p>
                        <p className="org-phone">📞 {org.phone || 'Contact Available'}</p>
                        <div className="services-pills">
                          {org.services?.slice(0, 3).map((service, i) => (
                            <span key={i} className="service-tag">{service}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No facilities found in this category.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'consults' && (
          <section className="section">
            <h3 className="page-title">My Consultations</h3>
            <div className="empty-state">
              <p>No active consultations recorded.</p>
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="section">
            <h3 className="page-title">Patient Profile</h3>
            <div className="profile-card">
              <div className="avatar-large">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <h4>{user.name}</h4>
              <p>{user.email}</p>
              <div className="role-tag-large">PATIENT ACCOUNT</div>

              <button className="btn-logout" onClick={logout}>Sign Out</button>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          <span>Home</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'facilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('facilities')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span>Facilities</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'consults' ? 'active' : ''}`}
          onClick={() => setActiveTab('consults')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Consults</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
