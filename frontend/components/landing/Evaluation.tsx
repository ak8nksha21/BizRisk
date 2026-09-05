import React from 'react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const STATS = [
  { value: '16', label: 'Synthetic Cases' },
  { value: '8', label: 'Legitimate' },
  { value: '8', label: 'Suspicious' },
  { value: '100%', label: 'Precision', color: 'var(--risk-low)' },
  { value: '62.5%', label: 'Recall', color: 'var(--secondary)' },
  { value: '0', label: 'False Positives', color: 'var(--risk-low)' },
  { value: '3', label: 'False Negatives', color: 'var(--risk-high)' },
];

export default function Evaluation() {
  return (
    <section id="evaluation" style={SECTION_STYLE}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading eyebrow="Evaluation" title="Built to Be Measured Honestly." />
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div
            style={{
              ...cardBaseStyle,
              marginTop: '44px',
              padding: '36px 28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '28px',
            }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' }}>
                <span style={{ fontSize: 'clamp(26px, 3vw, 34px)', fontWeight: 800, color: stat.color || 'var(--foreground)' }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground-muted)' }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <p
            style={{
              marginTop: '20px',
              textAlign: 'center',
              fontSize: '13px',
              fontStyle: 'italic',
              color: 'var(--foreground-subtle)',
            }}
          >
            Reproducible synthetic evaluation baseline. Not production accuracy.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
