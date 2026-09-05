# BizRisk — Autonomous Business Due Diligence & Merchant Risk Agent

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/orchestration-LangGraph-FF6F00.svg)](https://github.com/langchain-ai/langgraph)
[![Next.js 16](https://img.shields.io/badge/frontend-Next.js%2016-black.svg)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org)
[![Tests](https://img.shields.io/badge/tests-917%20passed-brightgreen.svg)](file:///Users/akankshayadav/Desktop/BizRisk/backend/tests)

BizRisk is an autonomous merchant due diligence, business identity verification, and risk assessment platform. Built for payment gateways and risk teams, BizRisk automates pre-onboarding merchant investigations by combining multi-source web/registry research, entity resolution with statutory conflict guards, a deterministic multi-category risk engine, automated QA verification, and a live analyst workspace with human-in-the-loop (HITL) browser streaming.

---

## Table of Contents
1. [BizRisk Overview](#1-bizrisk-overview)
2. [Razorpay AI Risk Manager Track Fit](#2-razorpay-ai-risk-manager-track-fit)
3. [Architecture & LangGraph Workflow](#3-architecture--langgraph-workflow)
4. [Key Capabilities](#4-key-capabilities)
5. [Browser Research & Source Tiers](#5-browser-research--source-tiers)
6. [Entity Resolution & Statutory Identity Guards](#6-entity-resolution--statutory-identity-guards)
7. [Evidence Extraction & Validation](#7-evidence-extraction--validation)
8. [Deterministic Risk Engine & Decision Matrix](#8-deterministic-risk-engine--decision-matrix)
9. [Human-in-the-Loop (HITL) & Real-Time Streaming](#9-human-in-the-loop-hitl--real-time-streaming)
10. [Frontend & Analyst Workspace](#10-frontend--analyst-workspace)
11. [Evaluation & Benchmark Results](#11-evaluation--benchmark-results)
12. [Technology Stack](#12-technology-stack)
13. [Quickstart & Run Commands](#13-quickstart--run-commands)
14. [Testing & Verification](#14-testing--verification)
15. [Authentication & Security Scope](#15-authentication--security-scope)
16. [Known Technical Limitations](#16-known-technical-limitations)
17. [Demo Flow & Walkthrough](#17-demo-flow--walkthrough)

---

## 1. BizRisk Overview

Payment aggregators and financial institutions face severe chargeback exposure, compliance penalties, and bust-out fraud when onboarding unverified, dormant, or fraudulent merchant entities. Manual due diligence across fragmented government portals, corporate registries, and digital properties is slow, error-prone, and difficult to scale.

**BizRisk** automates this end-to-end investigation process:
- **Intake**: Accepts structured and semi-structured business identifiers (Legal Name, GSTIN, CIN, EPFO Code, Website, Location).
- **Multi-Source Research**: Autonomously plans and conducts parallel web research across government portals, corporate registries, and company websites.
- **Identity Reconciliation**: Discovers candidate entities, validates corporate links, and strictly flags conflicting statutory identifiers.
- **Deterministic Risk Scoring**: Evaluates audited risk rules across Identity, Compliance, Consistency, and Registration categories.
- **Automated QA & Reporting**: Runs multi-criteria QA loops to guarantee score-evidence alignment before synthesizing executive reports and merchant onboarding recommendations.

---

## 2. Razorpay AI Risk Manager Track Fit

BizRisk is specifically designed for the **Razorpay AI Risk Manager** track, focusing on **Pre-Onboarding Merchant Due Diligence, Identity Verification, and Entity Risk Intelligence**:

| Dimension | Razorpay AI Risk Manager Objective | BizRisk Implementation |
|---|---|---|
| **Merchant Verification** | Validate legitimacy of merchant legal identity before payment activation | Cross-verifies GST, MCA, EPFO, and web footprints with tiered authority scoring |
| **Synthetic/Shell Detection** | Catch fraudulent, dissolved, or conflicting business registrations | Hard statutory identifier conflict guards (`CONFLICTING_IDENTITY`) and `COMPANY_STATUS_ADVERSE` rules |
| **Audit-Traceable Scoring** | Explainable, non-hallucinatory risk ratings for risk analysts | 100% deterministic rule engine; LLM is restricted to narrative prose and advisory commentary |
| **Operational Efficiency** | Reduce manual review SLA without compromising precision | Parallel research dispatch, automated QA correction routing, and live remote browser interaction |

> **Scope Boundary**: BizRisk focuses on **merchant entity due diligence and pre-onboarding risk**. It does not perform transaction-level card fraud scoring or real-time payment authorization screening.

---

## 3. Architecture & LangGraph Workflow

BizRisk orchestrates its investigation pipeline as a stateful, cyclic directed graph using **LangGraph** (`StateGraph` in `backend/app/graph/workflow.py`):

```
                                  ┌─────────────────────────────┐
                                  │           intake            │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │          discovery          │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │           planner           │◄───────────────────────────┐
                                  └──────────────┬──────────────┘                            │
                                                 │                                           │
                                    (should_continue: tasks?)                                │
                                    ├─── Yes ───► [ browser ] ──► [ entity_resolution ] ────┘
                                    │                                    │
                                    └─── No / Max Depth ─────────────────┼───► [ risk_analysis ]
                                                                         │            │
                                                                         │            ▼
                                                                         │   [ report_generation ]
                                                                         │            │
                                                                         │            ▼
                                                                         │         [ qa ]
                                                                         │            │ (should_continue_after_qa)
                                                                         │            ├── PASS / Max Loops ──► [ END ]
                                                                         └────────────┼── WRONG_ENTITY ──────► [ entity_resolution ]
                                                                                      ├── MISSING_EVIDENCE ──► [ planner ]
                                                                                      ├── WRONG_RISK_SCORE ──► [ risk_analysis ]
                                                                                      └── REPORT_WORDING ────► [ report_generation ]
```

### Graph Node Breakdown
1. **`intake`**: Normalizes input identifiers (GSTIN, CIN, EPFO, Legal Name, Location, Website) and records `identifier_provenance` (`intake_user_provided`).
2. **`discovery`**: Generates baseline candidate entities (`intake_echo` tagged with claimed identity) and extracts discovery leads.
3. **`planner`**: Evaluates accumulated findings to dynamically schedule typed `ResearchTask`s across relevant sources with priority weighting.
4. **`browser`**: Executes research tasks in parallel via `ThreadPoolExecutor`, fetching live web pages via Playwright or direct HTTP, checking entity relevance, and storing `Evidence` records.
5. **`entity_resolution`**: Performs token similarity math, sector keyword filtering, and hard statutory identifier matching across candidate entities.
6. **`risk_analysis`**: Evaluates deterministic risk rules over validated evidence and aggregates category-specific and overall risk scores.
7. **`report_generation`**: Synthesizes the structured report, source rollup statuses, executive summaries, and multi-version history.
8. **`qa`**: Automated validation verifying score alignment, required fields, and absence of contradictory or forbidden claims. Routes dynamically on failure (`max_qa_loops` limit enforced).

### Execution Guardrails & Cost Limits
Configured in `backend/app/core/tracking.py` and `.env`:
- `MAX_RESEARCH_DEPTH` (default: `3` loops)
- `MAX_QA_LOOPS` (default: `2` correction loops)
- `MAX_BROWSER_ACTIONS` (default: `20` actions)
- `MAX_RESEARCH_TASKS` (default: `15` tasks)
- `MAX_LLM_CALLS` (default: `50` calls)
- `TOKEN_BUDGET` (default: `100,000` tokens)

---

## 4. Key Capabilities

- **Tiered Multi-Source Research**: Orchestrates statutory government portals, company websites, third-party corporate registries, and general search.
- **Identity Conflict Protection**: Hard statutory identifier guards immediately flag conflicting GSTIN/CIN records, preventing synthetic identity takeover.
- **100% Deterministic Risk Engine**: Audit-traceable rule evaluation with configurable weights, category scoring, and evidence sufficiency gates.
- **Deterministic Merchant Onboarding Decisions**: Rule-derived decisions (`APPROVE`, `APPROVE_WITH_MONITORING`, `MANUAL_REVIEW`, `REJECT_OR_ESCALATE`).
- **Human-in-the-Loop (HITL) Remote Browser Canvas**: Live streaming of browser challenges/CAPTCHAs with remote coordinate clicking, keyboard typing, and workflow resumption.
- **Real-Time Analyst Workspace**: Server-Sent Events (SSE) investigation stream, interactive graph progress, multi-version report history, and JSON/CSV exports.

---

## 5. Browser Research & Source Tiers

Research tasks are coordinated by `BrowserResearchAgent` (`backend/app/agents/browser.py`) against registered sources in `backend/app/research/source_registry.py`:

| Tier | Source Category | Providers / Sources | Authority Tier | Default Confidence |
|---|---|---|---|---|
| **Tier 1** | **Official Government Portals** | `gst.gov.in` (GST Portal)<br>`mca.gov.in` (MCA Portal)<br>`epfindia.gov.in` (EPFO Portal) | Tier 1 | 0.90 – 0.95 |
| **Tier 2** | **Official Merchant Domain** | `company_website` (heuristic domain & page extraction) | Tier 2 | 0.85 |
| **Tier 3** | **Third-Party Registries & Aggregators** | `quickcompany.in`<br>`tofler.in`<br>`zaubacorp.com`<br>`instafinancials.com`<br>`falconebiz.com` | Tier 3 | 0.75 – 0.80 |
| **Tier 4** | **General Web Search** | `generic_web` (search engine querying & link parsing) | Tier 4 | 0.50 – 0.60 |

### Research Mechanisms
- **Concurrent Dispatch**: Parallel execution across sources using `ThreadPoolExecutor`.
- **Dual Fetch Strategy**: Direct HTTP (`http_fetch_direct` in `base.py`) with headers and timeouts for speed, coupled with Playwright (`browser_session_manager.py`) for live browser sessions.
- **Directory Link Discovery**: Parses search results on third-party registry directories (e.g. QuickCompany/Tofler), scores candidate URLs, and navigates to the matching profile URL.
- **Entity Relationship Gating**: Classifies fetched pages (`TARGET_ENTITY`, `RELATED_ENTITY`, `UNRELATED`, `COMPETITOR`). Pages with conflicting identity verdicts are rejected prior to factual evidence persistence.
- **Evidence Freshness Caching**: Reuses unexpired source evidence (`get_cached_source_result`) to eliminate redundant external HTTP requests.

---

## 6. Entity Resolution & Statutory Identity Guards

Implemented in `backend/app/entity_resolution/` (`resolver.py`, `scoring.py`, `normalization.py`, `matcher.py`):

1. **Text Normalization**: Strips corporate entity suffixes (`PVT`, `LTD`, `LIMITED`, `LLP`, `CORP`, `INC`, `CO`, `ESTABLISHMENT`) and cleans punctuation and whitespace.
2. **Sector Incompatibility Protection**: Evaluates sector keywords (`pharma`, `hospital`, `resort`, `motors`, `school`, `casino`, `restaurant`). If candidate and target possess incompatible sector tokens, similarity drops to 0.0.
3. **Composite Similarity Scoring**:
   - Token-based F1 precision/recall scoring for name similarity.
   - Field weights: Name (0.40), Location (0.15), Address (0.15), Website (0.10), GSTIN (0.10), CIN (0.10).
4. **Hard Statutory Identity Guards**:
   - Matching GSTIN or CIN produces `EXACT_MATCH` (confidence 1.0).
   - Conflicting statutory identifiers (candidate carries a different GSTIN or CIN than the target) **strictly triggers `CONFLICTING_IDENTITY`**. A matching business name or website can never override conflicting statutory IDs.
5. **Resolution Statuses**:
   - `RESOLVED_EXACT` (1.0 confidence)
   - `RESOLVED_FUZZY` (confidence >= threshold, default `0.75`)
   - `CONFLICTING_IDENTITY` (conflicting statutory identifier detected)
   - `ENTITY_UNRESOLVED` / `NO_MATCH`

---

## 7. Evidence Extraction & Validation

Implemented across `backend/app/research/base.py` and `backend/app/validation/research.py`:

- **Structured Field Extractors**: Regex and DOM parsers extract Legal Name, GST Status (`Active`/`Cancelled`/`Suspended`), MCA Status (`Active`/`Struck Off`/`Under Liquidation`/`Dissolved`), EPFO Establishment Status, Registration Dates, Registered Addresses, and Business Activity taxonomy.
- **Prompt Injection Sanitization**: Strips malicious prompt injection and script payloads from untrusted public web text (`sanitize_prompt_injection`).
- **Semantic Validation**: Rejects empty values, invalid URLs, and placeholder indicators (`NOT_FOUND`, `UNAVAILABLE`, `NONE`, `BLOCKED`). Requires confidence > 0.0 for factual admission.
- **Evidence Reconciliation (`_reconcile_selected_as_evidence`)**: Post-processes browser attempt logs in PostgreSQL to ensure browser session diagnostics strictly reflect final persisted evidence.

---

## 8. Deterministic Risk Engine & Decision Matrix

Implemented in `backend/app/risk/engine.py`, `backend/app/risk/rules.py`, and configured via `backend/app/risk/config.yaml`.

### Deterministic Risk Rules
| Rule Code | Category | Severity | Weight | Trigger Condition |
|---|---|---|---|---|
| `COMPANY_STATUS_ADVERSE` | Compliance | HIGH | **35** | MCA registration status indicates entity is struck off, under liquidation, dissolved, or dormant. |
| `GST_INACTIVE` | Compliance | HIGH | **30** | GST registration is cancelled, inactive, or suspended. |
| `LEGAL_NAME_CONFLICT` | Identity | HIGH | **25** | Discrepancy between legal names across authoritative sources. |
| `ADDRESS_MAJOR_MISMATCH` | Consistency | MEDIUM | **10** | Registered addresses diverge significantly across sources. |
| `BUSINESS_ACTIVITY_MISMATCH` | Consistency | MEDIUM | **10** | Declared business activities conflict across sources. |
| `VERY_RECENT_REGISTRATION` | Registration | LOW | **5** | Business registration age is less than 1 year. |

### Minimum Evidence Sufficiency Gate
- Requires at least one substantive, verified factual evidence record (confidence >= 0.70 or status `VERIFIED`).
- Low-information availability flags (`mca_status`, `epfo_status`, `website_status`) do **not** satisfy sufficiency on their own.
- If insufficient evidence exists, the engine outputs `risk_level = "INSUFFICIENT_EVIDENCE"` with `score = None`.

### Risk Score & Level Calculation
$$\text{Overall Risk Score} = \min\left(\sum \text{Active Rule Weights}, 100\right)$$

- **`LOW`**: 0 – 30
- **`MODERATE`**: 31 – 60
- **`HIGH`**: 61 – 80
- **`VERY_HIGH`**: 81 – 100
- **`INSUFFICIENT_EVIDENCE`**: Unscored

### Deterministic Merchant Onboarding Decision Matrix
Derived in `backend/app/services/report.py`:
- `LOW` -> **`APPROVE`**
- `MODERATE` -> **`APPROVE_WITH_MONITORING`**
- `HIGH` -> **`MANUAL_REVIEW`**
- `VERY_HIGH` -> **`REJECT_OR_ESCALATE`**
- `INSUFFICIENT_EVIDENCE` -> **`MANUAL_REVIEW`**
- `CONFLICTING_IDENTITY` (statutory ID conflict) -> **`MANUAL_REVIEW`**

### Role of LLM in Decisioning
`backend/app/core/llm.py` provides provider abstraction (`mock` and `anthropic`):
- **Where LLM is used**: Optional candidate entity suggestions from unstructured text, executive summary narrative prose, and advisory QA commentary.
- **Where LLM is NEVER used**: Numeric risk scores, risk levels, entity match confidence, QA pass/fail gates, and merchant onboarding decisions are **100% deterministic code**.

---

## 9. Human-in-the-Loop (HITL) & Real-Time Streaming

Located in `backend/app/core/browser_session_manager.py` and `backend/app/api/investigations.py`:

```
[ Research Encounters Bot Check / CAPTCHA ]
                       │
                       ▼
[ Graph State -> WAITING_FOR_USER / HUMAN_INTERVENTION_REQUIRED ]
                       │
                       ▼
[ Playwright Session Kept Alive in Dedicated Worker Thread ]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ GET /tasks/{id}/screenshot ]   [ POST /tasks/{id}/click, /type, /clear ]
(Live PNG Canvas in Frontend)    (Remote Interactive Actions Dispatched)
                       │
                       ▼
         [ POST /tasks/{id}/human-intervention ]
         [ POST /api/v1/investigations/{id}/resume ]
                       │
                       ▼
         [ LangGraph Workflow Resumes ]
```

- **Server-Sent Events (SSE)**: `GET /api/v1/investigations/{id}/events/stream` streams live audit log events and node step updates directly to the frontend workspace.

---

## 10. Frontend & Analyst Workspace

Built with **Next.js 16 (App Router)** and **React 19** in `frontend/`:

- **`/` (Public Landing Page - `LandingPage.tsx`)**: Product overview, interactive architecture diagrams, entity resolution simulator, and feature walkthroughs.
- **`/dashboard` (Dashboard - `dashboard/page.tsx`)**: Investigation history, incomplete investigation tracking for crash recovery, and summary KPI metrics (Total, Approved, Manual Review, High Risk).
- **`/investigate` (Intake Form - `investigate/page.tsx`)**: Clean multi-identifier intake form with client-side validation.
- **`/investigations/[id]` (Investigation Workspace - `investigations/[id]/page.tsx`)**:
  - Live progress stepper and SSE event log timeline.
  - Interactive HITL Browser Canvas with coordinate clicking and remote typing.
  - Tabulated evidence ledger with authority tiers, source links, and confidence bars.
  - Risk Intelligence breakdown with category gauges and active signal cards.
  - Entity Resolution tab showing candidate comparisons and match verdicts.
  - Historical report version switcher with markdown rendering.
  - One-click JSON, CSV, and debug exports.

---

## 11. Evaluation & Benchmark Results

Located in `backend/evaluation/` (`run_evaluation.py`, `dataset.py`, `results.json`) and validated in `backend/tests/test_merchant_verification_evaluation.py`:

The evaluation harness feeds 16 hand-labelled synthetic cases directly into the unmodified Entity Resolution, Risk Engine, and Report Decision pipeline (`generate_investigation_report`), comparing results against ground truth:

```
========================================================================================
MERCHANT/BUSINESS VERIFICATION EVALUATION
========================================================================================
Case  Ground Truth  Predicted   Risk Level Decision              Correct?
----------------------------------------------------------------------------------------
L1    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L2    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L3    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L4    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L5    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L6    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L7    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
L8    LEGITIMATE    LEGITIMATE  LOW        APPROVE               YES
S1    SUSPICIOUS    SUSPICIOUS  MODERATE   APPROVE_WITH_MONITORING YES
S2    SUSPICIOUS    LEGITIMATE  LOW        APPROVE               no
S3    SUSPICIOUS    LEGITIMATE  LOW        APPROVE               no
S4    SUSPICIOUS    LEGITIMATE  LOW        APPROVE               no
S5    SUSPICIOUS    SUSPICIOUS  MODERATE   APPROVE_WITH_MONITORING YES
S6    SUSPICIOUS    SUSPICIOUS  MODERATE   APPROVE_WITH_MONITORING YES
S7    SUSPICIOUS    SUSPICIOUS  VERY_HIGH  REJECT_OR_ESCALATE    YES
S8    SUSPICIOUS    SUSPICIOUS  LOW        MANUAL_REVIEW         YES
----------------------------------------------------------------------------------------
Cases: 16 (8 Legitimate, 8 Suspicious)
TP=5  TN=8  FP=0  FN=3
Precision (positive class = SUSPICIOUS): 1.000 (100%)
Recall    (positive class = SUSPICIOUS): 0.625 (62.5%)
False-positive cost: 0 cost units (0 FP x 1 cost unit/FP)
========================================================================================
```

### Evaluation Analysis & Scope
- **Why False Negatives Occur (3 FN)**: Single isolated signals such as `LEGAL_NAME_CONFLICT` (weight 25) or `GST_INACTIVE` (weight 30) individually total <= 30 points, placing them in the `LOW` risk band (0–30 -> `APPROVE`). Compounding signals (e.g. `S5`=60, `S6`=45, `S7`=90, `S8`=`CONFLICTING_IDENTITY`) elevate the risk level to `MODERATE`, `HIGH`, `VERY_HIGH`, or trigger `MANUAL_REVIEW`.
- **False-Positive Cost**: A documented bookkeeping assumption (1 cost unit per FP), **not** a monetary loss estimate.
- **Evaluation Disclaimer**: This is a small, reproducible synthetic benchmark (n=16) evaluating deterministic decision logic on structured evidence. It does not measure live web scraping uptime or real-world accuracy across external portals.

---

## 12. Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+) with Uvicorn
- **Agent Orchestration**: LangGraph (`StateGraph`), Pydantic v2
- **Database & ORM**: PostgreSQL 16, SQLAlchemy 2.0, Alembic
- **Browser Automation**: Playwright (Chromium)
- **LLM SDK**: Anthropic Python SDK (Structured JSON Schema output)
- **Testing**: Pytest (917 tests)

### Frontend
- **Framework**: Next.js 16.3.3 (App Router), React 19.2.8
- **Language**: TypeScript 5
- **Icons & Styling**: Lucide React, Vanilla CSS Glassmorphism Design System

---

## 13. Quickstart & Run Commands

### Prerequisites
- Docker (for PostgreSQL)
- Python 3.11+
- Node.js 18+

### Step 1: Start PostgreSQL Database
```bash
docker compose up -d db
```

### Step 2: Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Health Check: `curl http://127.0.0.1:8000/health`
- Swagger OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
- Frontend Web App: `http://localhost:3000`

---

## 14. Testing & Verification

### Run Backend Pytest Suite
```bash
# From repository root
PYTHONPATH=. pytest backend/tests -q
```
*Current status: **917 passed** with 0 errors.*

### Run Evaluation Benchmark
```bash
cd backend
python -m evaluation.run_evaluation
```

### Run Frontend Tests
```bash
cd frontend
npm test
npm run tsc
```

---

## 15. Authentication & Security Scope

- **Authorization Header**: Requires `Authorization: Bearer <user_id>`.
- **User Scoping & Isolation** (`backend/app/api/auth.py`): The bearer token string is used directly as the `user_id`. `get_owned_investigation` enforces per-user tenant isolation across all endpoints, returning 404 for unowned investigations (tested in `test_security_user_isolation.py`).
- **Test Endpoints**: The unauthenticated `/api/v1/test/*` endpoints are gated by `ENABLE_TEST_ENDPOINTS` (enforced `false` in production).
- **Scope Note**: The token is an opaque identifier; cryptographic JWT validation and OAuth2/SSO flows are omitted for simplicity.

---

## 16. Known Technical Limitations

1. **In-Process Background Execution**: Investigations execute inside the FastAPI server process via `BackgroundTasks`. A server restart leaves in-flight investigations at a non-terminal status (recoverable via `POST /api/v1/investigations/{id}/resume` or `GET /api/v1/investigations/incomplete`).
2. **Live Government Portals**: Direct HTTP access to `services.gst.gov.in`, `mca.gov.in`, and `epfindia.gov.in` frequently encounters CAPTCHAs, bot blocks, or dynamic session tokens; production runs rely on third-party registries (`quickcompany.in`, `tofler.in`, `zaubacorp.com`) or HITL solver intervention.
3. **Unused Infrastructure Components**: `REDIS_URL` in `.env.example`, the Redis container in `docker-compose.yml`, and `backend/worker/` are placeholders.
4. **LLM Provider Implementations**: Concrete SDK integration is implemented for `mock` and `anthropic`. OpenAI and Gemini raise provider exceptions if configured without mock mode.

---

## 17. Demo Flow & Walkthrough

Two primary scenarios demonstrate the platform end-to-end via the UI (`/investigate` -> `/investigations/[id]`):

### Scenario 1: Clean / Legitimate Merchant
1. Navigate to `/investigate`.
2. Enter business name and valid GSTIN/CIN (e.g. active corporate records where legal name, address, and status agree across sources).
3. Observe live graph progress: `intake` -> `discovery` -> `planner` -> `browser` -> `entity_resolution` -> `risk_analysis` -> `report_generation` -> `qa`.
4. **Expected Outcome**: `risk_level: LOW`, `risk_score: 0`, and `merchant_decision: APPROVE`.

### Scenario 2: Conflicting / Adverse Merchant Evidence
1. Navigate to `/investigate`.
2. Enter a business with conflicting statutory identifiers, adverse status (struck off / dissolved), or mismatched legal names across sources.
3. Observe the entity resolution tab flagging statutory discrepancy or risk signals triggering in compliance/identity categories.
4. **Expected Outcome**:
   - Single moderate signal -> `merchant_decision: MANUAL_REVIEW` or `APPROVE_WITH_MONITORING`.
   - Multiple compounding signals -> `risk_level: VERY_HIGH`, `merchant_decision: REJECT_OR_ESCALATE`.
   - Conflicting statutory IDs -> `resolution_status: CONFLICTING_IDENTITY`, `merchant_decision: MANUAL_REVIEW`.

*For offline deterministic demonstration, execute `python -m evaluation.run_evaluation` in `backend/` to run all 16 benchmark cases against the complete decision pipeline.*
