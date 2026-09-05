import React from 'react';
import { Building2, Landmark, Network, Globe } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const SOURCE_GROUPS = [
  { label: 'Official', icon: Building2, items: ['Company Website'] },
  { label: 'Government', icon: Landmark, items: ['EPFO', 'Government Sources'] },
  { label: 'Third-Party', icon: Network, items: ['Falcon Ebiz', 'Zauba', 'Tofler', 'QuickCompany', 'InstaFinancials'] },
  { label: 'General Web', icon: Globe, items: ['Broader Web Search'] },
];

const STATUSES = [
  { label: 'Successful', color: 'var(--success)', bg: 'rgba(31, 138, 83, 0.1)' },
  { label: 'Blocked', color: 'var(--danger-high)', bg: 'rgba(193, 101, 43, 0.1)' },
  { label: 'Failed', color: 'var(--danger-critical)', bg: 'rgba(177, 52, 52, 0.1)' },
  { label: 'Attempted / Unverified', color: 'var(--warning)', bg: 'rgba(184, 134, 46, 0.1)' },
];

export default function BrowserResearch() {
  return (
    <section id="research" style={SECTION_STYLE}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading
            eyebrow="Browser Research"
            title="Research Across the Web. Automatically."
            subtitle="BizRisk dynamically investigates multiple sources instead of depending on a single database. These are dynamically researched sources, not a static hardcoded database."
          />
        </ScrollReveal>

        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '20px',
          }}
        >
          {SOURCE_GROUPS.map((group, idx) => {
            const Icon = group.icon;
            return (
              <ScrollReveal key={group.label} delay={idx * 80}>
                <div
                  className="landing-card-hover"
                  style={{ ...cardBaseStyle, padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--primary-tint)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={18} color="var(--primary)" strokeWidth={1.75} />
                  </div>
                  <span className="eyebrow">{group.label}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {group.items.map((item) => (
                      <span key={item} style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--foreground)' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={120}>
          <div
            style={{
              marginTop: '28px',
              padding: '20px 24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--panel-border)',
              background: 'var(--surface)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px 28px',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--foreground-muted)' }}>Source status</span>
            {STATUSES.map((s) => (
              <span
                key={s.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: s.color,
                  background: s.bg,
                  padding: '5px 12px',
                  borderRadius: '999px',
                }}
              >
                {s.label.toUpperCase()}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
