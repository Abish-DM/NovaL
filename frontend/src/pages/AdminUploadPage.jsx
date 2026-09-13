import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, File, AlertCircle, CheckCircle, Video, FileText, Code } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminUploadPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Training');
  const [contentType, setContentType] = useState('VIDEO');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isAdmin) {
    navigate('/dashboard');
    return null;
  }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('content_type', contentType);
      if (description) formData.append('description', description);
      formData.append('file', file);

      await api.post('/admin/content', formData);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getAcceptedExtensions = () => {
    switch (contentType) {
      case 'VIDEO':
        return '.mp4';
      case 'PDF':
        return '.pdf';
      case 'HTML':
        return '.html, .htm';
      default:
        return '*';
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate('/admin')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Content Manager
      </button>

      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Upload New Content
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Upload reference training materials. Objects are stored in private S3/local storage and served via authenticated endpoints.
        </p>

        {error && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Content Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Content Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { type: 'VIDEO', label: 'MP4 Video', icon: <Video size={18} /> },
                { type: 'PDF', label: 'PDF Document', icon: <FileText size={18} /> },
                { type: 'HTML', label: 'HTML Module', icon: <Code size={18} /> },
              ].map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => {
                    setContentType(item.type);
                    setFile(null);
                  }}
                  className={`btn ${contentType === item.type ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center', padding: '0.75rem' }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Security Compliance Overview 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Category input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Category *
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering, Compliance, Onboarding"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Description input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of the training material..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* File Dropzone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Select File ({getAcceptedExtensions()}) *
            </label>
            <div
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept={getAcceptedExtensions()}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Upload size={36} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                {file ? file.name : `Click or drag ${contentType} file to upload`}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB - Ready for upload`
                  : `Allowed format: ${getAcceptedExtensions()} (Max 100MB)`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {uploading ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                  <span>Uploading to Private Storage...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Confirm Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
