import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function UrlTable({ rows, onDeleted, sortBy, sortDir, onSort, SortIcon }) {
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState('');

  async function handleDelete(id, code) {
    if (!confirm(`Delete /${code}?`)) return;
    setDeleteError('');
    try {
      await client.delete(`/api/urls/${id}`);
      onDeleted();
    } catch {
      setDeleteError(`Failed to delete /${code}. Please try again.`);
    }
  }

  function SortHeader({ col, label }) {
    if (!onSort) return <th>{label}</th>;
    return (
      <th
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => onSort(col)}
        title={`Sort by ${label}`}
      >
        {label}
        {SortIcon && <SortIcon col={col} />}
      </th>
    );
  }

  if (!rows.length) {
    return <p style={{ color: '#888', padding: '16px 0' }}>No records found.</p>;
  }

  return (
    <div>
    {deleteError && <div className="alert alert-error">{deleteError}</div>}
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortHeader col="code" label="Code" />
            <th>Original URL</th>
            <SortHeader col="click_count" label="Clicks" />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <a href={`/${row.code}`} target="_blank" rel="noopener noreferrer"
                   style={{ color: '#4f46e5', fontFamily: 'monospace' }}>
                  {row.code}
                </a>
              </td>
              <td className="url-cell" title={row.original_url}>
                {row.is_alive === 1 && <span title="URL is reachable" style={{ marginRight: 6, color: '#22c55e' }}>●</span>}
                {row.is_alive === 0 && <span title="URL is unreachable" style={{ marginRight: 6, color: '#ef4444' }}>●</span>}
                {row.is_alive === null && <span title="Not yet checked" style={{ marginRight: 6, color: '#d1d5db' }}>●</span>}
                {row.original_url}
              </td>
              <td>{row.click_count.toLocaleString()}</td>
              <td>
                <div className="actions">
                  <button className="btn btn-secondary" onClick={() => navigate(`/admin/urls/${row.id}/stats`)}>
                    Stats
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/admin/urls/${row.id}/edit`)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(row.id, row.code)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
