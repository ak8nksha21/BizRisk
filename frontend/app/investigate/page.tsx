'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, APIError } from '../../lib/api';

const WORKFLOW_STEPS = ['Research', 'Validate Evidence', 'Resolve Identity', 'Assess Risk', 'Make Decision'];

export default function Investigate() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    business_name: '',
    gstin: '',
    cin: '',
    website: '',
    location: '',
    additional_information: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { business_name, gstin, cin, website } = formData;
    if (!business_name.trim() && !gstin.trim() && !cin.trim() && !website.trim()) {
      setError('Please provide at least one key identifier: Company Name, GSTIN, CIN, or Website.');
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, string> = {};

      // Only attach non-empty fields
      Object.entries(formData).forEach(([key, val]) => {
        if (val.trim()) {
          payload[key] = val.trim();
        }
      });

      const res = await api.createInvestigation(payload);
      router.push(`/investigations/${res.id}`);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to initiate investigation. Please verify connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <header style={topHeaderStyle}>
        <div>
          <span className="eyebrow">Merchant Verification</span>
          <h1 style={pageTitleStyle}>New Investigation</h1>
        </div>
        <Link href="/dashboard" style={backLinkStyle}>← Back to Dashboard</Link>
      </header>

      <div style={contentStyle}>
        {/* Workflow explainer */}
        <div className="glass-panel" style={workflowCardStyle}>
          {WORKFLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step}>
              <div style={workflowStepStyle}>
                <span style={workflowStepNumStyle}>{idx + 1}</span>
                <span style={workflowStepLabelStyle}>{step}</span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && <span style={workflowArrowStyle}>→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="glass-panel" style={formCardStyle}>
          <div style={formHeaderStyle}>
            <h2 style={formTitleStyle}>Merchant / Legal Entity Details</h2>
            <p style={formSubtitleStyle}>Provide known identifiers to verify business legitimacy and detect suspicious or conflicting identity information before it causes merchant losses.</p>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="business_name">Merchant / Legal Entity Name</label>
              <input
                id="business_name"
                name="business_name"
                type="text"
                placeholder="e.g. ABC Foods Private Limited"
                value={formData.business_name}
                onChange={handleChange}
              />
            </div>

            <div style={rowStyle}>
              <div style={colStyle}>
                <label style={labelStyle} htmlFor="gstin">GSTIN</label>
                <input
                  id="gstin"
                  name="gstin"
                  type="text"
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={formData.gstin}
                  onChange={handleChange}
                />
              </div>
              <div style={colStyle}>
                <label style={labelStyle} htmlFor="cin">CIN</label>
                <input
                  id="cin"
                  name="cin"
                  type="text"
                  placeholder="e.g. L12345MH2020PLC000001"
                  value={formData.cin}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={rowStyle}>
              <div style={colStyle}>
                <label style={labelStyle} htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  placeholder="e.g. abcfoods.in"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
              <div style={colStyle}>
                <label style={labelStyle} htmlFor="location">Location</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g. Noida, Uttar Pradesh"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle} htmlFor="additional_information">Additional Corporate Context</label>
              <textarea
                id="additional_information"
                name="additional_information"
                rows={3}
                placeholder="Provide any extra details like registered addresses, keywords, or background information..."
                value={formData.additional_information}
                onChange={handleChange}
                style={textareaStyle}
              />
            </div>

            <div style={buttonContainerStyle}>
              <Link href="/dashboard" style={{ flex: 1 }}>
                <button type="button" className="btn-ghost" style={cancelButtonStyle}>Cancel</button>
              </Link>
              <button type="submit" disabled={loading} style={submitButtonStyle}>
                {loading ? 'Starting Investigation…' : 'Start Investigation'}
              </button>
            </div>
          </form>
        </div>
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

const backLinkStyle: React.CSSProperties = {
  color: 'var(--foreground-muted)',
  fontSize: '14px',
  fontWeight: '600',
};

const contentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '32px 36px',
  maxWidth: '760px',
  margin: '0 auto',
  width: '100%',
};

const workflowCardStyle: React.CSSProperties = {
  padding: '18px 22px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '6px',
};

const workflowStepStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const workflowStepNumStyle: React.CSSProperties = {
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  background: 'var(--primary-tint)',
  color: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  fontWeight: '800',
  flexShrink: 0,
};

const workflowStepLabelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: '700',
  color: 'var(--foreground)',
  whiteSpace: 'nowrap',
};

const workflowArrowStyle: React.CSSProperties = {
  color: 'var(--foreground-subtle)',
  fontSize: '13px',
  padding: '0 4px',
};

const formCardStyle: React.CSSProperties = {
  padding: '36px',
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
};

const formHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const formTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '800',
  letterSpacing: '-0.3px',
};

const formSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--foreground-muted)',
  lineHeight: 1.5,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--foreground-muted)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  flexWrap: 'wrap',
};

const colStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '240px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const textareaStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  resize: 'vertical',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(177, 52, 52, 0.08)',
  border: '1px solid rgba(177, 52, 52, 0.2)',
  color: 'var(--risk-very-high)',
  padding: '16px',
  borderRadius: '8px',
  fontSize: '14px',
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginTop: '4px',
};

const cancelButtonStyle: React.CSSProperties = {
  width: '100%',
};

const submitButtonStyle: React.CSSProperties = {
  flex: 2,
};
