import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import UrlTable from '../components/UrlTable.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchBar from '../components/SearchBar.jsx';

export default function UrlList() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [error, setError] = useState('');

  async function load(p = page, q = query, sb = sortBy, sd = sortDir) {
    try {
      const { data: res } = await client.get('/api/urls', {
        params: { page: p, limit: 25, q, sort_by: sb, sort_dir: sd },
      });
      setData(res.data);
      setPagination(res.pagination);
    } catch {
      setError('Failed to load URLs');
    }
  }

  useEffect(() => { load(page, query, sortBy, sortDir); }, [page, query, sortBy, sortDir]);

  function handleSearch(q) {
    setQuery(q);
    setPage(1);
  }

  function handleSort(col) {
    const newDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setSortDir(newDir);
    setPage(1);
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span style={{ color: '#bbb', marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All URLs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/urls/bulk')}>
            Bulk Create
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/urls/new')}>
            + New URL
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="toolbar">
          <SearchBar value={query} onChange={handleSearch} />
          <span style={{ fontSize: 13, color: '#888' }}>
            {pagination.total.toLocaleString()} record{pagination.total !== 1 ? 's' : ''}
          </span>
        </div>

        <UrlTable
          rows={data}
          onDeleted={() => load(page, query, sortBy, sortDir)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          SortIcon={SortIcon}
        />
        <Pagination page={page} totalPages={pagination.total_pages} onChange={handlePageChange} />
      </div>
    </div>
  );

  function handlePageChange(p) {
    setPage(p);
  }
}
