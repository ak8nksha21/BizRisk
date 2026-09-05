import React from 'react';
import { ArrowRight, BadgeCheck, ShieldAlert } from 'lucide-react';
import { SECTION_STYLE, CONTAINER_STYLE, SectionHeading, cardBaseStyle } from './shared';
import ScrollReveal from './ScrollReveal';

const INPUT_FIELDS = [
  { label: 'Legal Name', value: 'TCS Limited' },
  { label: 'CIN', value: 'L72200MH1995PLC0842••' },
  { label: 'GSTIN', value: '27AAACT2727Q1Z•' },
  { label: 'Website', value: 'tcs.com' },
  { label: 'Location', value: 'Mumbai, Maharashtra' },
];

const DISCOVERED_FIELDS = [
  { label: 'Legal Name', value: 'Tata Consultancy Services Limited' },
  { label: 'CIN', value: 'L72200MH1995PLC0842••' },
  { label: 'GSTIN', value: '27AAACT2727Q1Z•' },
  { label: 'Website', value: 'tcs.com' },
  { label: 'Location', value: 'Mumbai, Maharashtra' },
];

function EntityCard({ eyebrow, fields }: { eyebrow: string; fields: { label: string; value: string }[] }) {
  return (
    <div style={{ ...cardBaseStyle, padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px', flex: '1 1 260px', minWidth: '260px' }}>
      <span className="eyebrow">{eyebrow}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {fields.map((f) => (
          <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--foreground-muted)', fontWeight: 600 }}>{f.label}</span>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                textAlign: 'right',
                fontFamily: f.label === 'Legal Name' || f.label === 'Website' || f.label === 'Location' ? 'inherit' : 'ui-monospace, SFMono-Regular, Consolas, monospace',
              }}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EntityResolution() {
  return (
    <section id="entity-resolution" style={SECTION_STYLE}>
      <div style={CONTAINER_STYLE}>
        <ScrollReveal>
          <SectionHeading
            title="Is This Really the Same Business?"
            subtitle="BizRisk compares strong identifiers and supporting attributes instead of trusting name similarity alone."
          />
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div style={{ marginTop: '44px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
            <EntityCard eyebrow="Merchant Input" fields={INPUT_FIELDS} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: '0 0 auto', margin: '0 auto' }}>
              <ArrowRight size={20} color="var(--primary)" />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: 'var(--risk-low)',
                  background: 'rgba(31, 138, 83, 0.1)',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}
              >
                <BadgeCheck size={14} />
                STRONG IDENTITY MATCH
              </span>
            </div>

            <EntityCard eyebrow="Discovered Business" fields={DISCOVERED_FIELDS} />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div
            style={{
              marginTop: '24px',
              padding: '18px 22px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(193, 101, 43, 0.25)',
              background: 'rgba(193, 101, 43, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <ShieldAlert size={20} color="var(--danger-high)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--danger-high)' }}>IDENTITY CONFLICT</span>
            <ArrowRight size={16} color="var(--foreground-subtle)" />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--foreground)' }}>MANUAL REVIEW</span>
            <span style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginLeft: 'auto' }}>
              A conflicting strong identifier is never silently approved.
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
