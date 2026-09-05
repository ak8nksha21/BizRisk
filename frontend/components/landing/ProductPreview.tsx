import React from 'react';
import { Check } from 'lucide-react';

const FIELDS = [
  { label: 'Legal Name', value: 'TCS Limited' },
  { label: 'GSTIN', value: '27AAACT2727Q1Z•' },
  { label: 'CIN', value: 'L72200MH1995PLC0842••' },
  { label: 'Website', value: 'tcs.com' },
  { label: 'Location', value: 'Mumbai, Maharashtra' },
];

const VERIFICATION = ['Legal Name', 'Company Status', 'Registered Address', 'Website', 'Identity Match'];

const SOURCES = ['Official Website', 'Government', 'Third-Party Registry', 'General Web'];

export default function ProductPreview() {
  return (
    <div
      id="demo"
      className="glass-panel"
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '11px',
            }}
          >
            B
          </span>
          <span style={{ fontSize: '12.5px', fontWeight: 800, letterSpacing: '0.02em' }}>BIZRISK</span>
        </div>
        <span className="eyebrow" style={{ fontSize: '10px' }}>Merchant Investigation</span>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--panel-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {FIELDS.map((f) => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--foreground-muted)', fontWeight: 600 }}>{f.label}</span>
            <span
              style={{
                fontSize: '12px',
                fontFamily: f.label === 'Website' || f.label === 'Legal Name' ? 'inherit' : 'ui-monospace, SFMono-Regular, Consolas, monospace',
                fontWeight: 700,
                color: 'var(--foreground)',
                textAlign: 'right',
              }}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(31, 138, 83, 0.22)',
          background: 'rgba(31, 138, 83, 0.06)',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            border: '3px solid var(--risk-low)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: '#fff',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--risk-low)' }}>0</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--foreground-subtle)' }}>
            Risk &middot; LOW &middot; Score 0/100
          </span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--risk-low)' }}>Decision: APPROVE</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span className="eyebrow" style={{ fontSize: '10px' }}>Verification</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {VERIFICATION.map((v) => (
            <span key={v} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: 'var(--foreground)' }}>
              <Check size={12} color="var(--risk-low)" strokeWidth={3} />
              {v}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span className="eyebrow" style={{ fontSize: '10px' }}>Sources</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SOURCES.map((s) => (
            <span key={s} className="id-chip" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
