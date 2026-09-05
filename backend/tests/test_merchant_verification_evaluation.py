"""
Guards the merchant/business verification evaluation harness
(backend/evaluation/). This does NOT assert a minimum precision/recall --
doing so would let a future change to the dataset or the mapping rule "pass"
by construction instead of honestly reporting what the existing pipeline
does. It only checks that the harness itself is well-formed and that the
metrics it reports are arithmetically consistent with the confusion matrix
it computed.
"""

import pytest

from evaluation.dataset import DATASET
from evaluation.run_evaluation import FALSE_POSITIVE_COST_PER_CASE, compute_metrics, run_case


def test_dataset_size_is_in_the_requested_range():
    assert 10 <= len(DATASET) <= 20


def test_dataset_case_ids_are_unique():
    ids = [case["case_id"] for case in DATASET]
    assert len(ids) == len(set(ids))


def test_dataset_uses_only_the_two_allowed_ground_truth_labels():
    labels = {case["ground_truth"] for case in DATASET}
    assert labels == {"LEGITIMATE", "SUSPICIOUS"}
    # Sanity: the dataset should actually exercise both classes, not just one.
    assert sum(c["ground_truth"] == "LEGITIMATE" for c in DATASET) >= 1
    assert sum(c["ground_truth"] == "SUSPICIOUS" for c in DATASET) >= 1


def test_evaluation_runs_the_real_pipeline_for_every_case():
    results = [run_case(case) for case in DATASET]

    assert len(results) == len(DATASET)
    for r in results:
        # System prediction must be one of the two allowed labels, derived
        # from the existing merchant_decision field -- never a third value.
        assert r["predicted_label"] in {"LEGITIMATE", "SUSPICIOUS"}
        assert r["merchant_decision"] in {
            "APPROVE",
            "APPROVE_WITH_MONITORING",
            "MANUAL_REVIEW",
            "REJECT_OR_ESCALATE",
        }


def test_metrics_are_internally_consistent_with_the_confusion_matrix():
    results = [run_case(case) for case in DATASET]
    metrics = compute_metrics(results)

    assert metrics["n_cases"] == len(DATASET)
    assert metrics["tp"] + metrics["tn"] + metrics["fp"] + metrics["fn"] == len(DATASET)

    if metrics["tp"] + metrics["fp"] > 0:
        assert metrics["precision"] == pytest.approx(
            metrics["tp"] / (metrics["tp"] + metrics["fp"])
        )
    else:
        assert metrics["precision"] is None

    if metrics["tp"] + metrics["fn"] > 0:
        assert metrics["recall"] == pytest.approx(
            metrics["tp"] / (metrics["tp"] + metrics["fn"])
        )
    else:
        assert metrics["recall"] is None


def test_false_positive_cost_is_reported_as_documented_evaluation_assumption():
    """false_positive_cost is FP count x a documented, arbitrary per-FP cost
    (currently 1) -- an evaluation assumption, not a real monetary estimate.
    This only checks the arithmetic holds, so it stays honest if the
    dataset/pipeline ever changes the actual FP count (including to 0).
    """
    results = [run_case(case) for case in DATASET]
    metrics = compute_metrics(results)

    assert metrics["false_positive_cost_per_case"] == FALSE_POSITIVE_COST_PER_CASE
    assert metrics["false_positive_cost"] == metrics["fp"] * FALSE_POSITIVE_COST_PER_CASE
    if metrics["fp"] == 0:
        assert metrics["false_positive_cost"] == 0
