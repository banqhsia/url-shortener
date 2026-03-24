import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client.js';

export default function UrlEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', original_url: '', click_count: 0, expires_at: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get(`/api/urls/${id}`)
      .then(({ data }) => {
        // Convert Unix timestamp (seconds) to datetime-local string
        let expiresLocal = '';
        if (data.expires_at) {
          const d = new Date(data.expires_at * 1000);
          expiresLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        }
        setForm({ code: data.code, original_url: data.original_url, click_count: data.click_count, expires_at: expiresLocal });
      })
      .catch(() => setError('Failed to load URL record'));
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'click_count' ? Number(value) : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (payload.expires_at) {
        payload.expires_at = Math.floor(new Date(payload.expires_at).getTime() / 1000);
      } else {
        payload.expires_at = null; // clear expiry
      }
      await client.put(`/api/urls/${id}`, payload);
      navigate('/admin/urls');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Edit URL</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Short Code</label>
            <input
              name="code"
              type="text"
              value={form.code}
              onChange={handleChange}
              pattern="[0-9a-zA-Z\-]+"
              required
            />
          </div>

          <div className="form-group">
            <label>Original URL</label>
            <input
              name="original_url"
              type="url"
              value={form.original_url}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Redirect Count</label>
            <input
              name="click_count"
              type="number"
              min="0"
              value={form.click_count}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date <span style={{ color: '#888', fontWeight: 400 }}>(leave blank to remove expiry)</span></label>
            <input
              name="expires_at"
              type="datetime-local"
              value={form.expires_at}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
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
