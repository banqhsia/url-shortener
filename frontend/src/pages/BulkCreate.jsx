import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function BulkCreate() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const urls = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) return setError('Enter at least one URL');

    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const { data } = await client.post('/api/urls/bulk', { urls });
      setResult(data);
      setText('');
    } catch (err) {
      setError(err.response?.data?.error || 'Bulk create failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bulk Create</h1>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <p style={{ color: '#666', marginBottom: 16, fontSize: 13 }}>
          Enter one URL per line. Short codes will be auto-generated for each.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {result && (
          <div className="alert alert-success">
            {result.results.length} created, {result.errors.length} failed.
            {result.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                {result.errors.map((e, i) => (
                  <li key={i}>{e.url}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>URLs (one per line)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'https://example.com/page-one\nhttps://example.com/page-two'}
              rows={10}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create All'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setText('')}>
              Clear
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/urls')}>
              Back to List
            </button>
          </div>
        </form>

        {result && result.results.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Created URLs</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Code</th><th>Original URL</th></tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{r.code}</td>
                      <td className="url-cell">{r.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
