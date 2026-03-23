import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Layout() {
  const { setAuthStatus } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setAuthStatus('unauthenticated');
    await client.post('/api/auth/logout').catch(() => {});
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">URL Shortener</div>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/urls">All URLs</NavLink>
          <NavLink to="/admin/urls/bulk">Bulk Create</NavLink>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
