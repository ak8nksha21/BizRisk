import React from 'react';
import { Layers, GitCompare, ShieldCheck, ShieldAlert } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, StepBadge, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const CARDS = [
  { n: '01', icon: Layers, title: 'Source Validation', desc: 'Track official, government and independent sources separately.' },
  { n: '02', icon: GitCompare, title: 'Entity Resolution', desc: 'Compare strong identifiers such as GSTIN and CIN with supporting business attributes.' },
  { n: '03', icon: ShieldCheck, title: 'Evidence Validation', desc: 'Reject irrelevant, contaminated or non-factual web content.' },
  { n: '04', icon: ShieldAlert, title: 'Conflict Detection', desc: 'Surface identity conflicts instead of silently approving them.' },
];

export default function EvidenceValidation() {
  return (
    <section id="evidence" style={{ ...SECTION_STYLE, background: 'var(--bg-subtle)' }}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading
            title="Finding Information Isn't Enough."
            subtitle="BizRisk validates whether the information actually belongs to the merchant before it influences the investigation."
          />
        </ScrollReveal>

        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          {CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <ScrollReveal key={card.n} delay={idx * 80}>
                <div
                  className="landing-card-hover"
                  style={{ ...cardBaseStyle, padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StepBadge n={card.n} />
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--secondary-tint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={17} color="var(--secondary)" strokeWidth={1.75} />
                    </div>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>{card.title}</span>
                  <span style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--foreground-muted)' }}>{card.desc}</span>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
