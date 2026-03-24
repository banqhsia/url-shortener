import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UrlList from './pages/UrlList.jsx';
import UrlCreate from './pages/UrlCreate.jsx';
import UrlEdit from './pages/UrlEdit.jsx';
import BulkCreate from './pages/BulkCreate.jsx';
import UrlStats from './pages/UrlStats.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="urls" element={<UrlList />} />
              <Route path="urls/new" element={<UrlCreate />} />
              <Route path="urls/bulk" element={<BulkCreate />} />
              <Route path="urls/:id/edit" element={<UrlEdit />} />
              <Route path="urls/:id/stats" element={<UrlStats />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
