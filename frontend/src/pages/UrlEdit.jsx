import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import client from '../api/client.js';
import { toUnixSec, toDateLocalStr } from '../utils/datetime.js';
import { useFetch } from '../hooks/useFetch.js';
import { useForm } from '../hooks/useForm.js';

export default function UrlEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { form, setForm, handleSubmit, error: submitError, saving } = useForm({
    code: '', original_url: '', click_count: 0, expires_at: '',
  });
  const shortUrl = form.code ? `${window.location.origin}/${form.code}` : '';

  const { data: urlData, error: loadError } = useFetch(`/api/urls/${id}`, {
    errorMessage: 'Failed to load URL record',
  });

  // Populate form once the API data arrives
  useEffect(() => {
    if (!urlData) return;
    setForm({
      code: urlData.code,
      original_url: urlData.original_url,
      click_count: urlData.click_count,
      expires_at: urlData.expires_at ? toDateLocalStr(urlData.expires_at) : '',
    });
  }, [urlData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shortUrl) return;
    QRCode.toDataURL(shortUrl, { width: 200, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [shortUrl]);

  // click_count needs numeric coercion — override the generic handleChange from useForm
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'click_count' ? Number(value) : value }));
  }

  function handleDownloadQr() {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${form.code}.png`;
    a.click();
  }

  const displayError = loadError || submitError;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Edit URL</h1>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="card" style={{ maxWidth: 560, flex: '1 1 400px' }}>
          {displayError && <div className="alert alert-error">{displayError}</div>}

          <form onSubmit={handleSubmit(async (f) => {
            const payload = { ...f };
            if (payload.expires_at) {
              payload.expires_at = toUnixSec(payload.expires_at);
            } else {
              payload.expires_at = null;
            }
            await client.put(`/api/urls/${id}`, payload);
            navigate('/admin/urls');
          })}>
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

        {qrDataUrl && (
          <div className="card" style={{ textAlign: 'center', minWidth: 240 }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>QR Code</p>
            <img src={qrDataUrl} alt="QR code" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12, wordBreak: 'break-all' }}>
              {shortUrl}
            </p>
            <button className="btn btn-secondary" onClick={handleDownloadQr} style={{ width: '100%' }}>
              Download PNG
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
