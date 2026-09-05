import React from 'react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, StepBadge, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const STEPS = [
  { n: '01', title: 'Merchant', desc: 'Merchant identity and business information' },
  { n: '02', title: 'Research', desc: 'Browser-based investigation across multiple sources' },
  { n: '03', title: 'Validate', desc: 'Evidence quality and relevance validation' },
  { n: '04', title: 'Resolve', desc: 'Entity resolution using strong business identifiers' },
  { n: '05', title: 'Assess', desc: 'Deterministic risk assessment' },
  { n: '06', title: 'Decide', desc: 'Actionable merchant decision with human oversight' },
];

export default function InvestigationFlow() {
  return (
    <section style={SECTION_STYLE}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading title="From Merchant Input to Safer Decision." />
        </ScrollReveal>

        <div className="landing-flow-row" style={{ marginTop: '52px' }}>
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.n}>
              <ScrollReveal delay={idx * 70} style={{ flex: '1 1 0', minWidth: 0 }}>
                <div
                  className="landing-card-hover"
                  style={{
                    ...cardBaseStyle,
                    padding: '22px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    height: '100%',
                  }}
                >
                  <StepBadge n={step.n} />
                  <span style={{ fontSize: '15.5px', fontWeight: 800, letterSpacing: '-0.01em' }}>{step.title}</span>
                  <span style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--foreground-muted)' }}>{step.desc}</span>
                </div>
              </ScrollReveal>
              {idx < STEPS.length - 1 && (
                <>
                  <div className="landing-connector landing-flow-connector-h" aria-hidden="true" />
                  <div className="landing-connector-vertical landing-flow-connector-v" aria-hidden="true" />
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
