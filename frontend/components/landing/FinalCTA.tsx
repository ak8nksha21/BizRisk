import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CONTAINER_STYLE } from './shared';
import ScrollReveal from './ScrollReveal';

export default function FinalCTA() {
  return (
    <section
      id="final-cta"
      style={{
        position: 'relative',
        padding: '110px 0',
        background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(107, 63, 160, 0.16), transparent 70%)',
        overflow: 'hidden',
      }}
    >
      <div style={{ ...CONTAINER_STYLE, position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '26px' }}>
        <ScrollReveal>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.2vw, 44px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              maxWidth: '640px',
            }}
          >
            Verify the Business.
            <br />
            Validate the Evidence.
            <br />
            Make the <span className="landing-gradient-text">Safer Decision.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <p style={{ fontSize: '16px', color: 'var(--foreground-muted)', maxWidth: '520px', lineHeight: 1.6 }}>
            BizRisk turns fragmented business information into explainable merchant risk intelligence.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginTop: '4px' }}>
            <Link href="/investigate" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '15px 28px', fontSize: '15px', gap: '8px' }}>
                Start an Investigation
                <ArrowRight size={16} />
              </button>
            </Link>
            <a href="#demo" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{ padding: '15px 28px', fontSize: '15px' }}>
                View Product Demo
              </button>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
