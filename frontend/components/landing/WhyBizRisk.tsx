import React from 'react';
import { Network, ScanSearch, ShieldAlert } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, StepBadge, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const CARDS = [
  {
    n: '01',
    icon: Network,
    title: 'Too Many Sources',
    desc: 'Business information is spread across websites, government portals and independent registries.',
  },
  {
    n: '02',
    icon: ScanSearch,
    title: 'Too Much Noise',
    desc: 'Search results can contain irrelevant pages, blocked sources and wrong-company information.',
  },
  {
    n: '03',
    icon: ShieldAlert,
    title: 'High Cost of Being Wrong',
    desc: 'Incorrect merchant verification can turn bad information into financial risk.',
  },
];

export default function WhyBizRisk() {
  return (
    <section id="why" style={{ ...SECTION_STYLE, background: 'var(--bg-subtle)' }}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading
            title={
              <>
                Business Information Is Fragmented.
                <br />
                Risk Decisions Can&apos;t Be.
              </>
            }
            subtitle="Merchant verification often requires checking company websites, government sources and independent registries. Information can be incomplete, inconsistent, blocked or even associated with another business."
          />
        </ScrollReveal>

        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <ScrollReveal key={card.n} delay={idx * 90}>
                <div
                  className="landing-card-hover"
                  style={{
                    ...cardBaseStyle,
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    height: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StepBadge n={card.n} />
                    <Icon size={22} color="var(--primary)" strokeWidth={1.75} />
                  </div>
                  <span style={{ fontSize: '17px', fontWeight: 800 }}>{card.title}</span>
                  <span style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--foreground-muted)' }}>{card.desc}</span>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
