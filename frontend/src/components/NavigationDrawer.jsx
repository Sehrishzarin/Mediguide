import { useAuth } from '../context/AuthContext';

export default function NavigationDrawer({ isOpen, onClose, activeTab, onSelectTab }) {
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const handleTabClick = (tabKey) => {
    onSelectTab(tabKey);
    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-user-info">
            <div className="drawer-avatar">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="drawer-user-text">
              <span className={`drawer-role-tag ${user?.role || 'user'}`}>
                {(user?.role || 'USER').toUpperCase()}
              </span>
              <h4>{user?.name || 'User'}</h4>
              <p>{user?.email || ''}</p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Drawer Navigation List */}
        <div className="drawer-menu">
          <p className="drawer-section-label">MAIN MENU</p>

          {/* ADMIN MENU */}
          {user?.role === 'admin' && (
            <>
              <button 
                className={`drawer-menu-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabClick('overview')}
              >
                <span className="menu-icon">📊</span>
                <span>Dashboard Overview</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'orgs' ? 'active' : ''}`}
                onClick={() => handleTabClick('orgs')}
              >
                <span className="menu-icon">🏥</span>
                <span>Manage Organizations</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => handleTabClick('users')}
              >
                <span className="menu-icon">👥</span>
                <span>User Accounts & Roles</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabClick('settings')}
              >
                <span className="menu-icon">⚙️</span>
                <span>System & Security</span>
              </button>
            </>
          )}

          {/* ORGANIZATION MENU */}
          {user?.role === 'organization' && (
            <>
              <button 
                className={`drawer-menu-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabClick('overview')}
              >
                <span className="menu-icon">📊</span>
                <span>Provider Overview</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'services' ? 'active' : ''}`}
                onClick={() => handleTabClick('services')}
              >
                <span className="menu-icon">🩺</span>
                <span>Clinical Services</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => handleTabClick('appointments')}
              >
                <span className="menu-icon">📅</span>
                <span>Patient Appointments</span>
              </button>
            </>
          )}

          {/* REGULAR PATIENT USER MENU */}
          {user?.role === 'user' && (
            <>
              <button 
                className={`drawer-menu-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => handleTabClick('home')}
              >
                <span className="menu-icon">🏠</span>
                <span>Home & Symptoms</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'facilities' ? 'active' : ''}`}
                onClick={() => handleTabClick('facilities')}
              >
                <span className="menu-icon">🏥</span>
                <span>Nearby Facilities</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'consults' ? 'active' : ''}`}
                onClick={() => handleTabClick('consults')}
              >
                <span className="menu-icon">📅</span>
                <span>My Consultations</span>
              </button>

              <button 
                className={`drawer-menu-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabClick('profile')}
              >
                <span className="menu-icon">👤</span>
                <span>My Profile</span>
              </button>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <button className="drawer-logout-btn" onClick={logout}>
            <span className="menu-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
