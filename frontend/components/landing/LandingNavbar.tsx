'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { CONTAINER_STYLE } from './shared';

const NAV_LINKS = [
  { label: 'Product', href: '#capabilities' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Risk Intelligence', href: '#risk-intelligence' },
  { label: 'Evaluation', href: '#evaluation' },
  { label: 'Demo', href: '#demo' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detect "has the page scrolled past the top" via IntersectionObserver on a
  // sentinel, rather than window.scrollY -- the app's shared layout can make
  // an ancestor (not the window) the actual scrolling element, which a
  // scrollY-based listener would never see move.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} style={{ height: '1px', width: '100%' }} aria-hidden="true" />
      <header className={`landing-navbar ${scrolled ? 'landing-navbar-scrolled' : ''}`}>
      <div
        style={{
          ...CONTAINER_STYLE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: scrolled ? '12px 24px' : '18px 24px',
          transition: 'padding 0.2s ease',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              flexShrink: 0,
            }}
          >
            B
          </span>
          <span style={{ fontSize: '16.5px', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--foreground)' }}>
            BIZRISK
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '30px' }} className="landing-nav-desktop">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--foreground-muted)',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/investigate" className="landing-nav-cta" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '10px 20px', fontSize: '13.5px' }}>Start Investigation</button>
          </Link>
          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className="landing-nav-hamburger"
            style={{
              display: 'none',
              background: 'transparent',
              color: 'var(--foreground)',
              boxShadow: 'none',
              padding: '8px',
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="landing-mobile-menu"
          style={{
            borderTop: '1px solid var(--panel-border)',
            background: 'var(--card)',
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 4px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--foreground)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--panel-border)',
              }}
            >
              {link.label}
            </a>
          ))}
          <Link href="/investigate" style={{ textDecoration: 'none', marginTop: '12px' }}>
            <button style={{ width: '100%' }}>Start Investigation</button>
          </Link>
        </div>
      )}
      </header>
    </>
  );
}
