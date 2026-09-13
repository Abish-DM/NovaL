import React from 'react';
import { ShieldCheck, LogOut, User as UserIcon, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <ShieldCheck size={20} />
        </div>
        <span>Secure Portal</span>
      </div>

      {user && (
        <div className="navbar-user">
          <span className={`user-badge ${isAdmin ? 'admin' : 'viewer'}`}>
            {user.role}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="avatar" />
            ) : (
              <div
                className="avatar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-input)',
                }}
              >
                <UserIcon size={18} />
              </div>
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</span>
          </div>

          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            title="Sign Out"
            style={{ padding: '0.375rem 0.625rem' }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};
