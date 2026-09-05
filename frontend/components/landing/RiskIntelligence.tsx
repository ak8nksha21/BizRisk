import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading } from './shared';
import ScrollReveal from './ScrollReveal';

const SIGNALS = [
  'Identity Conflict',
  'Government Evidence Missing',
  'Source Unavailable',
  'Inconsistent Business Information',
];

export default function RiskIntelligence() {
  return (
    <section id="risk-intelligence" className="landing-dark-section" style={SECTION_STYLE}>
      <div style={{ ...CONTAINER_STYLE, position: 'relative' }}>
        <ScrollReveal>
          <SectionHeading
            eyebrow="Risk Intelligence"
            title="Every Risk Score Has a Reason."
            tone="dark"
          />
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div
            className="landing-dark-card"
            style={{
              marginTop: '48px',
              maxWidth: '640px',
              margin: '48px auto 0',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(243,240,248,0.55)' }}>
                  Risk Score
                </span>
                <span style={{ fontSize: '34px', fontWeight: 800, color: 'var(--risk-high)' }}>72 <span style={{ fontSize: '16px', color: 'rgba(243,240,248,0.5)' }}>/ 100</span></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(243,240,248,0.55)' }}>
                  Risk Level
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--risk-high)' }}>HIGH</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(243,240,248,0.55)' }}>
                  Recommendation
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#f3f0f8' }}>MANUAL REVIEW</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(243,240,248,0.55)' }}>
                Risk Signals
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SIGNALS.map((s) => (
                  <span
                    key={s}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid rgba(193, 101, 43, 0.35)',
                      background: 'rgba(193, 101, 43, 0.12)',
                      color: '#f0b98a',
                    }}
                  >
                    <ShieldAlert size={12} />
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '16px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(243,240,248,0.5)' }}>
                Explanation
              </span>
              <p style={{ marginTop: '8px', fontSize: '14px', lineHeight: 1.65, color: 'rgba(243,240,248,0.85)' }}>
                Strong identity conflict was detected across merchant information. Independent evidence
                does not sufficiently confirm the submitted business identity.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
