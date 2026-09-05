'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, APIError } from '../../../lib/api';
import {
  InvestigationDetail,
  EvidenceItem,
  RiskAnalysis,
  HistoricalReport,
  HumanInterventionStatus
} from '../../../types';
import StatusBadge from '../../../components/StatusBadge';

interface CandidateItem {
  name?: string;
  gstin?: string;
  cin?: string;
  location?: string;
  confidence?: number;
}

interface FindingItem {
  code?: string;
  confidence?: number;
  description?: string;
  evidence_ids?: string[];
}

export default function InvestigationPage() {
  const params = useParams();
  const id = params.id as string;

  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [reports, setReports] = useState<HistoricalReport[]>([]);
  const [selectedReportIdx, setSelectedReportIdx] = useState<number>(0);
  const [hitl, setHitl] = useState<HumanInterventionStatus | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [taskResumeLoading, setTaskResumeLoading] = useState<Record<string, boolean>>({});
  const [screenshotRefresh, setScreenshotRefresh] = useState<Record<string, number>>({});
  const [typeTexts, setTypeTexts] = useState<Record<string, string>>({});
  const [interactionLoading, setInteractionLoading] = useState<Record<string, boolean>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState('');

  // UI-only presentation state: everything below is purely about what's
  // expanded/collapsed by default on this page, not about fetched data.
  const [pipelineCollapsed, setPipelineCollapsed] = useState(true);
  const [showFullReconciliation, setShowFullReconciliation] = useState(false);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [showCandidatesDetail, setShowCandidatesDetail] = useState(false);
  const [showActivityTimeline, setShowActivityTimeline] = useState(false);
  const [showFindingsDetail, setShowFindingsDetail] = useState(false);
  const [showRiskDetail, setShowRiskDetail] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Latest investigation snapshot, readable from the EventSource callbacks
  // without re-subscribing the stream on every state change.
  const detailRef = useRef<InvestigationDetail | null>(null);

  const checkBrowserSession = async (taskId: string) => {
    try {
      const res = await api.getBrowserSession(id, taskId);
      if (res && res.has_session) {
        setActiveSessions(prev => ({ ...prev, [taskId]: true }));
      } else {
        setActiveSessions(prev => ({ ...prev, [taskId]: false }));
      }
    } catch {
      setActiveSessions(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleScreenshotClick = async (taskId: string, e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1000;
    const clickY = ((e.clientY - rect.top) / rect.height) * 700;

    setInteractionLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      await api.sendClick(id, taskId, { x: clickX, y: clickY });
      setScreenshotRefresh(prev => ({ ...prev, [taskId]: Date.now() }));
    } catch (err) {
      console.error("Click failed:", err);
    } finally {
      setInteractionLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleTypeText = async (taskId: string) => {
    const text = typeTexts[taskId] || '';
    if (!text) return;

    setInteractionLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      await api.sendType(id, taskId, { text });
      setTypeTexts(prev => ({ ...prev, [taskId]: '' }));
      setScreenshotRefresh(prev => ({ ...prev, [taskId]: Date.now() }));
    } catch (err) {
      console.error("Typing failed:", err);
    } finally {
      setInteractionLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleRefreshScreenshot = (taskId: string) => {
    setScreenshotRefresh(prev => ({ ...prev, [taskId]: Date.now() }));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (detail?.status === 'WAITING_FOR_USER' && hitl?.pending_tasks) {
      interval = setInterval(() => {
        hitl.pending_tasks.forEach(task => {
          if (activeSessions[task.task_id]) {
            setScreenshotRefresh(prev => ({ ...prev, [task.task_id]: Date.now() }));
          }
        });
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [detail?.status, hitl?.pending_tasks, activeSessions]);

  // 1. Single Fetch function for all investigation data
  const fetchData = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      setError('');

      const detailData = await api.getInvestigation(id);
      setDetail(detailData);
      detailRef.current = detailData;

      // Fetch supplementary components in parallel
      const [evData, reportsData, evs] = await Promise.all([
        api.getEvidence(id).catch(() => [] as EvidenceItem[]),
        api.getReports(id).catch(() => [] as HistoricalReport[]),
        api.getEvents(id).catch(() => [] as any[]),
      ]);

      setEvidence(evData);
      setEvents(evs);

      if (reportsData.length > 0) {
        setReports(reportsData);
        // By default, select the latest version
        setSelectedReportIdx(reportsData.length - 1);
      }

      // Fetch risk and HITL based on current status
      if (detailData.status === 'WAITING_FOR_USER') {
        const hitlData = await api.getHumanIntervention(id).catch(() => null);
        setHitl(hitlData);
        if (hitlData && hitlData.pending_tasks) {
          hitlData.pending_tasks.forEach((task: any) => {
            checkBrowserSession(task.task_id);
          });
        }
      } else {
        setHitl(null);
      }

      if (detailData.status === 'COMPLETED' || detailData.risk_score !== null) {
        const riskData = await api.getRisk(id).catch(() => null);
        setRisk(riskData);
      }

      // Check if polling is required
      const terminalStates = ['COMPLETED', 'FAILED'];
      const shouldPoll = !terminalStates.includes(detailData.status.toUpperCase());
      setPolling(shouldPoll);

    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to refresh investigation details.');
      }
      // A failed fetch must not silently stop retries -- if we don't already
      // know (from a prior successful fetch) that the investigation reached a
      // terminal state, keep/start polling so the page recovers on its own
      // once the request succeeds, instead of staying stuck on this error.
      const knownStatus = (detailRef.current?.status || '').toUpperCase();
      const isKnownTerminal = ['COMPLETED', 'FAILED'].includes(knownStatus);
      setPolling(!isKnownTerminal);
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  // 2. Control Polling Loop
  useEffect(() => {
    fetchData();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (polling) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(() => {
        fetchData(true);
      }, 4000);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [polling]);

  // Real-time EventSource listener
  useEffect(() => {
    if (!id) return;
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    const streamUrl = api.getEventsStreamUrl(id);
    const eventSource = new EventSource(streamUrl);
    let closedByEffect = false;

    const isTerminal = () => {
      const s = (detailRef.current?.status || '').toUpperCase();
      return s === 'COMPLETED' || s === 'FAILED';
    };

    eventSource.onopen = () => {
      // Connection (re)established. Nothing to reset in UI state; log for
      // observability so a dropped/restored stream is visible in dev tools.
      console.debug("EventSource stream open:", streamUrl);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setEvents((prev) => {
          if (prev.some((e) => e.id === parsed.id)) {
            return prev;
          }
          return [...prev, parsed];
        });

        if (["TASK_COMPLETED", "TASK_BLOCKED", "TASK_FAILED", "WAITING_FOR_HUMAN", "HUMAN_ACTION_COMPLETED"].includes(parsed.event_type)) {
          fetchData(true);
        }
      } catch (err) {
        console.error("Error parsing EventSource message:", err);
      }
    };

    eventSource.onerror = () => {
      if (closedByEffect) return;

      // The backend closes the stream once the investigation reaches a terminal
      // state. That surfaces here as an error even though nothing failed -- do
      // not log it as an error and do not fight the (now-finished) stream.
      if (isTerminal() || eventSource.readyState === EventSource.CLOSED) {
        eventSource.close();
        return;
      }

      // Otherwise the connection dropped while the investigation is still
      // running. EventSource is already in CONNECTING and will retry on its own;
      // leave it open so it reconnects. A fresh connection re-sends every event
      // and onmessage de-dupes by id, so reconnection is idempotent.
    };

    return () => {
      closedByEffect = true;
      eventSource.close();
    };
  }, [id]);

  // 3. Trigger Resume action for entire investigation
  const handleResume = async () => {
    try {
      setResumeLoading(true);
      setError('');
      await api.resumeInvestigation(id);
      setHitl(null);
      await fetchData(); // Force immediate reload
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to resume investigation.');
      }
    } finally {
      setResumeLoading(false);
    }
  };

  // 4. Task-level human intervention completion
  const handleTaskResume = async (taskId: string) => {
    try {
      setTaskResumeLoading(prev => ({ ...prev, [taskId]: true }));
      setError('');
      await api.completeHumanIntervention(id, taskId);
      await fetchData(); // Force immediate reload
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to complete verification task.');
      }
    } finally {
      setTaskResumeLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div className="spinner" />
        <p style={{ marginTop: '16px' }}>Fetching investigation timeline...</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div style={containerStyle}>
        <div style={breadcrumbStyle}>
          <Link href="/dashboard" style={backLinkStyle}>← Back to Dashboard</Link>
        </div>
        <div style={errorStyle}>{error}</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={containerStyle}>
        <div style={breadcrumbStyle}>
          <Link href="/dashboard" style={backLinkStyle}>← Back to Dashboard</Link>
        </div>
        <div style={errorStyle}>Investigation case not found.</div>
      </div>
    );
  }

  // Parse discovered candidates from evidence
  const candidateEvidence = evidence.find(ev => ev.field_name === 'candidate_entities');
  let candidates: CandidateItem[] = [];
  if (candidateEvidence) {
    try {
      candidates = JSON.parse(candidateEvidence.field_value) as CandidateItem[];
    } catch {
      candidates = [];
    }
  }
  const nonCandidateEvidence = evidence.filter(ev => ev.field_name !== 'candidate_entities');

  const getSourceCategory = (sourceName: string) => {
    const name = (sourceName || '').toLowerCase();
    if (name.includes('gst') || name.includes('mca') || name.includes('registry')) return 'Official Registry';
    if (name.includes('epfo')) return 'Government / Official';
    if (name.includes('company website') || name.includes('official website')) return 'Official';
    if (name.includes('general web')) return 'General Web';
    return 'Third-Party';
  };

  const isOfficialCategory = (category: string) => category === 'Official Registry' || category === 'Government / Official' || category === 'Official';

  // Turns an internal SNAKE_CASE node/stage name (e.g. "BROWSER_RESEARCH") into
  // user-facing wording (e.g. "Browser Research"), preserving short acronyms like "QA".
  const humanizeNodeName = (value: string | null | undefined) => {
    if (!value) return null;
    return value
      .split('_')
      .filter(Boolean)
      .map(word => (word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join(' ');
  };

  const getRiskColor = (level: string | null) => {
    if (!level) return 'var(--risk-unknown)';
    switch (level.toUpperCase()) {
      case 'LOW': return 'var(--risk-low)';
      case 'MODERATE': return 'var(--risk-moderate)';
      case 'HIGH': return 'var(--risk-high)';
      case 'VERY_HIGH': return 'var(--risk-very-high)';
      default: return 'var(--risk-unknown)';
    }
  };

  const getStageState = (stage: string) => {
    const status = detail.status.toUpperCase();
    const node = (detail.current_node || '').toUpperCase();

    // Intake
    if (stage === 'Intake') {
      return { isCompleted: true, isActive: false };
    }

    // Entity Discovery
    if (stage === 'Entity Discovery') {
      const isCompleted = ['PENDING_RESEARCH', 'RESEARCH', 'ENTITY_RESOLUTION', 'RISK_ANALYSIS', 'REPORT_GENERATION', 'QA', 'COMPLETED', 'FAILED'].includes(status) || node !== 'INTAKE';
      const isActive = status === 'NORMALIZED' || node === 'DISCOVERY';
      return { isCompleted, isActive };
    }

    // Browser Research
    if (stage === 'Browser Research') {
      const isCompleted = ['ENTITY_RESOLUTION', 'RISK_ANALYSIS', 'REPORT_GENERATION', 'QA', 'COMPLETED', 'FAILED'].includes(status);
      const isActive = ['PENDING_RESEARCH', 'RESEARCH'].includes(status) || node === 'BROWSER_RESEARCH';
      return { isCompleted, isActive };
    }

    // Evidence Validation
    if (stage === 'Evidence Validation') {
      const isCompleted = ['ENTITY_RESOLUTION', 'RISK_ANALYSIS', 'REPORT_GENERATION', 'QA', 'COMPLETED', 'FAILED'].includes(status);
      const isActive = ['PENDING_RESEARCH', 'RESEARCH'].includes(status) || node === 'BROWSER_RESEARCH';
      return { isCompleted, isActive };
    }

    // Entity Resolution
    if (stage === 'Entity Resolution') {
      const isCompleted = ['RISK_ANALYSIS', 'REPORT_GENERATION', 'QA', 'COMPLETED', 'FAILED'].includes(status);
      const isActive = status === 'ENTITY_RESOLUTION' || node === 'ENTITY_RESOLUTION';
      return { isCompleted, isActive };
    }

    // Risk Analysis
    if (stage === 'Risk Analysis') {
      const isCompleted = ['REPORT_GENERATION', 'QA', 'COMPLETED', 'FAILED'].includes(status);
      const isActive = status === 'RISK_ANALYSIS' || node === 'RISK_ANALYSIS';
      return { isCompleted, isActive };
    }

    // Report
    if (stage === 'Report') {
      const isCompleted = ['QA', 'COMPLETED', 'FAILED'].includes(status);
      const isActive = status === 'REPORT_GENERATION' || node === 'REPORT_GENERATION';
      return { isCompleted, isActive };
    }

    // QA
    if (stage === 'QA') {
      const isCompleted = ['COMPLETED', 'FAILED'].includes(status);
      const isActive = status === 'QA' || node === 'QA';
      return { isCompleted, isActive };
    }

    return { isCompleted: false, isActive: false };
  };

  const browserSessions = detail?.browser_sessions || [];

  // Calculate browser statistics
  const totalAttempted = browserSessions.length;
  const successfulCount = browserSessions.filter((s: any) => s.status === 'SUCCESS').length;
  const blockedCount = browserSessions.filter((s: any) => s.status === 'BLOCKED' || s.status === 'BLOCKED_OR_ERROR').length;
  const irrelevantCount = browserSessions.filter((s: any) => s.status === 'IRRELEVANT_CONTENT' || s.status === 'IRRELEVANT').length;
  const failedCount = totalAttempted - successfulCount - blockedCount - irrelevantCount;

  const fallbackUsed = browserSessions.some((s: any) => s.source_type === 'fallback') ? 'YES' : 'NO';
  const selectedSourceObj = browserSessions.find((s: any) => s.selected_as_evidence === true);
  const selectedSource = selectedSourceObj ? selectedSourceObj.source_name : 'None';

  // Compact, merchant-facing facts for the case header -- omitted entirely
  // when not supplied, rather than showing a "None" placeholder.
  const headerFacts: { label: string; value: string }[] = [];
  if (detail.input.gstin) headerFacts.push({ label: 'GSTIN', value: detail.input.gstin });
  if (detail.input.cin) headerFacts.push({ label: 'CIN', value: detail.input.cin });
  if (detail.input.website) headerFacts.push({ label: 'Website', value: detail.input.website });
  if (detail.input.location) headerFacts.push({ label: 'Location', value: detail.input.location });

  // The latest report body, used across the Verification Summary, Source
  // Coverage, and Report/QA sections below -- same underlying data the
  // previous layout read, just read once and shared.
  const activeReportData = (reports[selectedReportIdx]?.report || {}) as Record<string, any>;

  const consistencyByField: Record<string, any> = {};
  (activeReportData.cross_source_consistency || []).forEach((rec: any) => {
    if (rec?.field_key) consistencyByField[rec.field_key] = rec;
  });

  // The four fields a risk reviewer actually needs to see verified, each
  // reduced to its single best/most-relevant reconciliation record (the
  // backend already computed this rollup in cross_source_consistency --
  // this only selects which of its existing rows to surface up front).
  const verificationRows = [
    { key: 'legal_name', label: 'Legal Name', show: true },
    { key: 'company_status', label: 'Company Status', show: true },
    { key: 'registered_address', label: 'Registered Address', show: true },
    { key: 'gstin', label: 'GSTIN', show: !!detail.input.gstin },
    { key: 'cin', label: 'CIN', show: !!detail.input.cin },
    { key: 'website', label: 'Website', show: !!detail.input.website },
  ]
    .filter(f => f.show && consistencyByField[f.key])
    .map(f => ({ ...f, record: consistencyByField[f.key] }));

  const verificationRowBadge = (status: string) => {
    switch (status) {
      case 'MATCH': return { label: '✓ Match', color: 'var(--risk-low)' };
      case 'PARTIAL_MATCH': return { label: '≈ Partial Match', color: 'var(--secondary)' };
      case 'CONFLICT': return { label: '✕ Conflict', color: 'var(--risk-very-high)' };
      default: return { label: 'Unavailable', color: 'var(--foreground-subtle)' };
    }
  };

  // Source Coverage: the same per-category verification_summary the report
  // already returns (gst/mca/epfo/official_website/third_party/general_web),
  // rolled up into the four buckets a reviewer actually cares about. Status
  // derivation matches the Evidence & Sources Log exactly, so the same
  // situation is never worded two different ways on this page.
  const verificationSummary = activeReportData.verification_summary || {};
  const STATUS_RANK: Record<string, number> = {
    UNAVAILABLE: 0, NOT_FOUND: 1, BLOCKED: 2, CAPTCHA_REQUIRED: 3, ATTEMPTED_UNVERIFIED: 4, VERIFIED: 5,
  };
  const deriveCoverageStatus = (sData: any): string => {
    const raw = sData?.status;
    if (raw === 'VERIFIED' || raw === 'CAPTCHA_REQUIRED' || raw === 'BLOCKED' || raw === 'NOT_FOUND') return raw;
    if ((sData?.evidence_count || 0) > 0) return 'ATTEMPTED_UNVERIFIED';
    return 'UNAVAILABLE';
  };
  const coverageBadge: Record<string, { label: string; color: string }> = {
    VERIFIED: { label: '✓ Verified', color: 'var(--risk-low)' },
    CAPTCHA_REQUIRED: { label: '⚠ CAPTCHA Required', color: 'var(--risk-moderate)' },
    BLOCKED: { label: '⚠ Blocked', color: 'var(--risk-very-high)' },
    NOT_FOUND: { label: 'ℹ Not Found', color: 'var(--foreground-subtle)' },
    ATTEMPTED_UNVERIFIED: { label: '⚠ Attempted / Unverified', color: 'var(--risk-moderate)' },
    UNAVAILABLE: { label: 'Unavailable', color: 'var(--foreground-subtle)' },
  };
  const mergeCoverage = (keys: string[]) => {
    const parts = keys.map(k => verificationSummary[k]).filter(Boolean);
    const statuses = parts.map(deriveCoverageStatus);
    const best = statuses.reduce((a, b) => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a), 'UNAVAILABLE');
    const count = parts.reduce((sum: number, p: any) => sum + (p.evidence_count || 0), 0);
    return { status: best, count, attempted: parts.length > 0 };
  };
  const coverageGroups = [
    { label: 'Government / Official', ...mergeCoverage(['gst', 'mca', 'epfo']) },
    { label: 'Official Website', ...mergeCoverage(['official_website']) },
    { label: 'Third-Party', ...mergeCoverage(['third_party']) },
    { label: 'General Web', ...mergeCoverage(['general_web']) },
  ].filter(g => g.attempted);

  const renderToggle = (label: string, isOpen: boolean, onClick: () => void, count?: number) => (
    <button onClick={onClick} className="btn-ghost" style={toggleButtonStyle}>
      <span>{isOpen ? '▼' : '▶'} {label}</span>
      {typeof count === 'number' && <span style={{ opacity: 0.65 }}>({count})</span>}
    </button>
  );

  return (
    <div style={containerStyle}>
      {/* Top Breadcrumb & Controls */}
      <div style={topControlsStyle}>
        <Link href="/dashboard" style={backLinkStyle}>← Back to Dashboard</Link>
        <div style={pollingIndicatorContainerStyle}>
          {polling && (
            <div style={pulseIndicatorStyle}>
              <span className="skeleton" style={pulseDotStyle} />
              <span style={{ fontSize: '13px', color: 'var(--foreground-muted)' }}>Auto-sync active...</span>
            </div>
          )}
          <button onClick={() => fetchData()} className="btn-ghost" style={manualRefreshButtonStyle}>
            Sync Now
          </button>
        </div>
      </div>

      {/* Case Header */}
      <div className="glass-panel" style={caseHeaderStyle}>
        <div style={headerLeftSectionStyle}>
          <span className="eyebrow">Case Investigation File</span>
          <h1 style={caseTitleStyle}>{detail.input.business_name || 'Unnamed Business'}</h1>
          <p style={caseIdStyle}>
            Case ID <code className="id-chip">{detail.id}</code>
          </p>
          {headerFacts.length > 0 && (
            <div style={headerFactsRowStyle}>
              {headerFacts.map(f => (
                <span key={f.label} style={headerFactChipStyle}>
                  <span style={headerFactLabelStyle}>{f.label}</span>{f.value}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={headerRightSectionStyle}>
          <div style={headerMetricStyle}>
            <span style={metricLabelStyle}>Status</span>
            <StatusBadge status={detail.status} />
          </div>
          <div style={headerMetricStyle}>
            <span style={metricLabelStyle}>Current Stage</span>
            <span style={metricValueStyle}>{humanizeNodeName(detail.current_node) || 'Intake'}</span>
          </div>
        </div>
      </div>

      {/* HITL HUMAN INTERVENTION PANEL */}
      {detail.status === 'WAITING_FOR_USER' && hitl && (
        <div className="glass-panel" style={hitlPanelStyle}>
          <div style={hitlHeaderStyle}>
            <span style={hitlIconStyle}>⚠️</span>
            <div>
              <h3 style={hitlTitleStyle}>Action Required: Human Verification Required</h3>
              <p style={hitlDescStyle}>The automated browser crawler is currently waiting for human verification input.</p>
            </div>
          </div>
          <div style={hitlBodyStyle}>
            {hitl.pending_tasks.map((task) => (
              <div key={task.id} style={{ ...hitlTaskCardStyle, borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={hitlTaskMetaStyle}>
                  <span>Task: <strong>{task.task_type}</strong></span>
                  <span>Type: <strong style={{ color: 'var(--risk-moderate)' }}>{task.intervention_type}</strong></span>
                </div>
                <p style={hitlTaskReasonStyle}><strong>Reason:</strong> {task.intervention_reason || 'Manual verification challenge (e.g. CAPTCHA) detected.'}</p>
                <p style={hitlTaskReasonStyle}><strong>Objective:</strong> {task.objective}</p>

                {/* Visual live browser panel */}
                {activeSessions[task.task_id] && (
                  <div style={{ marginTop: '16px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                        🔴 LIVE BROWSER SESSION VIEW (Click Screenshot to Click inside Browser)
                      </span>
                      <button
                        onClick={() => handleRefreshScreenshot(task.task_id)}
                        style={{ background: 'transparent', color: '#ccc', border: '1px solid #444', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Refresh Image
                      </button>
                    </div>

                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '4px', background: '#000', cursor: 'crosshair', maxWidth: '600px', border: '1px solid #222' }}>
                      <img
                        src={api.getScreenshotUrl(id, task.task_id, screenshotRefresh[task.task_id])}
                        alt="Live Browser Session"
                        onClick={(e) => handleScreenshotClick(task.task_id, e)}
                        style={{ width: '100%', height: 'auto', display: 'block', opacity: interactionLoading[task.task_id] ? 0.6 : 1 }}
                      />
                      {interactionLoading[task.task_id] && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '11px' }}>
                          Processing interaction...
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Type text to send to browser..."
                        value={typeTexts[task.task_id] || ''}
                        onChange={(e) => setTypeTexts(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                        style={{ flex: 1, background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '6px 10px', fontSize: '11px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTypeText(task.task_id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleTypeText(task.task_id)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Send Keystrokes
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleTaskResume(task.task_id)}
                    disabled={taskResumeLoading[task.task_id]}
                    style={{
                      background: 'var(--risk-low)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      opacity: taskResumeLoading[task.task_id] ? 0.7 : 1,
                    }}
                  >
                    {taskResumeLoading[task.task_id] ? 'Resuming Browser Task...' : '✓ Complete Verification'}
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>
                    {taskResumeLoading[task.task_id]
                      ? 'Browser resumed. Extracting evidence...'
                      : 'Interact with the browser session above, then click complete to resume browser research.'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...hitlActionsContainerStyle, borderTop: '1px solid var(--panel-border)', paddingTop: '12px', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--foreground-muted)' }}>
              Or you can force a full graph resumption (tries all tasks):
            </span>
            <button onClick={handleResume} disabled={resumeLoading} style={{ ...resumeButtonStyle, marginLeft: '12px', padding: '6px 12px', fontSize: '11px' }}>
              {resumeLoading ? 'Initiating pipeline recovery...' : 'Force Full Resume'}
            </button>
          </div>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      {/* DECISION -- the hero. Always the same slot regardless of pipeline
          stage, so the page reads as a decision console rather than a raw
          debug dashboard: failed / pending / decided are the only three
          truthful states, never a fabricated score. */}
      {(() => {
        const status = detail.status.toUpperCase();

        if (status === 'FAILED') {
          return (
            <div className="glass-panel" style={{ ...heroCardStyle, borderColor: 'var(--risk-high)' }}>
              <span className="eyebrow" style={{ color: 'var(--risk-very-high)' }}>Decision</span>
              <h2 style={{ ...heroTitleStyle, color: 'var(--risk-very-high)' }}>Investigation Failed</h2>
              <p style={heroReasonStyle}>
                The generic web research or QA validation thresholds failed to resolve enough verified entity markers. This case is terminated.
              </p>
            </div>
          );
        }

        const hasRiskData = (detail.risk_score !== null && detail.risk_score !== undefined) || risk !== null;
        if (status !== 'COMPLETED' || !hasRiskData) {
          return (
            <div className="glass-panel" style={heroCardStyle}>
              <span className="eyebrow">Decision</span>
              <h2 style={heroTitleStyle}>Pending — investigation in progress</h2>
              <p style={heroReasonStyle}>
                Currently at <strong>{humanizeNodeName(detail.current_node) || 'Intake'}</strong>. The merchant decision will appear here once the investigation completes.
              </p>
            </div>
          );
        }

        const isInsufficient = (risk as any)?.insufficient_evidence || nonCandidateEvidence.length === 0;
        const displayScore = isInsufficient ? 'N/A' : (detail.risk_score !== null && detail.risk_score !== undefined
          ? detail.risk_score
          : risk?.overall_risk?.score ?? null);
        const displayLevel = isInsufficient ? 'INSUFFICIENT EVIDENCE' : (detail.risk_level || risk?.overall_risk?.level || null);
        const displayColor = isInsufficient ? 'var(--risk-moderate)' : getRiskColor(displayLevel);

        const merchantDecision: string | undefined = activeReportData.merchant_decision;
        const decisionColor = (d?: string) => {
          switch (d) {
            case 'APPROVE': return 'var(--risk-low)';
            case 'APPROVE_WITH_MONITORING': return 'var(--risk-moderate)';
            case 'MANUAL_REVIEW': return 'var(--risk-high)';
            case 'REJECT_OR_ESCALATE': return 'var(--risk-very-high)';
            default: return 'var(--foreground-muted)';
          }
        };
        const decisionLabel = (d?: string) => (d ? d.replace(/_/g, ' ') : 'PENDING');

        // Never let the badge visually read as a final APPROVE/REJECT outcome
        // when the underlying assessment is incomplete -- regardless of the
        // raw merchant_decision value, insufficient evidence always displays
        // as an explicit manual-review-required notice.
        const displayDecisionLabel = isInsufficient ? 'MANUAL REVIEW REQUIRED — INSUFFICIENT EVIDENCE' : decisionLabel(merchantDecision);
        const displayDecisionColor = isInsufficient ? 'var(--risk-moderate)' : decisionColor(merchantDecision);

        return (
          <div className="glass-panel" style={{ ...heroCardStyle, borderColor: displayColor }}>
            <span className="eyebrow">Decision</span>
            <div style={heroScoreRowStyle}>
              <div style={scoreCircleStyle}>
                <span style={{ fontSize: '38px', fontWeight: '900', color: displayColor }}>
                  {displayScore !== null ? displayScore : 'N/A'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--foreground-muted)', fontWeight: '600' }}>SCORE / 100</span>
              </div>
              <div style={riskLevelInfoStyle}>
                <span style={{ fontSize: '13px', color: 'var(--foreground-muted)' }}>Risk Classification</span>
                <h2 style={{ ...heroTitleStyle, color: displayColor, fontSize: '22px' }}>
                  {displayLevel || 'UNKNOWN'}
                </h2>
                {merchantDecision && (
                  <>
                    <span style={{ fontSize: '13px', color: 'var(--foreground-muted)', marginTop: '10px', display: 'block' }}>Merchant Decision</span>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '2px',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: '800',
                      color: displayDecisionColor,
                      background: `${displayDecisionColor}1a`,
                      border: `1px solid ${displayDecisionColor}55`,
                    }}>
                      {displayDecisionLabel}
                    </span>
                  </>
                )}
              </div>
            </div>

            {isInsufficient && (
              <div style={heroNoticeStyle}>
                ⚠️ Verification pipeline resolved no external registry or web evidence records. Risk assessment is incomplete due to insufficient evidence.
              </div>
            )}

            {/* Key reason: the top triggered risk signal, if any -- kept distinct
                from the Executive Summary in the Report card below rather than
                repeating the same sentence in two places on the same page. */}
            {!isInsufficient && (risk?.risk_signals || []).length > 0 && (
              <p style={heroReasonStyle}>
                <strong>Key reason:</strong> {risk!.risk_signals[0].description}
              </p>
            )}

            {risk && (
              <div>
                {renderToggle('Risk signal details', showRiskDetail, () => setShowRiskDetail(!showRiskDetail), (risk.risk_signals || []).length)}
                {showRiskDetail && (
                  <div style={{ ...categoryBreakdownStyle, marginTop: '16px' }}>
                    <h4 style={subHeaderStyle}>Category Score Breakdown</h4>
                    <div style={categoryGridStyle}>
                      {Object.entries(risk.category_scores || {}).map(([category, score]) => (
                        <div key={category} style={categoryBarItemStyle}>
                          <div style={categoryMetaStyle}>
                            <span style={categoryNameLabelStyle}>{category}</span>
                            <span>{score}</span>
                          </div>
                          <div style={categoryBarBgStyle}>
                            <div style={{
                              ...categoryBarFillStyle,
                              width: `${Math.min(score, 100)}%`,
                              background: getRiskColor(displayLevel)
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {(risk.risk_signals || []).length > 0 && (
                      <div style={signalsListContainerStyle}>
                        <h4 style={subHeaderStyle}>Triggered Risk Signals ({(risk.risk_signals || []).length})</h4>
                        <div style={signalsListStyle}>
                          {(risk.risk_signals || []).map((sig, idx) => (
                            <div key={idx} style={signalCardStyle}>
                              <div style={signalCardHeaderStyle}>
                                <strong>{sig.code}</strong>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  background: 'rgba(177, 52, 52, 0.1)',
                                  color: 'var(--risk-very-high)',
                                  border: '1px solid rgba(177, 52, 52, 0.2)'
                                }}>{sig.severity}</span>
                              </div>
                              <p style={signalDescStyle}>{sig.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="detail-grid">
        {/* Left column: how the decision was verified */}
        <div style={leftColStyle}>

          {/* Verification Summary */}
          {verificationRows.length > 0 && (
            <div className="glass-panel" style={innerPanelStyle}>
              <h3 style={panelHeaderStyle}>Verification Summary</h3>
              <div style={verificationListStyle}>
                {verificationRows.map(row => {
                  const badge = verificationRowBadge(row.record.status);
                  const sources: string[] = (row.record.sources_compared || []).map((s: any) => s.source);
                  const primaryValue = row.record.sources_compared?.[0]?.value;
                  return (
                    <div key={row.key} style={verificationRowStyle}>
                      <div style={verificationRowHeadStyle}>
                        <span style={verificationFieldLabelStyle}>{row.label}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px',
                          color: badge.color, background: `${badge.color}1a`, border: `1px solid ${badge.color}55`,
                        }}>{badge.label}</span>
                      </div>
                      {primaryValue && (
                        <div style={verificationValueStyle}>{primaryValue}</div>
                      )}
                      {sources.length > 0 && (
                        <div style={verificationSourceStyle}>via {sources.join(', ')}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={sectionToggleStackStyle}>
                {Array.isArray(activeReportData.cross_source_consistency) && activeReportData.cross_source_consistency.length > 0 && (
                  <div>
                    {renderToggle('Full field reconciliation', showFullReconciliation, () => setShowFullReconciliation(!showFullReconciliation), activeReportData.cross_source_consistency.length)}
                    {showFullReconciliation && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ overflowX: 'auto', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--panel-border)' }}>
                                <th style={{ padding: '10px 12px', color: 'var(--foreground-muted)' }}>Field</th>
                                <th style={{ padding: '10px 12px', color: 'var(--foreground-muted)' }}>Reconciliation</th>
                                <th style={{ padding: '10px 12px', color: 'var(--foreground-muted)' }}>Sources & Values</th>
                                <th style={{ padding: '10px 12px', color: 'var(--foreground-muted)' }}>Analysis</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeReportData.cross_source_consistency.map((rec: any, idx: number) => {
                                const isM = rec.status === 'MATCH';
                                const isP = rec.status === 'PARTIAL_MATCH';
                                const isC = rec.status === 'CONFLICT';
                                const rColor = isM ? 'var(--risk-low)' : isP ? 'var(--secondary)' : isC ? 'var(--risk-very-high)' : 'var(--foreground-subtle)';
                                const rTag = isM ? '✓ MATCH' : isP ? '≈ PARTIAL' : isC ? '✕ CONFLICT' : '— UNAVAILABLE';

                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                                    <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--foreground)' }}>{rec.field}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                      <span style={{ fontSize: '11px', fontWeight: '700', color: rColor, padding: '2px 6px', borderRadius: '4px', background: `${rColor}1a` }}>
                                        {rTag}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--foreground)' }}>
                                      {rec.sources_compared && rec.sources_compared.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {rec.sources_compared.map((sc: any, sIdx: number) => (
                                            <div key={sIdx} style={{ fontSize: '11px' }}>
                                              <span style={{ color: 'var(--foreground-muted)' }}>{sc.source}: </span>
                                              <code style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: '3px' }}>{sc.value}</code>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>None available</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--foreground-muted)', fontSize: '11.5px', lineHeight: '1.3' }}>
                                      {rec.analysis}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {((Array.isArray(activeReportData.source_limitations) && activeReportData.source_limitations.length > 0) ||
                          (Array.isArray(activeReportData.unverified_information) && activeReportData.unverified_information.length > 0)) && (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(activeReportData.source_limitations || []).map((lim: any, lIdx: number) => (
                              <div key={lIdx} style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(184, 134, 46, 0.04)', border: '1px solid rgba(184, 134, 46, 0.2)', fontSize: '12px', color: 'var(--risk-moderate)' }}>
                                ⚠ <strong>{lim.source}</strong>: {lim.reason || lim.status}
                              </div>
                            ))}
                            {(activeReportData.unverified_information || []).map((unv: any, uIdx: number) => (
                              <div key={uIdx} style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--panel-border)', fontSize: '12px', color: 'var(--foreground-muted)' }}>
                                ℹ Unverified field <strong>{unv.field}</strong> from {unv.source}: <code>{String(unv.value)}</code>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {nonCandidateEvidence.length > 0 && (
                  <div>
                    {renderToggle('All evidence records', showAllEvidence, () => setShowAllEvidence(!showAllEvidence), nonCandidateEvidence.length)}
                    {showAllEvidence && (
                      <div style={{ ...evidenceListStyle, marginTop: '12px' }}>
                        {nonCandidateEvidence.map((ev) => {
                          const valStr = String(ev.field_value || '').trim().toUpperCase();
                          const isCaptcha = valStr.includes('CAPTCHA') || ev.field_name.toUpperCase().includes('CAPTCHA');
                          const isBlocked = valStr === 'BLOCKED' || valStr === 'SOURCE_UNAVAILABLE' || valStr === 'TIMEOUT';
                          const isNotFound = valStr === 'NOT_FOUND' || valStr === 'NONE';
                          // A source that was actually reached but yielded no usable content
                          // (empty value, or an empty title/text search result) was attempted,
                          // not unreachable -- keep it out of isUnavailable so it isn't mislabeled.
                          const isEmptyAttempt = valStr === '' || valStr === '{"TITLE": NULL, "TEXT": ""}';
                          const isUnavailable = isBlocked || isNotFound || valStr === 'UNAVAILABLE';
                          const isVerified = ev.confidence >= 0.70 && !isUnavailable && !isEmptyAttempt;
                          const isLowConfidence = !isUnavailable && !isEmptyAttempt && !isVerified;

                          let statusTagText = '✓ VERIFIED';
                          let cardBorderColor = 'rgba(31, 138, 83, 0.2)';
                          let cardBgColor = 'rgba(31, 138, 83, 0.01)';
                          let statusTagColor = 'var(--risk-low)';

                          if (isCaptcha) {
                            statusTagText = '⚠ CAPTCHA REQUIRED';
                            cardBorderColor = 'rgba(184, 134, 46, 0.3)';
                            cardBgColor = 'rgba(184, 134, 46, 0.02)';
                            statusTagColor = 'var(--risk-moderate)';
                          } else if (isBlocked) {
                            statusTagText = '⚠ BLOCKED';
                            cardBorderColor = 'rgba(177, 52, 52, 0.2)';
                            cardBgColor = 'rgba(177, 52, 52, 0.01)';
                            statusTagColor = 'var(--risk-very-high)';
                          } else if (isNotFound) {
                            statusTagText = 'ℹ NOT FOUND';
                            cardBorderColor = 'rgba(140, 136, 128, 0.2)';
                            cardBgColor = 'rgba(140, 136, 128, 0.01)';
                            statusTagColor = 'var(--foreground-subtle)';
                          } else if (isUnavailable) {
                            statusTagText = '⚠ UNAVAILABLE';
                            cardBorderColor = 'rgba(177, 52, 52, 0.2)';
                            cardBgColor = 'rgba(177, 52, 52, 0.01)';
                            statusTagColor = 'var(--risk-very-high)';
                          } else if (isEmptyAttempt) {
                            statusTagText = '⚠ ATTEMPTED / UNVERIFIED';
                            cardBorderColor = 'rgba(184, 134, 46, 0.2)';
                            cardBgColor = 'rgba(184, 134, 46, 0.01)';
                            statusTagColor = 'var(--risk-moderate)';
                          } else if (isLowConfidence) {
                            statusTagText = '⚠ UNVERIFIED / LOW CONFIDENCE';
                            cardBorderColor = 'rgba(184, 134, 46, 0.2)';
                            cardBgColor = 'rgba(184, 134, 46, 0.01)';
                            statusTagColor = 'var(--risk-moderate)';
                          }

                          // Human-readable formatting of the field value
                          let displayValue = ev.field_value;
                          if (isUnavailable) {
                            displayValue = `Source status: ${valStr || 'UNAVAILABLE'} (connection inaccessible or record not present).`;
                          } else if (isEmptyAttempt) {
                            displayValue = 'Source status: ATTEMPTED / UNVERIFIED (source was reached but no reliable content was extracted).';
                          } else if (displayValue && (displayValue.startsWith('{') || displayValue.startsWith('['))) {
                            try {
                              const parsed = JSON.parse(displayValue);
                              if (typeof parsed === 'object') {
                                displayValue = Object.entries(parsed)
                                  .map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)
                                  .join('\n');
                              }
                            } catch {
                              // fallback to raw value
                            }
                          }

                          return (
                            <div key={ev.id} style={{
                              ...evidenceCardStyle,
                              border: `1px solid ${cardBorderColor}`,
                              background: cardBgColor,
                            }}>
                              <div style={evidenceCardHeaderStyle}>
                                <span style={evidenceFieldStyle}>{ev.field_name.replace('_', ' ')}</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {(() => {
                                    const category = getSourceCategory(ev.source_name);
                                    return (
                                      <span style={isOfficialCategory(category) ? officialSourceTagStyle : thirdPartySourceTagStyle}>
                                        {category}
                                      </span>
                                    );
                                  })()}
                                  <span style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    background: cardBorderColor.replace('0.2', '0.1'),
                                    color: statusTagColor,
                                    border: `1px dashed ${cardBorderColor}`,
                                    fontWeight: '600',
                                  }}>{statusTagText}</span>
                                </div>
                              </div>
                              <div style={{
                                fontSize: '14px',
                                color: (isUnavailable || isEmptyAttempt) ? 'var(--foreground-muted)' : 'var(--foreground)',
                                fontStyle: (isUnavailable || isEmptyAttempt) ? 'italic' : 'normal',
                                whiteSpace: 'pre-wrap',
                                fontFamily: (isUnavailable || isEmptyAttempt) ? 'inherit' : 'monospace',
                                lineHeight: '1.4',
                              }}>{displayValue}</div>
                              <div style={evidenceMetaGridStyle}>
                                <span>Source: <strong>{ev.source_name}</strong></span>
                                <span>Confidence: <strong>{(ev.confidence * 100).toFixed(0)}%</strong></span>
                                {ev.retrieved_timestamp && (
                                  <span>Fetched: <strong>{new Date(ev.retrieved_timestamp).toLocaleString()}</strong></span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {candidates.length > 0 && (
                  <div>
                    {renderToggle('Discovery candidates', showCandidatesDetail, () => setShowCandidatesDetail(!showCandidatesDetail), candidates.length)}
                    {showCandidatesDetail && (
                      <div style={{ ...candidatesListStyle, marginTop: '12px' }}>
                        {candidates.map((cand, idx) => {
                          const isResolved = detail.resolved_entity_id !== null &&
                            (cand.gstin === detail.input.gstin || cand.cin === detail.input.cin || cand.name === detail.input.business_name);

                          return (
                            <div key={idx} style={{
                              ...candidateCardStyle,
                              borderColor: isResolved ? 'var(--risk-low)' : 'var(--panel-border)'
                            }}>
                              <div style={candidateCardHeaderStyle}>
                                <strong style={candidateNameStyle}>{cand.name}</strong>
                                {isResolved ? (
                                  <span style={resolvedTagStyle}>Resolved</span>
                                ) : (
                                  <span style={candidateTagStyle}>Candidate</span>
                                )}
                              </div>
                              <div style={candidateGridStyle}>
                                <span>GSTIN: <code>{cand.gstin || 'N/A'}</code></span>
                                <span>CIN: <code>{cand.cin || 'N/A'}</code></span>
                                <span>Confidence: <code>{((cand.confidence || 0) * 100).toFixed(0)}%</code></span>
                                <span>Location: <code>{cand.location || 'N/A'}</code></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evidence / investigation details: the underlying report, kept
              visually secondary to the Decision hero above. */}
          <div className="glass-panel" style={innerPanelStyle}>
            <div style={reportPanelHeaderStyle}>
              <h3 style={panelHeaderStyle}>Verification Report</h3>

              {reports.length > 0 && (
                <div style={versionSelectContainerStyle}>
                  <label htmlFor="report-version" style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>Version:</label>
                  <select
                    id="report-version"
                    value={selectedReportIdx}
                    onChange={(e) => setSelectedReportIdx(Number(e.target.value))}
                    style={selectVersionStyle}
                  >
                    {reports.map((rep, idx) => (
                      <option key={rep.id} value={idx}>
                        v{rep.version} ({rep.qa_status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {reports.length === 0 ? (
              <div style={panelEmptyStyle}>No intelligence report generated yet.</div>
            ) : (
              <div style={reportContainerStyle}>
                <div style={reportMetaGridStyle}>
                  <div>QA Status:
                    <span style={{
                      marginLeft: '6px',
                      color: reports[selectedReportIdx].qa_status === 'PASS'
                        ? 'var(--risk-low)'
                        : reports[selectedReportIdx].qa_status === 'FAIL'
                        ? 'var(--risk-very-high)'
                        : 'var(--risk-moderate)',
                      fontWeight: '700'
                    }}>
                      {reports[selectedReportIdx].qa_status}
                    </span>
                  </div>
                  <div>Report version: <strong>{reports[selectedReportIdx].version}</strong></div>
                  {activeReportData.meta?.generated_at && (
                    <div>Generated: <strong>{new Date(activeReportData.meta?.generated_at || '').toLocaleString()}</strong></div>
                  )}
                </div>

                <div>
                  <h4 style={reportSecHeaderStyle}>Executive Summary</h4>
                  <div style={reportTextCardStyle}>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>
                      {activeReportData.recommendation || 'Based on available public evidence, no recommendation available.'}
                    </p>
                  </div>
                </div>

                {Array.isArray(activeReportData.major_findings) && (
                  <div>
                    {renderToggle('Full report details', showFindingsDetail, () => setShowFindingsDetail(!showFindingsDetail), activeReportData.major_findings.length)}
                    {showFindingsDetail && (
                      <div style={{ ...reportFindingsListStyle, marginTop: '12px' }}>
                        {(activeReportData.major_findings as unknown as FindingItem[] | undefined)?.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--foreground-muted)', margin: '4px 0' }}>No high-risk compliance findings detected.</p>
                        ) : (
                          (activeReportData.major_findings as unknown as FindingItem[] | undefined)?.map((finding: FindingItem, idx: number) => (
                            <div key={idx} style={findingCardStyle}>
                              <div style={findingCardHeaderStyle}>
                                <strong>{finding.code}</strong>
                                <span>Confidence: {((finding.confidence || 0) * 100).toFixed(0)}%</span>
                              </div>
                              <p style={findingDescStyle}>{finding.description}</p>
                              {finding.evidence_ids && finding.evidence_ids.length > 0 && (
                                <div style={findingEvidenceListStyle}>
                                  <span>Evidence link:</span>
                                  {finding.evidence_ids.map((eid: string) => (
                                    <code key={eid} style={evidenceTagStyle}>{eid}</code>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: sidebar with Verification Progress + Source Coverage.
            Sticky on desktop (see .detail-sidebar-sticky) so it stays visible
            while the main content scrolls; stacks below on mobile since it's
            simply the second item in this same responsive grid. */}
        <div style={rightColStyle} className="detail-sidebar-sticky">
          {/* Research Pipeline: compact progress only */}
          <div className="glass-panel" style={innerPanelStyle}>
            <h3 style={panelHeaderStyle}>Verification Progress</h3>
            <div style={pipelineTrackStyle}>
              {['Intake', 'Entity Discovery', 'Browser Research', 'Evidence Validation', 'Entity Resolution', 'Risk Analysis', 'Report', 'QA'].map((stage, idx, arr) => {
                const { isCompleted, isActive } = getStageState(stage);
                return (
                  <React.Fragment key={stage}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '70px',
                      textAlign: 'center',
                      opacity: isActive || isCompleted ? 1 : 0.35,
                    }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isCompleted ? 'var(--risk-low)' : isActive ? 'var(--primary)' : 'var(--surface-hover)',
                        color: isCompleted || isActive ? 'var(--foreground)' : 'var(--foreground-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        marginBottom: '4px',
                      }}>
                        {isCompleted ? '✓' : idx + 1}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: isCompleted ? 'var(--risk-low)' : isActive ? 'var(--primary)' : 'var(--foreground-subtle)',
                        fontWeight: '600',
                      }}>{stage}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <span style={{ alignSelf: 'center', fontSize: '12px', color: 'var(--panel-border-strong)', marginBottom: '16px' }}>→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {events.length > 0 && (
              <div style={sectionToggleStackStyle}>
                {renderToggle('Research activity timeline', showActivityTimeline, () => setShowActivityTimeline(!showActivityTimeline), events.length)}
                {showActivityTimeline && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingLeft: '4px' }}>
                    {events.map((evt, idx) => {
                      const isErr = ["EVIDENCE_REJECTED", "TASK_FAILED", "TASK_BLOCKED", "CAPTCHA_DETECTED"].includes(evt.event_type);
                      const isSuccess = ["TASK_COMPLETED", "EVIDENCE_FOUND", "HUMAN_ACTION_COMPLETED", "PAGE_LOADED"].includes(evt.event_type);
                      const isPending = ["TASK_STARTED", "WAITING_FOR_HUMAN", "HUMAN_ACTION_REQUIRED"].includes(evt.event_type);

                      const markerColor = isSuccess ? 'var(--risk-low)' : isErr ? 'var(--risk-very-high)' : isPending ? 'var(--risk-moderate)' : 'var(--primary)';
                      const markerIcon = isSuccess ? '✓' : isErr ? '⚠' : isPending ? '⏸' : '▶';

                      const timestampStr = evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : '';

                      return (
                        <div key={evt.id || idx} style={{ display: 'flex', gap: '12px', fontSize: '12px', position: 'relative' }}>
                          {idx < events.length - 1 && (
                            <div style={{ position: 'absolute', left: '10px', top: '20px', bottom: '-12px', width: '2px', background: 'var(--panel-border)' }} />
                          )}

                          <span style={{
                            width: '20px', height: '20px', borderRadius: '50%', background: markerColor, color: 'var(--foreground)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', zIndex: 1, flexShrink: 0,
                          }}>
                            {markerIcon}
                          </span>

                          <div style={{ flexGrow: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: 'var(--foreground)', fontSize: '11px' }}>{evt.event_type.replace(/_/g, ' ')}</strong>
                              {timestampStr && <span style={{ color: 'var(--foreground-muted)', fontSize: '10px' }}>{timestampStr}</span>}
                            </div>
                            <p style={{ margin: '2px 0 0 0', color: 'var(--foreground-muted)', fontSize: '11px' }}>
                              {evt.metadata?.message || evt.metadata_json || 'Research node executing...'}
                            </p>
                            {evt.metadata?.source_name && (
                              <span style={{ display: 'inline-block', marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--panel-border)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px' }}>
                                Source: {evt.metadata.source_name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Source Coverage */}
          {coverageGroups.length > 0 && (
            <div className="glass-panel" style={innerPanelStyle}>
              <h3 style={panelHeaderStyle}>Source Coverage</h3>
              <div style={coverageGridStyle}>
                {coverageGroups.map(group => {
                  const badge = coverageBadge[group.status];
                  return (
                    <div key={group.label} style={{ ...coverageCardStyle, border: `1px solid ${badge.color}33` }}>
                      <div style={coverageHeadStyle}>
                        <strong style={{ fontSize: '12.5px', color: 'var(--foreground)' }}>{group.label}</strong>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: badge.color, padding: '1px 6px', borderRadius: '4px', background: `${badge.color}1a` }}>{badge.label}</span>
                      </div>
                      <span style={coverageCountStyle}>{group.count} evidence record{group.count === 1 ? '' : 's'}</span>
                    </div>
                  );
                })}
              </div>

              {totalAttempted > 0 && (
                <div style={sectionToggleStackStyle}>
                  {renderToggle('Detailed source attempts', !pipelineCollapsed, () => setPipelineCollapsed(!pipelineCollapsed), totalAttempted)}
                  {!pipelineCollapsed && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={coverageStatsGridStyle}>
                        <div>Attempted: <strong>{totalAttempted}</strong></div>
                        <div>Successful: <strong style={{ color: 'var(--risk-low)' }}>{successfulCount}</strong></div>
                        <div>Blocked: <strong style={{ color: 'var(--risk-very-high)' }}>{blockedCount}</strong></div>
                        <div>Irrelevant: <strong style={{ color: 'var(--risk-moderate)' }}>{irrelevantCount}</strong></div>
                        <div>Failed: <strong style={{ color: 'var(--risk-very-high)' }}>{failedCount}</strong></div>
                        <div>Fallback Used: <strong>{fallbackUsed}</strong></div>
                        <div style={{ gridColumn: '1 / -1' }}>Final Selected Source: <strong style={{ color: 'var(--primary)' }}>{selectedSource}</strong></div>
                      </div>

                      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', marginTop: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--panel-border)', background: 'var(--surface)' }}>
                              <th style={{ padding: '6px' }}>#</th>
                              <th style={{ padding: '6px' }}>Source</th>
                              <th style={{ padding: '6px' }}>Type</th>
                              <th style={{ padding: '6px' }}>Status</th>
                              <th style={{ padding: '6px' }}>Confidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {browserSessions.sort((a: any, b: any) => (a.attempt_order || 0) - (b.attempt_order || 0)).map((s: any, sIdx: number) => {
                              const isSuccess = s.status === 'SUCCESS';
                              const statusColor = isSuccess ? 'var(--risk-low)' : (s.status === 'BLOCKED' || s.status === 'BLOCKED_OR_ERROR' ? 'var(--risk-very-high)' : 'var(--risk-moderate)');

                              return (
                                <tr key={s.id || sIdx} style={{
                                  borderBottom: '1px solid var(--panel-border)',
                                  background: isSuccess ? 'rgba(31, 138, 83, 0.03)' : 'transparent',
                                }}>
                                  <td style={{ padding: '6px' }}>{sIdx + 1}</td>
                                  <td style={{ padding: '6px' }}>
                                    <strong>{s.source_name || s.domain}</strong>
                                    {s.url && (
                                      <div style={{ fontSize: '9px', opacity: 0.5, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {s.url}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '6px', textTransform: 'capitalize' }}>{s.source_type}</td>
                                  <td style={{ padding: '6px', color: statusColor, fontWeight: 'bold' }}>{s.status}</td>
                                  <td style={{ padding: '6px' }}>{(s.confidence * 100).toFixed(0)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline Styles
const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  color: 'var(--foreground-muted)',
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  padding: '30px',
  gap: '28px',
  maxWidth: '1280px',
  margin: '0 auto',
  width: '100%',
};

const breadcrumbStyle: React.CSSProperties = {
  display: 'flex',
};

const topControlsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const backLinkStyle: React.CSSProperties = {
  color: 'var(--foreground-muted)',
  fontSize: '14px',
};

const pollingIndicatorContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const pulseIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const pulseDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: 'var(--primary)',
};

const manualRefreshButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12.5px',
};

const caseHeaderStyle: React.CSSProperties = {
  padding: '26px 30px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '20px',
};

const headerLeftSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const caseTitleStyle: React.CSSProperties = {
  fontSize: '25px',
  fontWeight: '800',
  color: 'var(--foreground)',
  letterSpacing: '-0.5px',
};

const caseIdStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--foreground-muted)',
  marginTop: '4px',
};

const headerFactsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '8px',
};

const headerFactChipStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--foreground)',
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  borderRadius: '999px',
  padding: '4px 12px',
};

const headerFactLabelStyle: React.CSSProperties = {
  color: 'var(--foreground-muted)',
  fontWeight: '600',
  marginRight: '6px',
};

const headerRightSectionStyle: React.CSSProperties = {
  display: 'flex',
  gap: '30px',
};

const headerMetricStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  alignItems: 'flex-start',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--foreground-muted)',
  fontWeight: '600',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '14.5px',
  fontWeight: '700',
  color: 'var(--foreground)',
};

const hitlPanelStyle: React.CSSProperties = {
  padding: '24px',
  borderColor: 'var(--risk-moderate)',
  background: 'rgba(184, 134, 46, 0.03)',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const hitlHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: '14px',
  alignItems: 'flex-start',
};

const hitlIconStyle: React.CSSProperties = {
  fontSize: '32px',
};

const hitlTitleStyle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: '700',
  color: 'var(--secondary)',
};

const hitlDescStyle: React.CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--foreground-muted)',
};

const hitlBodyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const hitlTaskCardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '13.5px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const hitlTaskMetaStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
};

const hitlTaskReasonStyle: React.CSSProperties = {
  color: 'var(--foreground)',
};

const hitlActionsContainerStyle: React.CSSProperties = {
  display: 'flex',
};

const resumeButtonStyle: React.CSSProperties = {
  background: 'var(--risk-moderate)',
  color: '#000',
  width: '100%',
  padding: '14px',
  fontWeight: '700',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(177, 52, 52, 0.1)',
  border: '1px solid rgba(177, 52, 52, 0.2)',
  color: 'var(--risk-very-high)',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
};

const heroCardStyle: React.CSSProperties = {
  padding: '28px 30px',
  border: '1px solid',
  borderRadius: 'var(--radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '800',
  letterSpacing: '-0.3px',
};

const heroReasonStyle: React.CSSProperties = {
  fontSize: '14.5px',
  color: 'var(--foreground-muted)',
  lineHeight: '1.5',
  maxWidth: '760px',
};

const heroScoreRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '28px',
  flexWrap: 'wrap',
};

const heroNoticeStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(184, 134, 46, 0.06)',
  border: '1px dashed rgba(184, 134, 46, 0.25)',
  fontSize: '12.5px',
  color: 'var(--foreground-muted)',
  lineHeight: '1.4',
};

const leftColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
};

const rightColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
};

const innerPanelStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const panelHeaderStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
  color: 'var(--foreground)',
};

const panelEmptyStyle: React.CSSProperties = {
  padding: '20px 0',
  color: 'var(--foreground-muted)',
  fontSize: '14px',
  textAlign: 'center',
};

const toggleButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '12.5px',
  fontWeight: '600',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const sectionToggleStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const verificationListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const verificationRowStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const verificationRowHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const verificationFieldLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: 'var(--foreground-muted)',
};

const verificationValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--foreground)',
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
};

const verificationSourceStyle: React.CSSProperties = {
  fontSize: '11.5px',
  color: 'var(--foreground-muted)',
};

const coverageGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
};

const coverageCardStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const coverageHeadStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const coverageCountStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--foreground-muted)',
};

const coverageStatsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
  gap: '8px',
  fontSize: '12px',
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '12px',
};

const pipelineTrackStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  justifyContent: 'space-between',
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '14px 12px',
  overflowX: 'auto',
};

const candidatesListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const candidateCardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid',
  borderRadius: 'var(--radius-sm)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const candidateCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const candidateNameStyle: React.CSSProperties = {
  fontSize: '14.5px',
  color: 'var(--foreground)',
};

const resolvedTagStyle: React.CSSProperties = {
  background: 'rgba(31, 138, 83, 0.1)',
  color: 'var(--risk-low)',
  border: '1px solid rgba(31, 138, 83, 0.2)',
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '8px',
  fontWeight: '600',
};

const candidateTagStyle: React.CSSProperties = {
  background: 'rgba(140, 136, 128, 0.15)',
  color: 'var(--foreground-muted)',
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '8px',
  fontWeight: '600',
};

const candidateGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  fontSize: '12.5px',
  color: 'var(--foreground-muted)',
};

const evidenceListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const evidenceCardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const evidenceCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const evidenceFieldStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: 'var(--primary)',
  textTransform: 'uppercase',
};

const officialSourceTagStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--risk-low)',
  fontWeight: '600',
};

const thirdPartySourceTagStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--foreground-muted)',
  fontWeight: '600',
};

const evidenceMetaGridStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '11.5px',
  color: 'var(--foreground-muted)',
  flexWrap: 'wrap',
  gap: '8px',
};

const scoreCircleStyle: React.CSSProperties = {
  width: '92px',
  height: '92px',
  borderRadius: '50%',
  background: 'var(--surface)',
  border: '1px solid var(--panel-border-strong)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const riskLevelInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const categoryBreakdownStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const subHeaderStyle: React.CSSProperties = {
  fontSize: '13.5px',
  fontWeight: '700',
  color: 'var(--foreground)',
};

const categoryGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const categoryBarItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '13px',
};

const categoryMetaStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
};

const categoryNameLabelStyle: React.CSSProperties = {
  textTransform: 'capitalize',
  color: 'var(--foreground-muted)',
};

const categoryBarBgStyle: React.CSSProperties = {
  height: '6px',
  background: 'var(--surface)',
  borderRadius: '3px',
  overflow: 'hidden',
};

const categoryBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '3px',
  transition: 'width 0.4s ease',
};

const signalsListContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginTop: '10px',
};

const signalsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const signalCardStyle: React.CSSProperties = {
  background: 'rgba(177, 52, 52, 0.02)',
  border: '1px solid rgba(177, 52, 52, 0.08)',
  borderRadius: 'var(--radius-sm)',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const signalCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '13.5px',
  color: 'var(--foreground)',
};

const signalDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--foreground-muted)',
  lineHeight: '1.4',
};

const reportPanelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
};

const versionSelectContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const selectVersionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--panel-border-strong)',
  padding: '6px 12px',
  fontSize: '12.5px',
};

const reportContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const reportMetaGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  fontSize: '12.5px',
  color: 'var(--foreground-muted)',
  background: 'var(--surface)',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
};

const reportSecHeaderStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: 'var(--foreground)',
  borderBottom: '1px solid var(--panel-border)',
  paddingBottom: '8px',
  marginBottom: '10px',
};

const reportTextCardStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: 'var(--foreground-muted)',
};

const reportFindingsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const findingCardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const findingCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13.5px',
  color: 'var(--foreground)',
};

const findingDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--foreground-muted)',
  lineHeight: '1.45',
};

const findingEvidenceListStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  fontSize: '12px',
  color: 'var(--foreground-muted)',
  flexWrap: 'wrap',
};

const evidenceTagStyle: React.CSSProperties = {
  background: 'rgba(107, 63, 160, 0.1)',
  border: '1px solid rgba(107, 63, 160, 0.2)',
  color: 'var(--primary)',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '11px',
};
