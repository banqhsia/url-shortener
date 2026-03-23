import { useState, useEffect } from 'react';
import client from '../api/client.js';
import StatCard from '../components/StatCard.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await client.get('/api/stats/dashboard');
      setStats(data);
    } catch {
      setError('Failed to load stats');
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ fontSize: 12, color: '#888' }}>Auto-refreshes every 60s · UTC+8</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <StatCard label="Total URLs" value={stats?.total_urls?.toLocaleString()} />
        <StatCard label="Clicks Today (UTC+8)" value={stats?.today_clicks_total?.toLocaleString()} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Most Clicked Today</h2>
        {!stats ? (
          <p style={{ color: '#888' }}>Loading…</p>
        ) : stats.top_urls.length === 0 ? (
          <p style={{ color: '#888' }}>No clicks yet today.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Original URL</th>
                  <th>Clicks Today</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_urls.map((row, i) => (
                  <tr key={row.code}>
                    <td className="rank">{i + 1}</td>
                    <td>
                      <a href={`/${row.code}`} target="_blank" rel="noopener noreferrer"
                         style={{ color: '#4f46e5', fontFamily: 'monospace' }}>
                        {row.code}
                      </a>
                    </td>
                    <td className="url-cell" title={row.original_url}>{row.original_url}</td>
                    <td>{row.clicks_today.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
