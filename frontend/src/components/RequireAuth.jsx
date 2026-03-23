import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth() {
  const { authStatus } = useAuth();

  if (authStatus === 'loading') return null;
  if (authStatus === 'authenticated') return <Outlet />;
  return <Navigate to="/admin/login" replace />;
}
