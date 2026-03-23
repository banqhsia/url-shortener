import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UrlList from './pages/UrlList.jsx';
import UrlCreate from './pages/UrlCreate.jsx';
import UrlEdit from './pages/UrlEdit.jsx';
import BulkCreate from './pages/BulkCreate.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="urls" element={<UrlList />} />
          <Route path="urls/new" element={<UrlCreate />} />
          <Route path="urls/bulk" element={<BulkCreate />} />
          <Route path="urls/:id/edit" element={<UrlEdit />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
