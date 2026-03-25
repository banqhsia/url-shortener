import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch.js';

export default function UrlStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7d');

  const { data: stats, error } = useFetch(`/api/stats/url/${id}`, {
    params: { period },
    errorMessage: 'Failed to load stats',
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">URL Analytics</h1>
        <button className="btn btn-secondary" onClick={() => navigate(`/admin/urls/${id}/edit`)}>
          ← Edit
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Short code</p>
            <p style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#4f46e5' }}>
              <a href={`/${stats.url.code}`} target="_blank" rel="noopener noreferrer">
                /{stats.url.code}
              </a>
            </p>
            <p style={{ fontSize: 13, color: '#555', marginTop: 4, wordBreak: 'break-all' }}>
              {stats.url.original_url}
            </p>
            <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: '#888' }}>Total clicks (all time)</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{stats.url.click_count.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#888' }}>Clicks in period</p>
                <p style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_clicks.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Daily Clicks</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn ${period === '7d' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPeriod('7d')}
                >
                  7 days
                </button>
                <button
                  className={`btn ${period === '30d' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPeriod('30d')}
                >
                  30 days
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.daily} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#888' }}
                  tickFormatter={(v) => v.slice(5)} // MM-DD
                />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Clicks']}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Bar dataKey="clicks" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {stats.devices && Object.keys(stats.devices).length > 0 && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
              {Object.entries(stats.devices).map(([type, count]) => (
                <div key={type} className="card" style={{ minWidth: 120, textAlign: 'center', padding: '12px 16px' }}>
                  <p style={{ fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'capitalize' }}>{type}</p>
                  <p style={{ fontSize: 22, fontWeight: 700 }}>{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {stats.top_referrers && stats.top_referrers.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top Referrers</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Referrer</th><th>Clicks</th></tr>
                  </thead>
                  <tbody>
                    {stats.top_referrers.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.referrer}</td>
                        <td>{r.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
