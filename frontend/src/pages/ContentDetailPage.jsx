import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, Tag, FileText, Video, Code, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { VideoPlayer } from '../components/ProtectedContent/VideoPlayer';
import { PdfViewer } from '../components/ProtectedContent/PdfViewer';
import { HtmlViewer } from '../components/ProtectedContent/HtmlViewer';

export const ContentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/content/${id}`);
        if (isMounted) {
          setContent(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Content not found or unauthorized');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContent();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="page-wrapper">
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)' }}>
          {error || 'Requested content item could not be retrieved.'}
        </div>
      </div>
    );
  }

  const renderPlayer = () => {
    switch (content.content_type) {
      case 'VIDEO':
        return <VideoPlayer contentId={content.id} mimeType={content.mime_type} title={content.title} />;
      case 'PDF':
        return <PdfViewer contentId={content.id} />;
      case 'HTML':
        return <HtmlViewer contentId={content.id} />;
      default:
        return <div>Unsupported content format</div>;
    }
  };

  return (
    <div className="page-wrapper">
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Content Header Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem 2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span className={`type-pill ${content.content_type}`}>
              {content.content_type}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Tag size={14} /> {content.category}
            </span>
          </div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            {content.title}
          </h1>

          {content.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {content.description}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Calendar size={14} /> Created: {new Date(content.created_at).toLocaleDateString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Eye size={14} /> View count: {content.view_count}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--accent-success)' }}>
              <ShieldCheck size={14} /> Access Verified
            </span>
          </div>
        </div>

        {/* Player Container */}
        <div>{renderPlayer()}</div>
      </div>
    </div>
  );
};
