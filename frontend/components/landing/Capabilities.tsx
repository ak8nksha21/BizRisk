import React from 'react';
import { Globe, GitCompare, ShieldCheck, Cpu, FileText, ClipboardCheck } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const FEATURES = [
  { icon: Globe, title: 'Browser-Based Research', desc: 'Investigate official, government and independent business sources.' },
  { icon: GitCompare, title: 'Entity Resolution', desc: 'Determine whether discovered information belongs to the correct merchant.' },
  { icon: ShieldCheck, title: 'Evidence Validation', desc: 'Reject noisy, irrelevant and contaminated evidence.' },
  { icon: Cpu, title: 'Deterministic Risk Engine', desc: 'Produce consistent and explainable risk scores.' },
  { icon: FileText, title: 'Investigation Reports', desc: 'Turn research into structured risk intelligence.' },
  { icon: ClipboardCheck, title: 'QA & Evidence Checks', desc: 'Ensure incomplete or conflicting evidence does not silently become approval.' },
];

export default function Capabilities() {
  return (
    <section id="capabilities" style={{ ...SECTION_STYLE, background: 'var(--bg-subtle)' }}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading eyebrow="Product" title="Real Product Capabilities" />
        </ScrollReveal>

        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            return (
              <ScrollReveal key={f.title} delay={idx * 60}>
                <div
                  className="landing-card-hover"
                  style={{ ...cardBaseStyle, padding: '26px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--primary-tint)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={19} color="var(--primary)" strokeWidth={1.75} />
                  </div>
                  <span style={{ fontSize: '15.5px', fontWeight: 800 }}>{f.title}</span>
                  <span style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--foreground-muted)' }}>{f.desc}</span>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
