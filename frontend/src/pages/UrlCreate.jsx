import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { toUnixSec } from '../utils/datetime.js';
import { useForm } from '../hooks/useForm.js';

export default function UrlCreate() {
  const navigate = useNavigate();
  const { form, handleChange, handleSubmit, error, saving } = useForm({
    original_url: '',
    code: '',
    expires_at: '',
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New URL</h1>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit(async (f) => {
          if (!f.original_url) throw new Error('Original URL is required');
          const payload = { original_url: f.original_url };
          if (f.code.trim()) payload.code = f.code.trim();
          if (f.expires_at) payload.expires_at = toUnixSec(f.expires_at);
          await client.post('/api/urls', payload);
          navigate('/admin/urls');
        })}>
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
