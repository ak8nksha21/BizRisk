'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, APIError } from '../../lib/api';
import { InvestigationListItem } from '../../types';
import StatusBadge from '../../components/StatusBadge';

interface RiskInfo {
  risk_level: string | null;
  risk_score: number | null;
}

export default function Dashboard() {
  const [history, setHistory] = useState<InvestigationListItem[]>([]);
  const [incomplete, setIncomplete] = useState<InvestigationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Tracks whether we've ever successfully loaded the lists, so a failed
  // request can be told apart from a confirmed "zero investigations" state.
  const [hasLoaded, setHasLoaded] = useState(false);

  // Supplementary, best-effort enrichment (real risk data per completed
  // investigation, for the KPI/Risk Overview cards). Never gates the main
  // loading/error state above -- a slow or failed enrichment call must not
  // block or freeze the dashboard itself.
  const [riskById, setRiskById] = useState<Record<string, RiskInfo>>({});
  const [riskLoading, setRiskLoading] = useState(false);

  const fetchInvestigations = async () => {
    try {
      setLoading(true);
      setError('');
      const [histData, incData] = await Promise.all([
        api.getInvestigations(),
        api.getIncompleteInvestigations(),
      ]);

      // Sort by created timestamp descending
      const sortFn = (a: InvestigationListItem, b: InvestigationListItem) => {
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bd - ad;
      };

      setHistory(histData.sort(sortFn));
      setIncomplete(incData.sort(sortFn));
      setHasLoaded(true);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to load investigations. Please check connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  // Merge history + incomplete into one deduplicated, recency-sorted list --
  // "Recent Investigations" shows every real case exactly once.
  const merged: InvestigationListItem[] = React.useMemo(() => {
    const byId = new Map<string, InvestigationListItem>();
    [...history, ...incomplete].forEach(inv => {
      if (!byId.has(inv.id)) byId.set(inv.id, inv);
    });
    return Array.from(byId.values()).sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    });
  }, [history, incomplete]);

  // Best-effort risk enrichment: fetch real risk_score/risk_level for
  // completed cases (the list endpoints don't return risk fields). Uses only
  // the existing per-investigation endpoint, no new API surface. A failure
  // on any single case just leaves that case out of the risk KPIs -- it
  // never blocks the dashboard or re-triggers the loading/error state above.
  useEffect(() => {
    if (!hasLoaded) return;
    const completedIds = merged
      .filter(inv => inv.status.toUpperCase() === 'COMPLETED')
      .map(inv => inv.id)
      .filter(id => !(id in riskById));

    if (completedIds.length === 0) return;

    let cancelled = false;
    setRiskLoading(true);
    Promise.allSettled(completedIds.map(id => api.getInvestigation(id))).then(results => {
      if (cancelled) return;
      setRiskById(prev => {
        const next = { ...prev };
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            next[completedIds[idx]] = { risk_level: res.value.risk_level, risk_score: res.value.risk_score };
          }
        });
        return next;
      });
      setRiskLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, history, incomplete]);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  // Presentation-only: turns an internal SNAKE_CASE stage name (e.g.
  // "BROWSER_RESEARCH") into user-facing wording, preserving short acronyms.
  const humanizeStage = (value: string | null) => {
    if (!value) return 'Intake';
    return value
      .split('_')
      .filter(Boolean)
      .map(word => (word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join(' ');
  };

  // Presentation-only: shortens a raw case UUID for scannable list display.
  // The full id is still available via the title tooltip, the href, and in
  // full on the case detail page itself -- nothing is hidden, just condensed.
  const shortId = (id: string) => `${id.slice(0, 8)}…`;

  const riskColor = (level: string | null) => {
    switch ((level || '').toUpperCase()) {
      case 'LOW': return 'var(--risk-low)';
      case 'MODERATE': return 'var(--risk-moderate)';
      case 'HIGH': return 'var(--risk-high)';
      case 'VERY_HIGH': return 'var(--risk-very-high)';
      default: return 'var(--risk-unknown)';
    }
  };

  // KPIs -- computed only from real, already-fetched data. High Risk /
  // Average Score reflect only the completed cases whose risk has been
  // enriched so far (never fabricated for cases we haven't loaded yet).
  const completedCases = merged.filter(inv => inv.status.toUpperCase() === 'COMPLETED');
  const underReviewCount = incomplete.filter(inv => inv.status.toUpperCase() === 'WAITING_FOR_USER').length;
  const enrichedRisks = completedCases
    .map(inv => riskById[inv.id])
    .filter((r): r is RiskInfo => !!r);
  const highRiskCount = enrichedRisks.filter(r => ['HIGH', 'VERY_HIGH'].includes((r.risk_level || '').toUpperCase())).length;
  const scoredRisks = enrichedRisks.filter(r => r.risk_score !== null && r.risk_score !== undefined);
  const avgRiskScore = scoredRisks.length > 0
    ? Math.round(scoredRisks.reduce((sum, r) => sum + (r.risk_score as number), 0) / scoredRisks.length)
    : null;
  const riskDataPending = riskLoading && enrichedRisks.length < completedCases.length;

  const riskLevelCounts = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'].map(level => ({
    level,
    count: enrichedRisks.filter(r => (r.risk_level || '').toUpperCase() === level).length,
  }));

  const kpis = [
    { label: 'Total Investigations', value: merged.length, accent: 'var(--primary)' },
    { label: 'Completed', value: completedCases.length, accent: 'var(--risk-low)' },
    { label: 'Under Review', value: underReviewCount, accent: 'var(--secondary)' },
    { label: 'High Risk', value: riskDataPending && enrichedRisks.length === 0 ? '—' : highRiskCount, accent: 'var(--risk-high)' },
    { label: 'Average Risk Score', value: avgRiskScore === null ? '—' : avgRiskScore, accent: 'var(--risk-moderate)' },
  ];

  return (
    <div style={pageStyle}>
      {/* Top header */}
      <header style={topHeaderStyle}>
        <div>
          <span className="eyebrow">Merchant Verification</span>
          <h1 style={pageTitleStyle}>Dashboard</h1>
        </div>
        <div style={topHeaderActionsStyle}>
          <button onClick={fetchInvestigations} disabled={loading} className="btn-ghost" style={refreshButtonStyle}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link href="/investigate">
            <button style={ctaButtonStyle}>+ Start New Investigation</button>
          </Link>
        </div>
      </header>

      <div style={contentStyle}>
        {error && <div style={errorStyle}>{error}</div>}

        {loading ? (
          <div style={loadingContainerStyle}>
            <div className="spinner" />
            <p>Loading workspace…</p>
          </div>
        ) : error && !hasLoaded ? (
          // The lists have never successfully loaded -- don't render the
          // "0 investigations" empty state, since that would misreport a
          // failed request as a confirmed-empty dashboard. The error banner
          // above already explains what happened; "Refresh" retries.
          null
        ) : (
          <>
            {/* KPI row */}
            <div style={kpiRowStyle}>
              {kpis.map(kpi => (
                <div key={kpi.label} className="glass-panel" style={kpiCardStyle}>
                  <span style={kpiLabelStyle}>{kpi.label}</span>
                  <span style={{ ...kpiValueStyle, color: kpi.accent }}>{kpi.value}</span>
                </div>
              ))}
            </div>

            <div style={mainGridStyle}>
              {/* Recent Investigations */}
              <div className="glass-panel" style={tableCardStyle}>
                <div style={cardHeaderRowStyle}>
                  <h3 style={cardHeaderStyle}>Recent Investigations</h3>
                  <span className="id-chip">{merged.length}</span>
                </div>

                {merged.length === 0 ? (
                  <div style={emptyStateStyle}>
                    <span style={emptyIconStyle}>◧</span>
                    <p style={emptyTitleStyle}>No investigations yet</p>
                    <p style={emptySubtitleStyle}>Start a new merchant verification to see it here.</p>
                  </div>
                ) : (
                  <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Case</th>
                          <th style={thStyle}>Stage</th>
                          <th style={thStyle}>Created</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {merged.map((inv) => (
                          <tr key={inv.id} className="row-hover" style={trStyle}>
                            <td style={tdStyle}>
                              <Link href={`/investigations/${inv.id}`} className="id-chip" style={linkChipStyle} title={inv.id}>
                                {shortId(inv.id)}
                              </Link>
                            </td>
                            <td style={tdStyle}>{humanizeStage(inv.current_node)}</td>
                            <td style={tdStyle}>{formatDate(inv.created_at)}</td>
                            <td style={tdStyle}><StatusBadge status={inv.status} /></td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <Link href={`/investigations/${inv.id}`}>
                                <button className="btn-ghost" style={viewButtonStyle}>Open →</button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right column: Risk Overview + Source Coverage */}
              <div style={rightColStyle}>
                <div className="glass-panel" style={widgetCardStyle}>
                  <h3 style={cardHeaderStyle}>Risk Overview</h3>
                  {enrichedRisks.length === 0 ? (
                    <p style={widgetEmptyStyle}>
                      {riskDataPending ? 'Loading risk data…' : 'No completed investigations yet.'}
                    </p>
                  ) : (
                    <div style={riskOverviewListStyle}>
                      {riskLevelCounts.map(({ level, count }) => (
                        <div key={level} style={riskOverviewRowStyle}>
                          <span style={riskOverviewLabelStyle}>{level.replace('_', ' ')}</span>
                          <div style={riskOverviewBarBgStyle}>
                            <div style={{
                              ...riskOverviewBarFillStyle,
                              width: `${enrichedRisks.length > 0 ? (count / enrichedRisks.length) * 100 : 0}%`,
                              background: riskColor(level),
                            }} />
                          </div>
                          <span style={riskOverviewCountStyle}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={widgetCardStyle}>
                  <h3 style={cardHeaderStyle}>Source Coverage</h3>
                  <p style={widgetEmptyStyle}>Every investigation cross-checks these source categories:</p>
                  <div style={sourceCoverageListStyle}>
                    <div style={sourceCoverageRowStyle}><span style={sourceCoverageDotStyle} />Government / Official Registries</div>
                    <div style={sourceCoverageRowStyle}><span style={sourceCoverageDotStyle} />Official Website</div>
                    <div style={sourceCoverageRowStyle}><span style={sourceCoverageDotStyle} />Third-Party Directories</div>
                    <div style={sourceCoverageRowStyle}><span style={sourceCoverageDotStyle} />General Web</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Styles
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
};

const topHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px',
  padding: '24px 36px',
  borderBottom: '1px solid var(--panel-border)',
  background: 'var(--card)',
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '800',
  letterSpacing: '-0.4px',
  marginTop: '2px',
};

const topHeaderActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const refreshButtonStyle: React.CSSProperties = {
  padding: '11px 18px',
  fontSize: '13.5px',
};

const ctaButtonStyle: React.CSSProperties = {
  padding: '11px 22px',
  fontSize: '14px',
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '28px 36px',
  maxWidth: '1320px',
  width: '100%',
  margin: '0 auto',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(177, 52, 52, 0.08)',
  border: '1px solid rgba(177, 52, 52, 0.2)',
  color: 'var(--risk-very-high)',
  padding: '16px 20px',
  borderRadius: 'var(--radius-md)',
  fontSize: '14px',
};

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '90px',
  gap: '16px',
  color: 'var(--foreground-muted)',
};

const kpiRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '16px',
};

const kpiCardStyle: React.CSSProperties = {
  padding: '20px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: '600',
  color: 'var(--foreground-muted)',
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '30px',
  fontWeight: '800',
  letterSpacing: '-0.5px',
};

const mainGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
  gap: '24px',
  alignItems: 'start',
};

const tableCardStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

const rightColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const widgetCardStyle: React.CSSProperties = {
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const cardHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid var(--panel-border)',
  paddingBottom: '14px',
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: '15.5px',
  fontWeight: '700',
};

const widgetEmptyStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--foreground-muted)',
};

const riskOverviewListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const riskOverviewRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '90px 1fr 24px',
  alignItems: 'center',
  gap: '10px',
};

const riskOverviewLabelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: '700',
  color: 'var(--foreground-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

const riskOverviewBarBgStyle: React.CSSProperties = {
  height: '8px',
  borderRadius: '4px',
  background: 'var(--surface-hover)',
  overflow: 'hidden',
};

const riskOverviewBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '4px',
  transition: 'width 0.4s ease',
};

const riskOverviewCountStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  textAlign: 'right',
};

const sourceCoverageListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const sourceCoverageRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px',
  color: 'var(--foreground)',
  fontWeight: '600',
};

const sourceCoverageDotStyle: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: 'var(--primary)',
  flexShrink: 0,
};

const emptyStateStyle: React.CSSProperties = {
  padding: '48px 20px',
  textAlign: 'center',
  color: 'var(--foreground-muted)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: '22px',
  marginBottom: '4px',
  opacity: 0.6,
  color: 'var(--primary)',
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '14.5px',
  fontWeight: '600',
  color: 'var(--foreground)',
};

const emptySubtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--foreground-muted)',
};

const tableContainerStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const thStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: '700',
  color: 'var(--foreground-subtle)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '10px 16px',
  borderBottom: '1px solid var(--panel-border)',
};

const trStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--panel-border)',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
};

const linkChipStyle: React.CSSProperties = {
  textDecoration: 'none',
};

const viewButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12.5px',
  borderRadius: '999px',
};
