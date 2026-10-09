// Minimal shell for the organization portal and admin console (no patient tab bar there,
// so Log out lives in this top bar).
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Button, Logo } from '../ui';
import s from './PortalShell.module.css';

export default function PortalShell({ portalName, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={s.page}>
      <header className={s.topbar}>
        <div className={s.inner}>
          <Logo size={32} subtitle={portalName} />
          <div className={s.user}>
            <span className={s.userInfo}>
              <Avatar name={user?.name || ''} size={32} />
              <span className={s.userName}>{user?.name}</span>
            </span>
            <Button variant="secondary" size="sm" icon={LogOut} onClick={handleLogout} className={s.logout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className={s.main}>{children}</main>
    </div>
  );
}
