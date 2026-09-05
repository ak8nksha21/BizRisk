import React from 'react';
import { ShieldAlert, ShieldQuestion } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const DECISIONS = [
  { level: 'Low', decision: 'Approve', color: 'var(--risk-low)', bg: 'rgba(31, 138, 83, 0.08)', border: 'rgba(31, 138, 83, 0.25)' },
  { level: 'Moderate', decision: 'Approve with Monitoring', color: 'var(--risk-moderate)', bg: 'rgba(184, 134, 46, 0.08)', border: 'rgba(184, 134, 46, 0.25)' },
  { level: 'High', decision: 'Manual Review', color: 'var(--risk-high)', bg: 'rgba(193, 101, 43, 0.08)', border: 'rgba(193, 101, 43, 0.25)' },
  { level: 'Very High', decision: 'Reject / Escalate', color: 'var(--risk-very-high)', bg: 'rgba(177, 52, 52, 0.08)', border: 'rgba(177, 52, 52, 0.25)' },
];

export default function DecisionEngine() {
  return (
    <section id="decision-engine" style={{ ...SECTION_STYLE, background: 'var(--bg-subtle)' }}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading title="Risk Becomes Actionable." />
        </ScrollReveal>

        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px',
          }}
        >
          {DECISIONS.map((d, idx) => (
            <ScrollReveal key={d.level} delay={idx * 70}>
              <div
                className="landing-card-hover"
                style={{
                  ...cardBaseStyle,
                  border: `1px solid ${d.border}`,
                  background: d.bg,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  height: '100%',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--foreground-muted)' }}>
                  {d.level}
                </span>
                <span style={{ fontSize: '19px', fontWeight: 800, color: d.color }}>{d.decision}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >
          <ScrollReveal delay={280}>
            <div
              style={{
                ...cardBaseStyle,
                border: '1px dashed var(--panel-border-strong)',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                height: '100%',
              }}
            >
              <ShieldQuestion size={26} color="var(--secondary)" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800 }}>Insufficient Evidence</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--secondary)' }}>Manual Review Required</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={340}>
            <div
              style={{
                ...cardBaseStyle,
                border: '1px dashed var(--panel-border-strong)',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                height: '100%',
              }}
            >
              <ShieldAlert size={26} color="var(--risk-very-high)" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800 }}>Conflicting Identity</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--risk-very-high)' }}>Manual Review Required</span>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={380}>
          <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '14.5px', fontWeight: 600, color: 'var(--foreground-muted)' }}>
            Uncertainty should be visible, not silently converted into approval.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
