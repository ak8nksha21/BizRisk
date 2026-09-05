'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface AuthContextType {
  token: string | null;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === '/';
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bizrisk_token');
    }
    return null;
  });
  const [mounted, setMounted] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);

    // Global listener for unauthorized logout events from API client
    const handleLogout = () => {
      setToken(null);
      localStorage.removeItem('bizrisk_token');
      setError('Session expired or unauthorized. Please log in again.');
    };

    window.addEventListener('auth_logout', handleLogout);
    return () => window.removeEventListener('auth_logout', handleLogout);
  }, []);

  const login = (userId: string) => {
    const trimmed = userId.trim();
    if (!trimmed) {
      setError('User ID cannot be empty.');
      return;
    }
    localStorage.setItem('bizrisk_token', trimmed);
    setToken(trimmed);
    setError('');
  };

  const logout = () => {
    localStorage.removeItem('bizrisk_token');
    setToken(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(userIdInput);
  };

  // The landing page is a public marketing route: render it directly, with
  // no login gate and no app Sidebar, regardless of auth state. Every other
  // route keeps the existing gated behavior below, unchanged.
  if (isPublicRoute) {
    return (
      <AuthContext.Provider value={{ token, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (!mounted) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!token) {
    return (
      <div style={containerStyle}>
        <div className="glass-panel" style={cardStyle}>
          <div style={headerStyle}>
            <div style={logoMarkStyle}>B</div>
            <h1 style={titleStyle}>BizRisk</h1>
            <p style={taglineStyle}>Verify the business. Validate the evidence. Make the safer decision.</p>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <form onSubmit={handleLoginSubmit} style={formStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="user-id">User Authorization Identity</label>
              <input
                id="user-id"
                type="text"
                placeholder="e.g. UserA, UserB"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                style={inputStyle}
                autoFocus
              />
            </div>

            <button type="submit" style={buttonStyle}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      <div style={shellStyle}>
        <Sidebar />
        <div style={contentColStyle}>
          {children}
        </div>
      </div>
    </AuthContext.Provider>
  );
}

const shellStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  width: '100%',
  minHeight: '100vh',
};

const contentColStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
};

// Inline Styles for Login Form
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '20px',
  background: 'var(--bg)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  padding: '40px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
};

const logoMarkStyle: React.CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--primary)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '24px',
  marginBottom: '4px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '800',
  color: 'var(--foreground)',
  letterSpacing: '-0.5px',
};

const taglineStyle: React.CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--foreground-muted)',
  maxWidth: '340px',
  lineHeight: 1.4,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--foreground-muted)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(177, 52, 52, 0.08)',
  border: '1px solid rgba(177, 52, 52, 0.2)',
  color: 'var(--risk-very-high)',
  padding: '12px',
  borderRadius: '8px',
  fontSize: '13.5px',
  textAlign: 'center',
};
