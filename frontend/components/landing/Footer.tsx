import React from 'react';
import { CONTAINER_STYLE } from './shared';

const LINKS = [
  { label: 'Product', href: '#capabilities' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Risk Intelligence', href: '#risk-intelligence' },
  { label: 'Evaluation', href: '#evaluation' },
  { label: 'Demo', href: '#demo' },
];

export default function Footer() {
  return (
    <footer id="footer" style={{ borderTop: '1px solid var(--panel-border)', background: 'var(--card)', padding: '44px 0' }}>
      <div
        style={{
          ...CONTAINER_STYLE,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              B
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.2px' }}>BIZRISK</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
            Verify the business. Validate the evidence. Make the safer decision.
          </p>
        </div>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {LINKS.map((link) => (
            <a key={link.label} href={link.href} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground-muted)', textDecoration: 'none' }}>
              {link.label}
            </a>
          ))}
        </nav>

        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground-subtle)', whiteSpace: 'nowrap' }}>
          Built for Razorpay Buildathon &mdash; AI RISK MANAGER
        </span>
      </div>
    </footer>
  );
}
