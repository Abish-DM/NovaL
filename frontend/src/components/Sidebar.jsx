import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, FolderGit2, Upload, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <div style={{ padding: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Navigation
      </div>
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={18} />
        <span>Dashboard</span>
      </NavLink>

      {isAdmin && (
        <>
          <div style={{ padding: '0.5rem', marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Administration
          </div>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Shield size={18} />
            <span>Manage Content</span>
          </NavLink>
          <NavLink
            to="/admin/content/new"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Upload size={18} />
            <span>Upload Content</span>
          </NavLink>
        </>
      )}
    </aside>
  );
};
