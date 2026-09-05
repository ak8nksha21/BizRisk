"""
Runs the EXISTING, unmodified merchant/business verification pipeline
(entity resolution + deterministic Risk Engine + report service, exactly as
used by the production API) against the hand-labelled cases in dataset.py,
and reports precision/recall against manually-assigned ground truth.

This step does not change the Risk Engine, browser research, entity
resolution, or any production code path. It only feeds pre-formed evidence
into app.services.report.generate_investigation_report() -- the same
function the API's GET /investigations/{id}/report endpoint calls -- against
an isolated in-memory SQLite database, one investigation per case.

--------------------------------------------------------------------------
DATASET / GROUND TRUTH   -> evaluation/dataset.py (DATASET)
SYSTEM PREDICTION        -> run_case() below (calls the real pipeline)
CALCULATED METRICS       -> compute_metrics() below
--------------------------------------------------------------------------

Usage:
    cd backend && .venv/bin/python -m evaluation.run_evaluation
"""

import json
import sys
from pathlib import Path

# Allow running this file directly (`python backend/evaluation/run_evaluation.py`)
# as well as via `python -m evaluation.run_evaluation` from within backend/,
# by ensuring the backend/ directory (which contains the `app` package) is on
# sys.path either way.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.graph.state import ResearchResult
from app.models.investigation import Investigation
from app.services.evidence import save_research_result
from app.services.report import generate_investigation_report

from evaluation.dataset import DATASET

DEFAULT_RETRIEVED_AT = "2026-08-01T10:00:00+00:00"

# --------------------------------------------------------------------------
# FALSE-POSITIVE COST -- an EVALUATION ASSUMPTION ONLY, not a real monetary
# loss estimate. A false positive here means the pipeline flagged a
# LEGITIMATE ground-truth merchant as SUSPICIOUS. To make that error visible
# as more than a bare count, this harness assigns it a documented, arbitrary
# cost of 1 unit per false positive (no currency, no real-world calibration).
# false_positive_cost = fp * FALSE_POSITIVE_COST_PER_CASE, so fp=0 -> cost=0.
# --------------------------------------------------------------------------
FALSE_POSITIVE_COST_PER_CASE = 1

# --------------------------------------------------------------------------
# SYSTEM PREDICTION: the smallest possible deterministic mapping from the
# existing final report output to a binary LEGITIMATE/SUSPICIOUS label.
#
# merchant_decision (backend/app/services/report.py, added in the prior
# step, itself derived only from the unmodified risk_level / assessment_status
# / entity resolution_status) is APPROVE only when the deterministic Risk
# Engine found a LOW score, the evidence was sufficient, and entity identity
# was not found to conflict. Every other merchant_decision value
# (APPROVE_WITH_MONITORING, MANUAL_REVIEW, REJECT_OR_ESCALATE) means the
# system did not clear the business outright, which this evaluation treats
# as "flagged as suspicious" for a binary metric.
# --------------------------------------------------------------------------


def predicted_label_from_report(report: dict) -> str:
    return "LEGITIMATE" if report.get("merchant_decision") == "APPROVE" else "SUSPICIOUS"


def _make_result(case_id: str, idx: int, ev: dict) -> ResearchResult:
    return ResearchResult(
        result_id=f"{case_id}-R{idx}",
        task_id=f"{case_id}-T{idx}",
        field_name=ev["field_name"],
        field_value=ev["field_value"],
        source_name=ev["source_name"],
        source_url=ev.get("source_url"),
        retrieved_at=ev.get("retrieved_at", DEFAULT_RETRIEVED_AT),
        confidence=ev["confidence"],
    )


def run_case(case: dict) -> dict:
    """Runs one dataset case through the real, unmodified pipeline in an
    isolated in-memory database and returns the system's prediction alongside
    the case's ground truth."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        inv = Investigation(input_data=json.dumps(case["input"]))
        db.add(inv)
        db.commit()
        db.refresh(inv)

        for idx, ev in enumerate(case["evidence"], start=1):
            saved = save_research_result(db, _make_result(case["case_id"], idx, ev), inv.id)
            if saved is None:
                raise AssertionError(
                    f"Case {case['case_id']}: evidence #{idx} ({ev['field_name']!r}) was "
                    "rejected by the existing evidence validator -- fix the dataset, not "
                    "the validator."
                )

        report = generate_investigation_report(db, inv.id)
    finally:
        db.close()

    return {
        "case_id": case["case_id"],
        "description": case["description"],
        "ground_truth": case["ground_truth"],
        "risk_score": report["overall_risk"]["score"],
        "risk_level": report["overall_risk"]["level"],
        "assessment_status": report["assessment_status"],
        "merchant_decision": report["merchant_decision"],
        "predicted_label": predicted_label_from_report(report),
    }


def compute_metrics(results: list[dict]) -> dict:
    """Confusion matrix with SUSPICIOUS as the positive class."""
    tp = tn = fp = fn = 0
    for r in results:
        gt, pred = r["ground_truth"], r["predicted_label"]
        if gt == "SUSPICIOUS" and pred == "SUSPICIOUS":
            tp += 1
        elif gt == "LEGITIMATE" and pred == "LEGITIMATE":
            tn += 1
        elif gt == "LEGITIMATE" and pred == "SUSPICIOUS":
            fp += 1
        elif gt == "SUSPICIOUS" and pred == "LEGITIMATE":
            fn += 1
        else:
            raise ValueError(f"Unexpected label pair: ground_truth={gt!r}, predicted={pred!r}")

    precision = (tp / (tp + fp)) if (tp + fp) > 0 else None
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else None

    return {
        "n_cases": len(results),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        # Evaluation assumption only -- see FALSE_POSITIVE_COST_PER_CASE above.
        "false_positive_cost_per_case": FALSE_POSITIVE_COST_PER_CASE,
        "false_positive_cost": fp * FALSE_POSITIVE_COST_PER_CASE,
    }


def main() -> dict:
    results = [run_case(case) for case in DATASET]
    metrics = compute_metrics(results)

    print("=" * 88)
    print("MERCHANT/BUSINESS VERIFICATION EVALUATION")
    print("=" * 88)
    print(f"{'Case':<6}{'Ground Truth':<14}{'Predicted':<12}{'Risk Level':<10}{'Decision':<22}{'Correct?'}")
    print("-" * 88)
    for r in results:
        correct = "YES" if r["ground_truth"] == r["predicted_label"] else "no"
        print(
            f"{r['case_id']:<6}{r['ground_truth']:<14}{r['predicted_label']:<12}"
            f"{str(r['risk_level']):<10}{r['merchant_decision']:<22}{correct}"
        )
    print("-" * 88)
    print(f"Cases: {metrics['n_cases']}")
    print(f"TP={metrics['tp']}  TN={metrics['tn']}  FP={metrics['fp']}  FN={metrics['fn']}")
    precision_str = f"{metrics['precision']:.3f}" if metrics["precision"] is not None else "undefined (no positive predictions)"
    recall_str = f"{metrics['recall']:.3f}" if metrics["recall"] is not None else "undefined (no positive ground-truth cases)"
    print(f"Precision (positive class = SUSPICIOUS): {precision_str}")
    print(f"Recall    (positive class = SUSPICIOUS): {recall_str}")
    print(
        f"False-positive cost (EVALUATION ASSUMPTION, not a real monetary estimate): "
        f"{metrics['fp']} FP x {metrics['false_positive_cost_per_case']} cost unit/FP = "
        f"{metrics['false_positive_cost']} cost units"
    )
    print("=" * 88)

    out_path = Path(__file__).resolve().parent / "results.json"
    with out_path.open("w") as f:
        json.dump({"results": results, "metrics": metrics}, f, indent=2)
    print(f"\nFull results written to {out_path}")

    return {"results": results, "metrics": metrics}


if __name__ == "__main__":
    main()
