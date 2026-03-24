import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function UrlTable({ rows, onDeleted, sortBy, sortDir, onSort, SortIcon }) {
  const navigate = useNavigate();

  async function handleDelete(id, code) {
    if (!confirm(`Delete /${code}?`)) return;
    await client.delete(`/api/urls/${id}`);
    onDeleted();
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
              <td className="url-cell" title={row.original_url}>{row.original_url}</td>
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
  );
}
