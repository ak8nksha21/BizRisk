import React from 'react';

export const CONTAINER_STYLE: React.CSSProperties = {
  maxWidth: '1180px',
  margin: '0 auto',
  padding: '0 24px',
  width: '100%',
};

export const SECTION_STYLE: React.CSSProperties = {
  padding: '88px 0',
  position: 'relative',
};

export function EyebrowBadge({
  children,
  tone = 'light',
}: {
  children: React.ReactNode;
  tone?: 'light' | 'dark';
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    border: tone === 'dark' ? '1px solid rgba(255,255,255,0.16)' : '1px solid var(--primary-tint)',
    background: tone === 'dark' ? 'rgba(255,255,255,0.06)' : 'var(--primary-tint)',
    color: tone === 'dark' ? '#e4d9f7' : 'var(--primary)',
    whiteSpace: 'nowrap',
  };
  return (
    <span style={style}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: tone === 'dark' ? '#c9a6f2' : 'var(--primary)',
          flexShrink: 0,
        }}
      />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  tone = 'light',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'center' | 'left';
  tone?: 'light' | 'dark';
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
        maxWidth: '700px',
        margin: align === 'center' ? '0 auto' : undefined,
      }}
    >
      {eyebrow && <EyebrowBadge tone={tone}>{eyebrow}</EyebrowBadge>}
      <h2
        style={{
          fontSize: 'clamp(26px, 3.6vw, 40px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
          color: tone === 'dark' ? '#f6f3fb' : 'var(--foreground)',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: '16px',
            lineHeight: 1.65,
            color: tone === 'dark' ? 'rgba(243,240,248,0.72)' : 'var(--foreground-muted)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export const cardBaseStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: '0 1px 2px rgba(36, 34, 31, 0.04), 0 8px 24px -14px rgba(36, 34, 31, 0.1)',
};

export function StepBadge({ n }: { n: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        background: 'var(--primary-tint)',
        color: 'var(--primary)',
        fontSize: '12.5px',
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}
