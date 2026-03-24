import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function UrlCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ original_url: '', code: '', expires_at: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.original_url) return setError('Original URL is required');
    setSaving(true);
    setError('');
    try {
      const payload = { original_url: form.original_url };
      if (form.code.trim()) payload.code = form.code.trim();
      if (form.expires_at) payload.expires_at = Math.floor(new Date(form.expires_at).getTime() / 1000);
      await client.post('/api/urls', payload);
      navigate('/admin/urls');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create URL');
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New URL</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Original URL *</label>
            <input
              name="original_url"
              type="url"
              value={form.original_url}
              onChange={handleChange}
              placeholder="https://example.com/very/long/url"
              required
            />
          </div>

          <div className="form-group">
            <label>Custom Code <span style={{ color: '#888', fontWeight: 400 }}>(optional — leave blank to auto-generate)</span></label>
            <input
              name="code"
              type="text"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. my-link"
              pattern="[0-9a-zA-Z\-]+"
            />
          </div>

          <div className="form-group">
            <label>Expiry Date <span style={{ color: '#888', fontWeight: 400 }}>(optional — leave blank for no expiry)</span></label>
            <input
              name="expires_at"
              type="datetime-local"
              value={form.expires_at}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/urls')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
