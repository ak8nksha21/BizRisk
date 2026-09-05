'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  matchPrefixes: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '◧', matchPrefixes: ['/dashboard'] },
  { label: 'Investigate', href: '/investigate', icon: '＋', matchPrefixes: ['/investigate'] },
  { label: 'Investigations', href: '/dashboard', icon: '☰', matchPrefixes: ['/dashboard', '/investigations'] },
];

export default function Sidebar() {
  const pathname = usePathname() || '';
  const { logout } = useAuth();

  const isActive = (item: NavItem) =>
    item.matchPrefixes.some(p => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <aside className="app-sidebar" style={sidebarStyle}>
      <div style={brandRowStyle}>
        <span style={logoMarkStyle}>B</span>
        <div className="sidebar-label" style={wordmarkColStyle}>
          <span style={wordmarkStyle}>BizRisk</span>
          <span style={wordmarkSubStyle}>Merchant Verification</span>
        </div>
      </div>

      <nav style={navListStyle}>
        {NAV_ITEMS.map(item => (
          <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }} title={item.label}>
            <div style={{ ...navItemStyle, ...(isActive(item) ? navItemActiveStyle : {}) }}>
              <span style={navIconStyle}>{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div style={sidebarFooterStyle}>
        <button onClick={logout} className="btn-ghost" style={logoutButtonStyle} title="Sign out">
          <span className="sidebar-label">Sign out</span>
          <span className="sidebar-label-collapsed-only" aria-hidden="true">⏻</span>
        </button>
      </div>
    </aside>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: '232px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--card)',
  borderRight: '1px solid var(--panel-border)',
  padding: '24px 16px',
  gap: '28px',
  minHeight: '100vh',
};

const brandRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '0 8px',
};

const logoMarkStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--primary)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '16px',
  flexShrink: 0,
};

const wordmarkColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1.2,
};

const wordmarkStyle: React.CSSProperties = {
  fontSize: '16.5px',
  fontWeight: '800',
  letterSpacing: '-0.3px',
  color: 'var(--foreground)',
};

const wordmarkSubStyle: React.CSSProperties = {
  fontSize: '10.5px',
  color: 'var(--foreground-subtle)',
  fontWeight: '600',
};

const navListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '9px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13.5px',
  fontWeight: '600',
  color: 'var(--foreground-muted)',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};

const navItemActiveStyle: React.CSSProperties = {
  background: 'var(--primary-tint)',
  color: 'var(--primary)',
};

const navIconStyle: React.CSSProperties = {
  fontSize: '13px',
  width: '16px',
  textAlign: 'center',
  flexShrink: 0,
};

const sidebarFooterStyle: React.CSSProperties = {
  borderTop: '1px solid var(--panel-border)',
  paddingTop: '16px',
};

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  fontSize: '13px',
  padding: '9px 12px',
};
