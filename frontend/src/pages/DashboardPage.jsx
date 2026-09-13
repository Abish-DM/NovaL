import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Video, FileText, Code, Eye, Calendar, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedType) params.append('content_type', selectedType);

      const data = await api.get(`/content?${params.toString()}`);
      setItems(data.items);
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [search, selectedCategory, selectedType]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'VIDEO':
        return <Video size={16} />;
      case 'PDF':
        return <FileText size={16} />;
      case 'HTML':
        return <Code size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Sparkles size={18} /> Internal Training & Resource Library
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Welcome back, {user?.name || 'User'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Access authorized organization videos, PDF documentation, and interactive training modules.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ minWidth: '180px' }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Content type pills */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['', 'VIDEO', 'PDF', 'HTML'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`btn btn-sm ${selectedType === type ? 'btn-primary' : 'btn-secondary'}`}
            >
              {type === '' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: '36px', height: '36px' }} />
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)' }}>
          {error}
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Filter size={24} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No content found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
            No training materials matched your search query or selected filter options.
          </p>
          {(search || selectedCategory || selectedType) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedType('');
              }}
              className="btn btn-secondary btn-sm"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="content-grid">
          {items.map((item) => (
            <div key={item.id} className="content-card">
              <div>
                <div className="card-header">
                  <span className={`type-pill ${item.content_type}`}>
                    {getTypeIcon(item.content_type)}
                    {item.content_type}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {item.category}
                  </span>
                </div>
                <h3 className="card-title">{item.title}</h3>
                <p className="card-desc">{item.description || 'No description provided.'}</p>
              </div>

              <div>
                <div className="card-footer">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Calendar size={14} />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Eye size={14} />
                    {item.view_count} views
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/content/${item.id}`)}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Open Content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
