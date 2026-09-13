import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Shield, Search, Eye, AlertTriangle, History, FileText, Video, Code, CheckCircle2, Lock, HardDrive, Server, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'audit' | 'security'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // content object or null
  const [deleting, setDeleting] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const contentRes = await api.get('/content');
      setItems(contentRes.items);

      if (activeTab === 'audit') {
        const auditRes = await api.get('/admin/audit-logs');
        setAuditLogs(auditRes.items);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, [isAdmin, activeTab]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/content/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchAdminData();
    } catch (err) {
      alert(err.message || 'Delete operation failed');
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Computed summary metrics
  const totalContent = items.length;
  const videoCount = items.filter((i) => i.content_type === 'VIDEO').length;
  const pdfCount = items.filter((i) => i.content_type === 'PDF').length;
  const htmlCount = items.filter((i) => i.content_type === 'HTML').length;
  const totalViews = items.reduce((sum, item) => sum + (item.view_count || 0), 0);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Shield size={18} /> Administrative Console
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Content Management</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/content/new" className="btn btn-primary">
            <Plus size={18} /> Upload New Content
          </Link>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className="stat-value">{totalContent}</div>
            <div className="stat-label">Total Content</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
            <Video size={20} />
          </div>
          <div>
            <div className="stat-value">{videoCount}</div>
            <div className="stat-label">Videos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className="stat-value">{pdfCount}</div>
            <div className="stat-label">PDFs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>
            <Code size={20} />
          </div>
          <div>
            <div className="stat-value">{htmlCount}</div>
            <div className="stat-label">HTML Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-secondary)' }}>
            <Eye size={20} />
          </div>
          <div>
            <div className="stat-value">{totalViews}</div>
            <div className="stat-label">Total Views</div>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('content')}
          className={`btn btn-sm ${activeTab === 'content' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FileText size={16} /> Content Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <History size={16} /> Audit Trail Log
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`btn btn-sm ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <ShieldCheck size={16} /> System Security Status
        </button>
      </div>

      {/* Content Tab View */}
      {activeTab === 'content' && (
        <>
          <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter content table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner" style={{ width: '36px', height: '36px' }} />
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)' }}>
              {error}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Created Date</th>
                    <th>Views</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No content records found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.title}</td>
                        <td>
                          <span className={`type-pill ${item.content_type}`}>
                            {item.content_type}
                          </span>
                        </td>
                        <td>{item.category}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td>{item.view_count}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => navigate(`/admin/content/${item.id}/edit`)}
                              className="btn btn-secondary btn-sm"
                              title="Edit Metadata"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="btn btn-danger btn-sm"
                              title="Delete Content"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Audit Log Tab View */}
      {activeTab === 'audit' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin Email</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit log entries recorded.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.admin_email}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            log.action === 'UPLOAD'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : log.action === 'EDIT'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            log.action === 'UPLOAD'
                              ? 'var(--accent-success)'
                              : log.action === 'EDIT'
                              ? 'var(--accent-warning)'
                              : 'var(--accent-danger)',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{log.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* System Security Status Tab View */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Auth Security */}
          <div className="security-card">
            <div className="security-card-header">
              <Lock size={20} color="var(--accent-primary)" />
              <h3>Authentication & Session Control</h3>
            </div>
            <ul className="security-list">
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Google OAuth 2.0 Integration</strong> (Standard Web App redirect & token exchange)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>HttpOnly Session Cookies</strong> (Prevents XSS token theft; no localStorage tokens)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>SameSite Cookie Protection</strong> (Lax configuration for CSRF mitigation)</span>
              </li>
            </ul>
          </div>

          {/* Authorization Security */}
          <div className="security-card">
            <div className="security-card-header">
              <Shield size={20} color="var(--accent-primary)" />
              <h3>Authorization & Server-Side RBAC</h3>
            </div>
            <ul className="security-list">
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Server-Side Dependency Enforcement</strong> (Express <code>requireAdmin</code> middleware)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Strict Allow-list Elevation</strong> (Server-side <code>ADMIN_EMAILS</code> check)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>403 Forbidden Response</strong> (Viewers blocked at backend API boundary)</span>
              </li>
            </ul>
          </div>

          {/* Storage Security */}
          <div className="security-card">
            <div className="security-card-header">
              <HardDrive size={20} color="var(--accent-primary)" />
              <h3>Storage Isolation & Key Management</h3>
            </div>
            <ul className="security-list">
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Private Object Storage</strong> (S3 / Local isolated directory outside public web root)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Unguessable UUID Object Keys</strong> (Structure: <code>content/&#123;uuid&#125;/filename</code>)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Zero Permanent Public URLs</strong> (No direct public file download links exposed)</span>
              </li>
            </ul>
          </div>

          {/* Content Delivery Security */}
          <div className="security-card">
            <div className="security-card-header">
              <Server size={20} color="var(--accent-primary)" />
              <h3>Protected Content Delivery</h3>
            </div>
            <ul className="security-list">
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>HTTP Range Video Streaming</strong> (Byte chunk responses with 206 Partial Content)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>PDF.js Canvas Viewer</strong> (Binary delivery rendered to HTML5 canvas; no browser print/download)</span>
              </li>
              <li>
                <CheckCircle2 size={16} color="var(--accent-success)" />
                <span><strong>Sandboxed HTML Modules</strong> (<code>nh3</code> HTML sanitization + <code>iframe sandbox</code>)</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-danger)' }}>
              <AlertTriangle size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Confirm Deletion</h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
              <br />
              This will remove the file from private object storage and permanently delete the database record.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
