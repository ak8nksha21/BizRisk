import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const norm = (status || 'UNKNOWN').toUpperCase();

  const getStyle = (): React.CSSProperties => {
    switch (norm) {
      case 'COMPLETED':
        return { background: 'rgba(31, 138, 83, 0.1)', border: '1px solid rgba(31, 138, 83, 0.25)', color: 'var(--risk-low)' };
      case 'FAILED':
        return { background: 'rgba(177, 52, 52, 0.1)', border: '1px solid rgba(177, 52, 52, 0.25)', color: 'var(--risk-very-high)' };
      case 'WAITING_FOR_USER':
        return {
          background: 'rgba(184, 134, 46, 0.12)',
          border: '1px solid rgba(184, 134, 46, 0.3)',
          color: 'var(--secondary)',
          animation: 'pulse 1.5s infinite ease-in-out'
        };
      case 'CREATED':
      case 'PENDING':
        return { background: 'var(--surface-hover)', border: '1px solid var(--panel-border-strong)', color: 'var(--foreground-muted)' };
      default:
        // Running / Research / Discovery / Planning states
        return {
          background: 'var(--primary-tint)',
          border: '1px solid rgba(107, 63, 160, 0.25)',
          color: 'var(--primary)',
        };
    }
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12.5px',
      fontWeight: '700',
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
      ...getStyle()
    }}>
      {norm.replace(/_/g, ' ')}
    </span>
  );
}
