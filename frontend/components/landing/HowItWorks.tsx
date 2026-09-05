import React from 'react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, StepBadge, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const STEPS = [
  { n: '01', title: 'Investigate', desc: 'BizRisk dynamically plans the merchant research.' },
  { n: '02', title: 'Research', desc: 'Browser agents investigate official, government and independent sources.' },
  { n: '03', title: 'Validate', desc: 'Evidence is checked for relevance, quality and merchant identity.' },
  { n: '04', title: 'Assess', desc: 'A deterministic risk engine calculates the investigation risk.' },
  { n: '05', title: 'Decide', desc: 'The system produces an actionable recommendation while keeping humans in control.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ ...SECTION_STYLE, background: 'var(--bg-subtle)' }}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading eyebrow="How It Works" title="How BizRisk Works" />
        </ScrollReveal>

        <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {STEPS.map((step, idx) => (
            <ScrollReveal key={step.n} delay={idx * 60}>
              <div
                className="landing-card-hover"
                style={{
                  ...cardBaseStyle,
                  padding: '22px 26px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                <StepBadge n={step.n} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '15.5px', fontWeight: 800 }}>{step.title}</span>
                  <span style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--foreground-muted)' }}>{step.desc}</span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
