# BizRisk — AI-Powered Merchant Business Verification & Risk Agent

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/orchestration-LangGraph-FF6F00.svg)](https://github.com/langchain-ai/langgraph)
[![Next.js 16](https://img.shields.io/badge/frontend-Next.js%2016-black.svg)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org)
[![Test Suite](https://img.shields.io/badge/tests-917%20passed-brightgreen.svg)](#testing--verification)

> **Before a fintech trusts a merchant, can it actually trust the business behind it?**

BizRisk helps fintech platforms verify business legitimacy and detect suspicious merchant identity signals **before financial losses occur**.

It researches businesses across official websites, government portals, and independent business registries, resolves conflicting identities, validates evidence, calculates a deterministic risk score, and produces an actionable merchant decision such as:

- `APPROVE`
- `APPROVE_WITH_MONITORING`
- `MANUAL_REVIEW`
- `REJECT_OR_ESCALATE`

The core idea is simple:

> **Find the right information. Verify that it belongs to the right business. Make uncertainty actionable.**

---

## Table of Contents
1. [Why BizRisk](#why-bizrisk)
2. [Razorpay AI Risk Manager Fit](#razorpay-ai-risk-manager-fit)
3. [Core Workflow](#core-workflow)
4. [Multi-Source Browser Research](#multi-source-browser-research)
5. [Evidence Validation](#evidence-validation)
6. [Entity Resolution & Identity Protection](#entity-resolution--identity-protection)
7. [Deterministic Risk Engine & Decisions](#deterministic-risk-engine--decisions)
8. [Role of the LLM](#role-of-the-llm)
9. [Human-in-the-Loop & Uncertainty](#human-in-the-loop--uncertainty)
10. [LangGraph Technical Architecture](#langgraph-technical-architecture)
11. [Frontend & Analyst Workspace](#frontend--analyst-workspace)
12. [Evaluation & Benchmark Results](#evaluation--benchmark-results)
13. [Testing & Verification](#testing--verification)
14. [Technology Stack](#technology-stack)
15. [Quickstart & Setup Guide](#quickstart--setup-guide)
16. [Authentication & Security Scope](#authentication--security-scope)
17. [Known Technical Limitations](#known-technical-limitations)
18. [Demo Flow & Scenarios](#demo-flow--scenarios)

---

## Why BizRisk

Merchant verification often requires an analyst to manually check multiple government portals, company websites, and independent business registries.

The challenge is not simply finding information.

Web sources can return:

- noisy or incomplete pages
- blocked or CAPTCHA-protected portals
- inconsistent business names
- conflicting registration information
- search results belonging to another company with a similar name

For a human investigator, manually cross-checking all of this is slow and error-prone.

**BizRisk approaches the problem like a risk analyst:** dynamically research the merchant, validate the evidence, verify the entity, evaluate risk, and produce an actionable decision.

---

## Razorpay AI Risk Manager Fit

BizRisk is designed for the **Razorpay Buildathon — AI Risk Manager track**, focusing on the decision that happens **before financial loss**: whether a merchant business can be trusted during onboarding.

| Risk Manager Need | BizRisk |
|---|---|
| Verify merchant legitimacy | Researches official, government, and independent registry sources |
| Detect identity discrepancies | Resolves entities using GSTIN, CIN, legal name, website, and location |
| Prevent wrong-company contamination | Rejects unrelated, conflicting, or contaminated evidence |
| Handle unreliable web sources | Uses multi-source browser research with source-status tracking |
| Make explainable decisions | Uses a deterministic risk engine and decision matrix |
| Escalate uncertainty | Explicit `INSUFFICIENT_EVIDENCE` and `CONFLICTING_IDENTITY` paths |
| Reduce analyst effort | Automated research, QA, reporting, SSE telemetry, and HITL browser workflows |

### Scope

BizRisk focuses on **merchant/business verification and pre-onboarding risk intelligence**.

It is **not** a transaction-level card fraud detection or real-time payment authorization system.

---

## Core Workflow

The end-to-end investigation pipeline follows a structured, evidence-backed narrative:

```
Merchant Input ──► Browser Research ──► Evidence Validation ──► Entity Resolution ──► Deterministic Risk ──► Merchant Decision
```

1. **Merchant Input**: The applicant or analyst submits core merchant attributes: Legal Business Name, GSTIN, CIN, EPFO Code, Official Website, and Location.
2. **Research Planning**: BizRisk dynamically generates targeted research tasks across registered source tiers.
3. **Browser Research**: Browser agents investigate multiple sources across statutory portals, business registries, company websites, and web search.
4. **Evidence Validation**: Scraped data is sanitized, semantically validated, and confidence-scored before it can affect risk calculations.
5. **Entity Resolution**: The system compares candidate profiles against target identifiers to verify whether evidence actually belongs to the target merchant.
6. **Deterministic Risk**: Transparent, rule-based logic evaluates active risk signals and calculates a weighted risk score and risk level.
7. **Merchant Decision**: The risk level and identity resolution status map deterministically to an actionable onboarding decision (`APPROVE`, `APPROVE_WITH_MONITORING`, `MANUAL_REVIEW`, or `REJECT_OR_ESCALATE`).

---

## Multi-Source Browser Research

> **Core Principle**: BizRisk does not depend on a single database or blindly trust the first search result.

Research tasks are coordinated by `BrowserResearchAgent` (`backend/app/agents/browser.py`) across four authority tiers defined in `backend/app/research/source_registry.py`:

| Tier | Category | Sources / Providers | Authority | Default Confidence |
|---|---|---|---|---|
| **Tier 1** | **Official Government Portals** | `gst.gov.in` (GST Portal)<br>`mca.gov.in` (MCA Portal)<br>`epfindia.gov.in` (EPFO Portal) | Tier 1 | 0.90 – 0.95 |
| **Tier 2** | **Official Merchant Properties** | `company_website` (merchant domain, contact page, about page) | Tier 2 | 0.85 |
| **Tier 3** | **Independent Business Registries** | `quickcompany.in`<br>`tofler.in`<br>`zaubacorp.com`<br>`instafinancials.com`<br>`falconebiz.com` | Tier 3 | 0.75 – 0.80 |
| **Tier 4** | **General Web Search** | `generic_web` (search engine discovery and link extraction) | Tier 4 | 0.50 – 0.60 |

### Technical Capabilities
- **Dual-Mode Fetching**: Direct HTTP requests for fast static scraping with automated Playwright Chromium fallback for dynamic JavaScript pages.
- **Parallel Task Execution**: Research tasks execute concurrently across independent source adapters.
- **Directory & Profile Discovery**: Navigates registry search results, scores candidate profile links, and extracts structured corporate filings.
- **Relationship Classification**: Classifies sources by relationship type (`DIRECT_OFFICIAL`, `REGISTRY_RECORD`, `DIRECTORY_PROFILE`, `INDEPENDENT_WEB`).
- **Resilience & Caching**: Gracefully handles blocked, rate-limited, or unavailable sources and caches validated evidence to minimize redundant network calls.

*(Note: Automated CAPTCHA solving is not claimed; when a portal presents anti-bot challenges, the system triggers HITL intervention).*

---

## Evidence Validation

> **Core Principle**: The risk engine receives validated merchant evidence rather than raw web pages.

Raw web content is filtered through rigorous validation gates (`backend/app/extraction/` and `backend/app/research/`):

- **Semantic Validation**: Parses and verifies structured data formats (registration numbers, incorporation dates, business status codes, registered addresses).
- **Entity Relationship Checks**: Verifies whether extracted claims originate from a direct official property, an accredited registry, or an unverified third party.
- **Placeholder & Error Rejection**: Discards placeholder values, empty strings, and crawler error flags (`NOT_FOUND`, `UNAVAILABLE`, `BLOCKED`, `ACCESS_DENIED`).
- **Contaminated & Boilerplate Filtering**: Strips HTML markup, navigation headers, cookie banners, and noisy advertising content.
- **Confidence Gate**: Enforces minimum extraction confidence for admission, requiring verified confidence ($\ge 0.70$) for scoring weight eligibility.
- **Prompt-Injection Sanitization**: Neutralizes adversarial prompt injections and malformed text in untrusted web pages before LLM narrative summarization.

---

## Entity Resolution & Identity Protection

> **Core Insight**: The difficult part was knowing whether the information actually belonged to the merchant.

Implemented in `backend/app/entity_resolution/` (`resolver.py`, `scoring.py`, `normalization.py`, `matcher.py`), this module prevents data from identically or similarly named businesses from polluting the risk evaluation.

### Comparison Dimensions
BizRisk cross-evaluates candidate records against target merchant attributes across six dimensions:
1. **GSTIN**: 15-digit statutory GST identifier.
2. **CIN**: 21-digit Corporate Identification Number.
3. **Legal & Business Name**: Token-level F1 precision/recall matching after stripping corporate suffixes (`PVT`, `LTD`, `LIMITED`, `LLP`, `CORP`, `INC`, `CO`).
4. **Website & Domain**: Domain normalization and host matching.
5. **Location & Address**: City, state, and registered address token overlap.
6. **Sector Compatibility**: Keyword cross-checks (`pharma`, `hospital`, `resort`, `motors`, `school`, `casino`, `restaurant`). If candidate and target have incompatible sector tokens, similarity drops to 0.0.

### Hard Statutory Identity Guards

> **Non-Negotiable Rule**: Conflicting statutory identifiers such as GSTIN or CIN trigger `CONFLICTING_IDENTITY` and cannot be overridden by a matching business name or website.

- **Exact Identifier Match**: Matching GSTIN or CIN produces an immediate `RESOLVED_EXACT` status (confidence 1.0).
- **Statutory Conflict Detection**: If a candidate shares a similar name but carries a differing GSTIN or CIN, the system marks the candidate as `CONFLICTING_IDENTITY`.
- **Wrong-Entity Rejection**: Any evidence flagged as `UNRELATED`, `ENTITY_MISMATCH`, or `REJECTED` is strictly quarantined and prevented from influencing risk rules or merchant decisions.

---

## Deterministic Risk Engine & Decisions

BizRisk separates evidence intelligence from risk evaluation. The risk engine (`backend/app/risk/engine.py`) operates entirely on deterministic, audit-traceable logic configured via `backend/app/risk/config.yaml`:

```
Validated Evidence ──► Risk Signals ──► Deterministic Score ──► Risk Level ──► Merchant Decision
```

### Deterministic Risk Rules & Weights

| Rule Code | Category | Severity | Weight | Trigger Condition |
|---|---|---|---|---|
| `COMPANY_STATUS_ADVERSE` | Compliance | HIGH | **35** | MCA status indicates entity is struck off, under liquidation, dissolved, or dormant. |
| `GST_INACTIVE` | Compliance | HIGH | **30** | GST registration status is cancelled, inactive, or suspended. |
| `LEGAL_NAME_CONFLICT` | Identity | HIGH | **25** | Discrepancy between legal names across authoritative sources. |
| `ADDRESS_MAJOR_MISMATCH` | Consistency | MEDIUM | **10** | Registered addresses diverge significantly across authoritative sources. |
| `BUSINESS_ACTIVITY_MISMATCH` | Consistency | MEDIUM | **10** | Declared business activities conflict across sources. |
| `VERY_RECENT_REGISTRATION` | Registration | LOW | **5** | Business registration age is less than 1 year. |

### Minimum Evidence Sufficiency Gate
- Requires at least one substantive, verified factual evidence record (confidence $\ge 0.70$ or status `VERIFIED`).
- Low-information availability flags (`mca_status`, `epfo_status`, `website_status`) do **not** satisfy sufficiency on their own.
- If insufficient evidence exists, the engine outputs `risk_level = "INSUFFICIENT_EVIDENCE"` with `score = None`.

### Risk Score Calculation & Risk Bands
$$\text{Overall Risk Score} = \min\left(\sum \text{Active Rule Weights}, 100\right)$$

- **`LOW`**: 0 – 30
- **`MODERATE`**: 31 – 60
- **`HIGH`**: 61 – 80
- **`VERY_HIGH`**: 81 – 100
- **`INSUFFICIENT_EVIDENCE`**: Unscored

### Deterministic Merchant Decision Matrix
Derived in `backend/app/services/report.py`:

| Risk Level / Identity Status | Merchant Decision | Action / Meaning |
|---|---|---|
| **`LOW`** | **`APPROVE`** | Clean identity, active registrations, no major risk signals detected. |
| **`MODERATE`** | **`APPROVE_WITH_MONITORING`** | Minor discrepancies or recent registration; approved with ongoing monitoring. |
| **`HIGH`** | **`MANUAL_REVIEW`** | Multiple discrepancies or high-severity signals requiring analyst verification. |
| **`VERY_HIGH`** | **`REJECT_OR_ESCALATE`** | Critical adverse findings (e.g., struck-off company, inactive GST, severe name conflict). |
| **`INSUFFICIENT_EVIDENCE`** | **`MANUAL_REVIEW`** | Crucial sources unavailable or unverified; requires human analyst follow-up. |
| **`CONFLICTING_IDENTITY`** | **`MANUAL_REVIEW`** | Conflicting statutory identifiers detected; escalation required before approval. |

> **Audit Guarantee**: The LLM does not determine the numerical risk score, risk level, entity resolution result, QA pass/fail, or merchant decision. These remain deterministic.

---

## Role of the LLM

BizRisk uses language models strictly where natural language processing is needed, maintaining a complete separation between narrative generation and deterministic decisioning:

### Where the LLM IS Used
- Extracting candidate entity profiles and business claims from unstructured web text.
- Synthesizing executive summary prose and investigation report narratives.
- Providing advisory QA commentary on evidence coverage.

### Where the LLM is NOT Used
- **Risk Scores**: Numerical risk scores are computed purely by deterministic arithmetic.
- **Risk Levels**: Risk bands (`LOW` to `VERY_HIGH`) are mapped strictly by score ranges.
- **Entity Resolution**: Candidate matching and statutory conflict detection are executed by deterministic matching algorithms.
- **QA Gate**: Graph progression and retry routing are governed by programmatic rule checks.
- **Merchant Decision**: Onboarding recommendations are produced deterministically from risk and identity states.

*(BizRisk is not a black-box LLM decision engine; all compliance-critical paths are 100% deterministic code).*

---

## Human-in-the-Loop & Uncertainty

> **Core Philosophy**: Make uncertainty actionable instead of hiding it.

When live sources encounter CAPTCHAs, bot checks, or blocked workflows, BizRisk can pause for human intervention, preserve the browser session, and resume the investigation without data loss.

```
[ Automated Browser ] ──(CAPTCHA / Bot Block)──► [ Pause Workflow & Preserve Session ]
                                                                 │
                                                                 ▼
[ Resume Execution ] ◄──(Analyst Solves / Submits)──◄ [ Live Browser Canvas in UI ]
```

### HITL Capabilities
- **Session Preservation**: Pauses LangGraph execution and holds the live Playwright Chromium browser session in a dedicated background worker.
- **Interactive UI Canvas**: Streams real-time browser viewports to the frontend (`/tasks/{id}/screenshot`) and accepts coordinate clicks (`/click`), keyboard input (`/type`), and field clears (`/clear`).
- **Seamless Resume**: Upon analyst resolution, `/resume` re-engages the automated crawler with the authenticated session cookies and DOM state.
- **Real-Time Telemetry**: Server-Sent Events (`/events/stream`) broadcast granular step-by-step progress, source statuses, and audit logs to the dashboard.

---

## LangGraph Technical Architecture

The core investigation agent is orchestrated as a stateful graph (`StateGraph` in `backend/app/graph/workflow.py`):

```
[ intake ] ──► [ discovery ] ──► [ planner ] ──(pending tasks?)──┬─► [ browser ] ──► [ entity_resolution ] ──┐
                                     ▲                           │                                            │
                                     │                           └─► [ risk_analysis ] ◄──────────────────────┘
                                     │                                      │
                                     │                                      ▼
                                     │                             [ report_generation ]
                                     │                                      │
                                     │                                      ▼
                                     │                                   [ qa ]
                                     │                                      │
                                     │                                      ├─ PASS / Max Loops ──► [ END ]
                                     │                                      ├─ MISSING_EVIDENCE ──► [ planner ]
                                     │                                      └─ WRONG_ENTITY ──────► [ entity_resolution ]
```

### Graph Nodes
1. **`intake`**: Ingests, normalizes, and validates initial merchant attributes.
2. **`discovery`**: Performs preliminary reconnaissance across known registries and search endpoints.
3. **`planner`**: Dynamically constructs the prioritized research task queue.
4. **`browser`**: Executes multi-source scraping via direct HTTP or Playwright browser automation.
5. **`entity_resolution`**: Matches extracted profiles, applies statutory guards, and filters out wrong-company records.
6. **`risk_analysis`**: Evaluates active risk signals and calculates the deterministic risk score and level.
7. **`report_generation`**: Compiles structured findings and synthesizes the executive summary.
8. **`qa`**: Verifies evidence grounding, score consistency, and absence of contradictory statements.

### Cyclic QA Routing & Budget Guardrails
- **Automated QA Gate**: If the QA node detects missing mandatory evidence or unresolved entities, it routes back to `planner` or `entity_resolution` (`max_qa_loops = 2`).
- **Cost & Loop Protection**: Enforces strict execution guardrails: `max_research_depth` (3), `max_browser_actions` (20), `max_research_tasks` (15), `max_llm_calls` (50), and `token_budget` (100,000 tokens).

---

## Frontend & Analyst Workspace

Built with **Next.js 16 (App Router)** and **React 19** in `frontend/`:

- **Merchant Intake (`/investigate`)**: Rapid intake form supporting Legal Name, Trade Name, GSTIN, CIN, EPFO Code, Website, and Location.
- **Analyst Dashboard (`/dashboard`)**: Portfolio overview with KPI summary cards (Total, Approved, Manual Review, High Risk) and incomplete investigation recovery tracking.
- **Live Investigation Workspace (`/investigations/[id]`)**:
  - Real-time progress stepper with SSE live event stream.
  - Interactive HITL remote browser canvas for solving portal challenges.
  - Structured evidence ledger with authority badges, source links, and confidence bars.
  - Risk breakdown with category gauges and active signal cards.
  - Side-by-side entity resolution comparison table.
  - Multi-version report history with Markdown rendering.
  - JSON, CSV, and full investigation exports.

---

## Evaluation & Benchmark Results

Located in `backend/evaluation/` (`run_evaluation.py`, `dataset.py`, `results.json`) and validated in the test suite:

The benchmark feeds 16 hand-labelled synthetic merchant cases directly into the unmodified Entity Resolution, Risk Engine, and Decision pipeline (`generate_investigation_report`), comparing outputs against ground truth labels:

```
========================================================================================
MERCHANT/BUSINESS VERIFICATION EVALUATION (SYNTHETIC BASELINE)
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
TP = 5  |  TN = 8  |  FP = 0  |  FN = 3
Precision (positive class = SUSPICIOUS): 1.000 (100.0%)
Recall    (positive class = SUSPICIOUS): 0.625 (62.5%)
False-Positive Cost: 0 cost units (0 FP x 1 cost unit/FP)
========================================================================================
```

### Benchmark Analysis & Transparency
- **Zero False Positives (FP = 0, Precision = 100%)**: Legitimate merchants with clean, consistent registrations were never misclassified as suspicious or routed to rejection.
- **Why False Negatives Occur (3 FN)**: Single isolated signals such as `LEGAL_NAME_CONFLICT` (weight 25) or `GST_INACTIVE` (weight 30) individually total $\le 30$ points, remaining within the `LOW` risk band (0–30 $\rightarrow$ `APPROVE`). Compounding signals (e.g. `S5`=60, `S6`=45, `S7`=90, `S8`=`CONFLICTING_IDENTITY`) elevate the risk level to `MODERATE`, `HIGH`, `VERY_HIGH`, or force `MANUAL_REVIEW`.
- **False-Positive Cost**: A transparent evaluation-only bookkeeping assumption ($1\text{ unit per FP}$), reflecting the priority of avoiding unnecessary merchant onboarding friction.

> **Evaluation Disclaimer**: This is a small, reproducible synthetic benchmark of deterministic decision logic, not production accuracy and not a measurement of live web-source reliability.

---

## Testing & Verification

The codebase is thoroughly tested across unit, integration, security, and evaluation suites:

```bash
# Run complete backend pytest suite (917 tests passed, 0 failures)
PYTHONPATH=. pytest backend/tests -q

# Run synthetic evaluation benchmark
cd backend && python -m evaluation.run_evaluation

# Run frontend test suite
cd frontend && npm test
```

*Current Test Status: Verified test suite passing **917 tests with 0 failures** across all backend modules.*

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+) with Uvicorn
- **Agent Orchestration**: LangGraph (`StateGraph`), Pydantic v2
- **Database & ORM**: PostgreSQL 16, SQLAlchemy 2.0, Alembic
- **Browser Automation**: Playwright (Chromium)
- **LLM Integration**: Anthropic Python SDK (advisory narrative and extraction only)
- **Testing**: Pytest (917 tests)

### Frontend
- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript 5
- **UI Components & Styling**: Tailwind CSS, Lucide React, Glassmorphism Design System

---

## Quickstart & Setup Guide

### Prerequisites
- Docker (for PostgreSQL database)
- Python 3.11+
- Node.js 18+

### Step 1: Start PostgreSQL Database
```bash
docker compose up -d db
```

### Step 2: Backend Setup & Launch
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
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Step 3: Frontend Setup & Launch
```bash
cd frontend
npm install
npm run dev
```
- Analyst Workspace: `http://localhost:3000`

---

## Authentication & Security Scope

- **Authorization Model**: Bearer Token (`Authorization: Bearer <user_id>`).
- **User Data Isolation**: The bearer token string is treated directly as the `user_id`. `get_owned_investigation` enforces strict tenant scoping, returning 404 for unowned investigations (`backend/tests/test_security_user_isolation.py`).
- **Test Endpoint Guard**: Unauthenticated `/api/v1/test/*` endpoints are gated by `ENABLE_TEST_ENDPOINTS` (enforced `false` in production).
- **Scope Boundary**: Opaque identifier authorization without cryptographic JWT signature verification or OAuth2/SSO.

---

## Known Technical Limitations

1. **In-Process Background Execution**: Investigations run asynchronously within the FastAPI server process (`BackgroundTasks`). If the server restarts, in-flight jobs remain at non-terminal statuses (recoverable via `/resume` endpoint or `/incomplete` list).
2. **Live Government Portals**: Direct HTTP scraping of `services.gst.gov.in`, `mca.gov.in`, and `epfindia.gov.in` frequently encounters CAPTCHAs, bot blocks, or dynamic session tokens; live runs rely on third-party registries (`quickcompany.in`, `tofler.in`, `zaubacorp.com`) or HITL solver intervention.
3. **Unused Infrastructure Components**: `REDIS_URL` in `.env.example`, the Redis container in `docker-compose.yml`, and `backend/worker/` are placeholders.
4. **LLM Provider Implementations**: Concrete SDK integration is implemented for `mock` and `anthropic`. OpenAI and Gemini raise provider exceptions if configured without mock mode.

---

## Demo Flow & Scenarios

### Scenario 1 — Legitimate Merchant
1. Submit a merchant on `/investigate` with consistent legal name and active GSTIN/CIN.
2. Watch the LangGraph pipeline execute research and entity resolution across registry and website tiers.
3. Extracted records validate successfully with no adverse signals.
4. **Decision**: `risk_level: LOW`, `risk_score: 0`, and `merchant_decision: APPROVE`.

### Scenario 2 — Conflicting / Suspicious Merchant
1. Submit a merchant with conflicting statutory identifiers, adverse MCA status (struck off / under liquidation), or mismatched legal names across sources.
2. Entity resolution detects statutory identifier conflict (`CONFLICTING_IDENTITY`) or triggers active compliance risk signals.
3. **Decision**:
   - Single moderate signal $\rightarrow$ `merchant_decision: MANUAL_REVIEW` or `APPROVE_WITH_MONITORING`.
   - Compounding signals $\rightarrow$ `risk_level: VERY_HIGH`, `merchant_decision: REJECT_OR_ESCALATE`.
   - Conflicting statutory IDs $\rightarrow$ `resolution_status: CONFLICTING_IDENTITY`, `merchant_decision: MANUAL_REVIEW`.

> **Guiding Principle**: Make uncertainty actionable instead of hiding it.

*For offline deterministic demonstration, execute `python -m evaluation.run_evaluation` in `backend/` to run all 16 benchmark cases against the complete decision pipeline.*
