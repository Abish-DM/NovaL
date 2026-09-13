import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Code } from 'lucide-react';
import { api } from '../../services/api';

export const HtmlViewer = ({ contentId }) => {
  const [htmlDoc, setHtmlDoc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHtml = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/content/${contentId}/html`);
        const text = await response.text();
        if (isMounted) {
          setHtmlDoc(text);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load protected HTML content');
          setLoading(false);
        }
      }
    };

    fetchHtml();
    return () => {
      isMounted = false;
    };
  }, [contentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading sandboxed HTML content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: '650px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <iframe
          title="Protected HTML Sandbox"
          sandbox="allow-scripts"
          srcDoc={htmlDoc}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>

      <div className="security-alert">
        <ShieldAlert size={20} color="var(--accent-success)" />
        <span>
          <strong>Sandboxed Iframe Active:</strong> HTML document is sanitized on upload and isolated inside a sandboxed iframe to prevent cross-origin state access.
        </span>
      </div>
    </div>
  );
};
