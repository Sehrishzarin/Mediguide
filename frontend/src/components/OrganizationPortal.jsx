import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NavigationDrawer from './NavigationDrawer';

export default function OrganizationPortal() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'services', 'appointments'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [services, setServices] = useState([
    'Emergency 24/7',
    'General Outpatient (OPD)',
    'Diagnostic Radiology',
    'Pharmacy Services'
  ]);

  return (
    <div className="admin-portal-shell">
      {/* Side Navigation Drawer */}
      <NavigationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Top Header with Hamburger Button */}
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
            <span className="badge-org">MEDICAL PROVIDER</span>
            <h3>{user?.name || 'Organization Dashboard'}</h3>
          </div>
        </div>

        <div className="top-bar-right">
          <div className="avatar-sm org" onClick={() => setIsDrawerOpen(true)}>
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'OR'}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="portal-body">
        {activeTab === 'overview' && (
          <div className="view-container">
            <div className="stats-row">
              <div className="stat-box success">
                <span className="number">LIVE 📍</span>
                <span className="label">Map Discovery</span>
              </div>
              <div className="stat-box primary">
                <span className="number">⭐ 4.8</span>
                <span className="label">Patient Rating</span>
              </div>
            </div>

            <section className="section-card">
              <h4 className="card-title">Facility Profile</h4>
              <p>📍 {user?.email ? 'GeoJSON location registered on map' : 'Metro City District'}</p>
              <p>📞 Contact line active for emergency routing.</p>
            </section>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="view-container">
            <section className="section-card">
              <h4 className="card-title">Clinical Services Offered</h4>
              <div className="services-grid-view">
                {services.map((svc, i) => (
                  <div key={i} className="service-chip-large">
                    <span>🩺 {svc}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="view-container">
            <section className="section-card">
              <h4 className="card-title">Patient Appointments Queue</h4>
              <div className="patient-queue-card">
                <div className="queue-item">
                  <div className="patient-avatar">👩</div>
                  <div className="patient-info">
                    <h5>Jane Doe</h5>
                    <p>Requested Cardiology Consult • Today, 3:00 PM</p>
                  </div>
                  <button className="btn-accept">Confirm</button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
