# BizRisk AI — AI Merchant Fraud & Business Verification Agent

Graph-based multi-agent business due-diligence platform. It takes partial
information about a legal entity, researches it across public sources with a
browser-based research agent, resolves the entity's identity, detects
cross-source inconsistencies, computes an explainable **deterministic** risk
score, and produces an evidence-backed report that a QA agent validates before
release.

**Use case:** verify whether a merchant or business is legitimate, and detect
suspicious or conflicting business identity information (mismatched legal
names, addresses, or registration status across sources; adverse company
status; very recent registrations) before it causes merchant losses — the
kind of check a payments platform runs during merchant onboarding and
ongoing risk monitoring.

```
Intake → Discovery → Planner → Browser Research → Evidence Store
      → Entity Resolution → Risk Engine → Report → QA
```

## Why This Matters (Track 02 fit)

- **Problem:** merchant losses can result from fraudulent, misrepresented, or
  conflicting business identity information.
- **Solution:** BizRisk AI verifies merchant/business identity using
  browser-based public-source research, entity resolution, evidence
  validation, deterministic risk analysis, and explainable reporting.
- **Track fit:** this is a merchant fraud / business verification agent for
  **Track 02 — AI Risk Manager**.

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, LangGraph, SQLAlchemy, Alembic |
| Browser research | direct HTTP + Playwright (Chromium) fallback |
| Risk engine | deterministic rules (`backend/app/risk/config.yaml`) |
| LLM | pluggable provider abstraction — `mock` (default) or `anthropic` |
| DB / cache | PostgreSQL 16, Redis 7 |
| Frontend | Next.js 16, React 19 |

## Prerequisites

- Python 3.13, Node.js 20+
- Docker (for PostgreSQL + Redis) — `docker compose up -d`

## Backend setup

```bash
# from the repo root
docker compose up -d                       # starts postgres:5432 and redis:6379

cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/playwright install chromium      # for live browser research
cp .env.example .env                        # then edit as needed

.venv/bin/alembic upgrade head              # create the schema (uses DATABASE_URL)
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check: `curl http://127.0.0.1:8000/health` → `{"status":"healthy",...}`.
OpenAPI docs: `http://127.0.0.1:8000/docs`.

## Frontend setup

```bash
cd frontend
npm install
# frontend/.env.local already points at http://127.0.0.1:8000/api/v1
npm run dev            # http://localhost:3000
```

Log in with any identifier string — it becomes your bearer token / user id
(see **Authentication** below).

## Configuration (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | local postgres | `postgres://` and `postgresql://` are auto-normalised |
| `REDIS_URL` | local redis | |
| `LLM_PROVIDER` | `mock` | `mock` (deterministic, offline, used by tests) or `anthropic` |
| `LLM_ANTHROPIC_MODEL` | `claude-opus-5` | model used when `LLM_PROVIDER=anthropic` |
| `ANTHROPIC_API_KEY` | — | read from the environment only, never stored in Settings |
| `ENTITY_RESOLUTION_THRESHOLD` | `0.75` | 0.0–1.0 acceptance threshold; docs recommend `0.85` for production |
| `MAX_QA_LOOPS` | `2` | QA → planner correction loops before release |
| `MAX_RESEARCH_DEPTH` / `MAX_BROWSER_ACTIONS` / `MAX_RESEARCH_TASKS` / `MAX_LLM_CALLS` / `TOKEN_BUDGET` | `3` / `20` / `15` / `50` / `100000` | cost/loop guardrails |
| `PLAYWRIGHT_HEADLESS` | `true` | headed Chromium for CAPTCHA HITL when `false` |
| `ENABLE_TEST_ENDPOINTS` | `true` | gates the unauthenticated `/api/v1/test/*` endpoints — **must be `false` in production** (enforced when `ENVIRONMENT=production`) |
| `CORS_ORIGINS` | localhost:3000 | JSON list or comma-separated |

Risk weights and levels are configured in `backend/app/risk/config.yaml`.

## Authentication

Endpoints require a bearer token and enforce per-user investigation isolation
(`get_owned_investigation`; covered by `test_security_user_isolation.py`). The
token is currently an **opaque identifier used directly as the user id** — there
is no login/JWT flow yet. This is a deliberate MVP simplification; the
authorization model (auth required, user-scoped access, no cross-user reads) is
in place. A production deployment should place a real identity provider /
JWT-verifying gateway in front of `get_current_user_id`.

## LLM

`app/core/llm.py` exposes `get_llm_provider()` returning a `BaseLLMProvider`.
`mock` is fully deterministic and is the default (all tests run on it). Set
`LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` to enable the real provider
(`AnthropicLLMProvider`, official SDK, strict structured output, timeout +
graceful failure). The LLM is used only for candidate reasoning, cross-source
consistency narrative, report narrative, and advisory QA notes — **it never
determines the numeric risk score or the QA PASS/FAIL verdict**, which stay in
the deterministic engine.

## Tests

```bash
# backend — run from the repo root (test modules import `backend.tests.*`)
backend/.venv/bin/python -m pytest backend/tests -q

# frontend
cd frontend && npm test && npm run build
```

## Evaluation (Precision / Recall)

A small, reproducible evaluation of the existing verification/scoring logic
lives in `backend/evaluation/` (`dataset.py` = ground truth, `run_evaluation.py`
= runner + metrics; guarded by `backend/tests/test_merchant_verification_evaluation.py`).
It feeds hand-labelled synthetic evidence directly into the unmodified
entity-resolution + Risk Engine + report pipeline
(`app.services.report.generate_investigation_report`) and compares the
result to manually-assigned ground truth.

Run it: `cd backend && .venv/bin/python -m evaluation.run_evaluation`

| Metric | Value |
|---|---|
| Cases | 16 (8 `LEGITIMATE`, 8 `SUSPICIOUS`) |
| TP / TN / FP / FN | 5 / 8 / 0 / 3 |
| Precision | 1.000 |
| Recall | 0.625 |
| False-positive cost (evaluation assumption) | 0 FP × 1 cost unit/FP = **0 cost units** |

**False-positive cost is an evaluation-only bookkeeping assumption, not a
real monetary loss estimate.** It is defined transparently as `FP count x
1 cost unit per false positive` (`FALSE_POSITIVE_COST_PER_CASE` in
`backend/evaluation/run_evaluation.py`), so with FP=0 the cost is 0 cost
units. No currency, business impact, or real-world calibration is implied —
it exists only to give the FP count a reportable "cost" figure alongside
precision/recall, and is included in `backend/evaluation/results.json`
(`metrics.false_positive_cost`) and guarded by
`test_false_positive_cost_is_reported_as_documented_evaluation_assumption`
in `backend/tests/test_merchant_verification_evaluation.py`.

**What this measures:** whether the existing deterministic decision
(`merchant_decision`, derived from `risk_level` / `assessment_status` /
entity `resolution_status`) agrees with hand-labelled ground truth for a
fixed set of evidence. **It does not measure live browser-research
extraction accuracy** — every case injects pre-formed evidence directly, so
GST/MCA/website scraping is not exercised by this number.

**Limitations:**
- All 16 businesses are synthetic/fictional, invented for this evaluation —
  not real companies, and not a random or representative sample.
- n=16 is small; precision/recall at this scale are illustrative of real,
  measured behavior, not statistically robust production estimates.
- The 3 false negatives are a known, real property of the current
  (unmodified) Risk Engine weights: `LEGAL_NAME_CONFLICT` (25) and
  `GST_INACTIVE` (30) alone each stay within the `LOW` band (max 30 in
  `backend/app/risk/config.yaml`), so either signal alone does not yet flip
  the decision away from `APPROVE`. Two or more compounding signals do (see
  cases `S1`, `S5`–`S8` in the dataset).

These numbers describe this evaluation set only and are **not** production
or real-world performance figures.

## Demo Script

Two scenarios cover the "verify legitimacy / detect conflicting identity"
use case end-to-end through the UI (`/investigate` → investigation detail
page):

1. **Clean / legitimate merchant.** Submit a business whose public GST/MCA
   records are active and agree with each other (consistent legal name,
   address, status). Expect `risk_level: LOW` and `merchant_decision:
   APPROVE`.
2. **Conflicting / adverse merchant evidence.** Submit a business for which
   the researched records show an adverse company status (e.g. struck off /
   dissolved) and/or a legal name or address that conflicts across sources.
   Expect `merchant_decision: MANUAL_REVIEW` (a single or moderate combined
   signal) or `REJECT_OR_ESCALATE` (multiple compounding signals) — see cases
   `S1`–`S8` in `backend/evaluation/dataset.py` for the exact evidence shapes
   that produce each outcome.

Live GST/MCA/EPFO portal research can be unreliable on demand (see **Known
limitations** below), so the evaluation harness above is the deterministic
fallback: it runs the same decision logic end-to-end against fixed evidence
and prints the same `risk_level` / `merchant_decision` fields the UI
displays, with no dependency on live sites being reachable during a demo.

No specific companies are prescribed for either scenario — use any business
identifiers you already expect to land in one of the two outcomes above.

## Known limitations

- **Background jobs run in-process** (FastAPI `BackgroundTasks`; `WORKER_MODE`
  and the `rq` dependency are unused). If the API process restarts mid-run an
  investigation stays at a non-terminal status; recover it with
  `POST /api/v1/investigations/{id}/resume` (or list them via
  `GET /api/v1/investigations/incomplete`). There is no automatic
  crash-recovery sweep.
- **Live government-portal research** (GST/MCA/EPFO) is HTTP + regex extraction;
  against real portals it often yields `SOURCE_UNAVAILABLE` / `NOT_FOUND`
  because those sites require JS/search forms/CAPTCHA. Third-party directories
  and company websites are the more reliable live sources.
- The modular research-provider layer (`app/research/{gst,mca,epfo,
  company_website,generic_web}.py`, `ResearchDispatcher`) is unit-tested but not
  wired into the live path; `BrowserResearchAgent` does inline extraction.
