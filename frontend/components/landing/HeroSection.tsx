import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CONTAINER_STYLE, EyebrowBadge } from './shared';
import ProductPreview from './ProductPreview';

export default function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        padding: '76px 0 96px',
        background:
          'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(107, 63, 160, 0.14), transparent 65%)',
      }}
    >
      <div
        className="landing-grid-bg"
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      <div
        className="landing-float"
        style={{
          position: 'absolute',
          top: '18%',
          left: '6%',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--secondary)',
          opacity: 0.4,
        }}
        aria-hidden="true"
      />
      <div
        className="landing-float landing-float-delay"
        style={{
          position: 'absolute',
          top: '38%',
          right: '9%',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'var(--primary)',
          opacity: 0.28,
        }}
        aria-hidden="true"
      />

      <div style={{ ...CONTAINER_STYLE, position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 460px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <EyebrowBadge>AI Merchant Risk Intelligence</EyebrowBadge>

          <h1
            style={{
              fontSize: 'clamp(34px, 5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: 'var(--foreground)',
            }}
          >
            Verify the <span className="landing-gradient-text">Business.</span>
            <br />
            Before You Trust the <span className="landing-gradient-text">Merchant.</span>
          </h1>

          <p style={{ fontSize: '17px', lineHeight: 1.65, color: 'var(--foreground-muted)', maxWidth: '520px' }}>
            AI-powered merchant verification that researches the web, validates evidence, resolves
            identity conflicts, and turns uncertain business information into safer decisions.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '4px' }}>
            <Link href="/investigate" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '14px 26px', fontSize: '15px', gap: '8px' }}>
                Start an Investigation
                <ArrowRight size={16} />
              </button>
            </Link>
            <a href="#how-it-works" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{ padding: '14px 26px', fontSize: '15px' }}>
                Explore How It Works
              </button>
            </a>
          </div>

          <p
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--foreground-subtle)',
              letterSpacing: '0.02em',
              marginTop: '2px',
            }}
          >
            Browser Research &nbsp;•&nbsp; Evidence Validation &nbsp;•&nbsp; Entity Resolution &nbsp;•&nbsp; Risk Intelligence
          </p>
        </div>

        <div style={{ flex: '1 1 380px', minWidth: '300px', display: 'flex', justifyContent: 'center' }}>
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
