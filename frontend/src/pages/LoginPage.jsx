import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GoogleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    style={{ display: 'block', flexShrink: 0 }}
    aria-hidden="true"
  >
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.24v3.13C3.26 21.3 7.37 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.25-.74-.38-1.53-.38-2.24s.13-1.5.38-2.24V6.63H1.24C.45 8.24 0 10.06 0 12s.45 3.76 1.24 5.37l4.04-3.13z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.24 6.63l4.04 3.13c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export const LoginPage = () => {
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  if (user) {
    const target = user.role === 'ADMIN' ? '/admin' : '/dashboard';
    navigate(target, { replace: true });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(circle at top, #1E1B4B 0%, #0B0F19 100%)',
      }}
    >
      <div style={{ maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.25rem auto',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <ShieldCheck size={36} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Secure Content Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
            Internal Organization Training &amp; Reference Repository
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 2rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            textAlign: 'center',
          }}
        >
          {/* Official Google Sign In Button */}
          <button
            type="button"
            onClick={loginWithGoogle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Sign in with Google"
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '0.75rem 1.25rem',
              backgroundColor: isHovered ? '#F8FAFC' : '#FFFFFF',
              color: '#1F2937',
              border: isHovered ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '24px 1fr 24px',
              alignItems: 'center',
              boxShadow: isHovered ? '0 2px 4px rgba(0, 0, 0, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
              outline: 'none',
            }}
          >
            <GoogleIcon />
            <span style={{ textAlign: 'center' }}>Sign in with Google</span>
            <div style={{ width: '24px' }} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
