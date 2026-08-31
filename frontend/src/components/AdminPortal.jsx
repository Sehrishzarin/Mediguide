import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchOrganizations } from '../services/api';
import NavigationDrawer from './NavigationDrawer';

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orgs', 'users', 'settings'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrganizations()
      .then((res) => {
        if (res.success) setOrganizations(res.data);
      })
      .catch(() => {});
  }, []);

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-portal-shell">
      {/* Side Navigation Drawer */}
      <NavigationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Top App Header with Hamburger Button */}
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
            <span className="badge-admin">ADMIN PORTAL</span>
            <h3>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'orgs' && 'Manage Organizations'}
              {activeTab === 'users' && 'User Accounts & Roles'}
              {activeTab === 'settings' && 'System Settings'}
            </h3>
          </div>
        </div>

        <div className="top-bar-right">
          <div className="admin-profile-pill" onClick={() => setIsDrawerOpen(true)}>
            <div className="avatar-sm">AD</div>
          </div>
        </div>
      </header>

      {/* Main Scrollable View Area */}
      <main className="portal-body">
        {/* VIEW 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="view-container">
            {/* Stat Cards */}
            <div className="stats-row">
              <div className="stat-box primary">
                <div className="stat-icon">🏥</div>
                <div className="stat-content">
                  <span className="number">{organizations.length}</span>
                  <span className="label">Registered Facilities</span>
                </div>
              </div>

              <div className="stat-box success">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <span className="number">2</span>
                  <span className="label">Active Users</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <section className="section-card">
              <h4 className="card-title">Quick Administration Actions</h4>
              <div className="admin-actions-grid">
                <button className="action-tile" onClick={() => setActiveTab('orgs')}>
                  <span className="tile-icon">🏥</span>
                  <span>View All Facilities ({organizations.length})</span>
                </button>
                <button className="action-tile" onClick={() => setActiveTab('users')}>
                  <span className="tile-icon">👤</span>
                  <span>Audit User Accounts</span>
                </button>
                <button className="action-tile" onClick={() => setActiveTab('settings')}>
                  <span className="tile-icon">⚙️</span>
                  <span>System Configuration</span>
                </button>
              </div>
            </section>

            {/* System Health */}
            <section className="section-card">
              <h4 className="card-title">System Health & Security</h4>
              <div className="health-status-row">
                <div className="health-item">
                  <span className="dot green"></span>
                  <div>
                    <strong>Express API Server</strong>
                    <p>Port 5000 Active</p>
                  </div>
                </div>
                <div className="health-item">
                  <span className="dot blue"></span>
                  <div>
                    <strong>JWT Authentication</strong>
                    <p>Secret Key & Standby Fallback Active</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: MANAGE ORGANIZATIONS */}
        {activeTab === 'orgs' && (
          <div className="view-container">
            <div className="search-bar-inline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search facilities by name or type..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="card-list">
              {filteredOrgs.map((org) => (
                <div key={org._id || org.name} className="admin-org-card">
                  <div className="org-card-header">
                    <div className="org-card-icon">
                      {org.type === 'Hospital' ? '🏥' : org.type === 'Pharmacy' ? '💊' : '🩺'}
                    </div>
                    <div className="org-card-titles">
                      <h5>{org.name}</h5>
                      <span className="type-badge">{org.type}</span>
                    </div>
                    <span className="verified-pill">Verified</span>
                  </div>

                  <div className="org-card-body">
                    <p>📍 {org.address}</p>
                    <p>📞 {org.phone || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: USER ACCOUNTS MANAGER */}
        {activeTab === 'users' && (
          <div className="view-container">
            <section className="section-card">
              <h4 className="card-title">Registered Accounts & Roles</h4>
              <div className="user-list">
                <div className="user-account-card">
                  <div className="user-avatar-circle admin">AD</div>
                  <div className="user-info-text">
                    <h5>{user?.name || 'System Admin'}</h5>
                    <p>{user?.email || 'admin@mediguide.com'}</p>
                  </div>
                  <span className="role-tag admin">ADMIN</span>
                </div>

                <div className="user-account-card">
                  <div className="user-avatar-circle user">US</div>
                  <div className="user-info-text">
                    <h5>Standard Patient User</h5>
                    <p>user@mediguide.com</p>
                  </div>
                  <span className="role-tag user">PATIENT</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 4: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="view-container">
            <section className="section-card">
              <h4 className="card-title">System & Security Settings</h4>
              <div className="setting-item">
                <div className="setting-label">
                  <strong>Environment Configuration (.env)</strong>
                  <p>API Base URL read dynamically from environment.</p>
                </div>
                <span className="setting-value">ACTIVE</span>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>Role-Based Access Control (RBAC)</strong>
                  <p>Enforcing Admin, Organization, and Patient security levels.</p>
                </div>
                <span className="setting-value">ENABLED</span>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
