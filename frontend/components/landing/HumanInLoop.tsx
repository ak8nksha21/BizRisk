import React from 'react';
import { ScanSearch, FileText, ShieldCheck, Cpu, UserCheck, BadgeCheck } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const STEPS = [
  { icon: ScanSearch, label: 'AI Research' },
  { icon: FileText, label: 'Evidence' },
  { icon: ShieldCheck, label: 'Validation' },
  { icon: Cpu, label: 'Risk' },
  { icon: UserCheck, label: 'Human Review' },
  { icon: BadgeCheck, label: 'Decision' },
];

export default function HumanInLoop() {
  return (
    <section id="human-in-loop" style={SECTION_STYLE}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading
            title={
              <>
                AI Investigates.
                <br />
                Humans Decide.
              </>
            }
            subtitle="BizRisk automates research, evidence validation and risk analysis while keeping the final decision transparent and reviewable by humans."
          />
        </ScrollReveal>

        <div className="landing-flow-row" style={{ marginTop: '48px' }}>
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isHuman = step.label === 'Human Review';
            return (
              <React.Fragment key={step.label}>
                <ScrollReveal delay={idx * 60} style={{ flex: '1 1 0', minWidth: 0 }}>
                  <div
                    className="landing-card-hover"
                    style={{
                      ...cardBaseStyle,
                      padding: '20px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'center',
                      border: isHuman ? '1px solid var(--primary-tint)' : cardBaseStyle.border,
                      background: isHuman ? 'var(--primary-tint)' : cardBaseStyle.background,
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: isHuman ? '#fff' : 'var(--primary-tint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={19} color="var(--primary)" strokeWidth={1.75} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{step.label}</span>
                  </div>
                </ScrollReveal>
                {idx < STEPS.length - 1 && (
                  <>
                    <div className="landing-connector landing-flow-connector-h" aria-hidden="true" />
                    <div className="landing-connector-vertical landing-flow-connector-v" aria-hidden="true" />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
