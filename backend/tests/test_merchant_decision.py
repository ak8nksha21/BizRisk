import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.graph.state import ResearchResult
from app.models.investigation import Investigation
from app.services.evidence import save_research_result
from app.services.report import determine_merchant_decision, generate_investigation_report


# --- Pure mapping tests: determine_merchant_decision must be a deterministic
# function of the already-final risk_level / assessment_status / entity
# resolution_status, with no dependency on the LLM, DB, or Risk Engine internals.
@pytest.mark.parametrize(
    "risk_level, assessment_status, resolution_status, expected",
    [
        ("LOW", "COMPLETED", "RESOLVED", "APPROVE"),
        ("low", "COMPLETED", "RESOLVED", "APPROVE"),  # case-insensitive
        ("MODERATE", "COMPLETED", "RESOLVED", "APPROVE_WITH_MONITORING"),
        ("HIGH", "COMPLETED", "RESOLVED", "MANUAL_REVIEW"),
        ("VERY_HIGH", "COMPLETED", "RESOLVED", "REJECT_OR_ESCALATE"),
        # Insufficient evidence always forces manual review, regardless of level.
        (None, "INSUFFICIENT_EVIDENCE", None, "MANUAL_REVIEW"),
        ("LOW", "INSUFFICIENT_EVIDENCE", "RESOLVED", "MANUAL_REVIEW"),
        # Conflicting identity (statutory identifier mismatch against a
        # discovered candidate) always forces manual review, even if the
        # deterministic risk score itself would be LOW.
        ("LOW", "COMPLETED", "CONFLICTING_IDENTITY", "MANUAL_REVIEW"),
        ("VERY_HIGH", "COMPLETED", "CONFLICTING_IDENTITY", "MANUAL_REVIEW"),
        # Plain ENTITY_UNRESOLVED (e.g. a direct GSTIN/CIN lookup that never
        # produced discovery candidates to reconcile against) is the ordinary,
        # non-suspicious case and must NOT be forced to manual review -- the
        # risk level alone still governs.
        ("LOW", "COMPLETED", "ENTITY_UNRESOLVED", "APPROVE"),
        ("VERY_HIGH", "COMPLETED", "ENTITY_UNRESOLVED", "REJECT_OR_ESCALATE"),
        # Unknown / missing risk level defaults safely to manual review, never
        # to an automatic approval.
        (None, "COMPLETED", "RESOLVED", "MANUAL_REVIEW"),
        ("SOMETHING_UNEXPECTED", "COMPLETED", "RESOLVED", "MANUAL_REVIEW"),
    ],
)
def test_determine_merchant_decision_mapping(risk_level, assessment_status, resolution_status, expected):
    assert determine_merchant_decision(risk_level, assessment_status, resolution_status) == expected


# --- Integration tests: the report dict produced by the real pipeline must
# carry merchant_decision, consistently with the deterministic risk output.
@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(name="investigation_id")
def fixture_investigation_id(db_session):
    inv = Investigation(input_data='{"business_name": "Test Company"}')
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)
    return inv.id


def make_test_result(result_id="RES-001", **overrides):
    data = {
        "result_id": result_id,
        "task_id": "TASK-001",
        "field_name": "gst_status",
        "field_value": "Active",
        "source_name": "GST Portal",
        "source_url": "https://www.gst.gov.in",
        "retrieved_at": "2026-08-26T10:00:00+00:00",
        "confidence": 0.95,
    }
    data.update(overrides)
    return ResearchResult(**data)


def test_report_merchant_decision_low_risk_is_approve(db_session, investigation_id):
    res = make_test_result(result_id="R1", field_name="gst_status", field_value="Active")
    save_research_result(db_session, res, investigation_id)

    report = generate_investigation_report(db_session, investigation_id)

    assert report["overall_risk"]["level"] == "LOW"
    assert report["merchant_decision"] == "APPROVE"


def test_report_merchant_decision_follows_risk_level_even_with_a_name_conflict_finding(db_session, investigation_id):
    # Documents a real boundary of the existing (unmodified) Risk Engine
    # weights: LEGAL_NAME_CONFLICT alone (weight 25) stays inside the LOW
    # band (0-30), and no discovery candidates were produced here, so
    # resolution_status is the ordinary ENTITY_UNRESOLVED (not
    # CONFLICTING_IDENTITY). Per the exact mapping this step implements,
    # merchant_decision therefore still follows the LOW risk_level. This test
    # locks in that this step changed presentation only, not risk weighting.
    res1 = make_test_result(result_id="R1", field_name="legal_name", field_value="Company A")
    res2 = make_test_result(result_id="R2", field_name="legal_name", field_value="Company B")
    save_research_result(db_session, res1, investigation_id)
    save_research_result(db_session, res2, investigation_id)

    report = generate_investigation_report(db_session, investigation_id)

    assert report["overall_risk"]["level"] == "LOW"
    assert report["merchant_decision"] == "APPROVE"


def test_report_merchant_decision_conflicting_statutory_identity_forces_manual_review(db_session):
    # End-to-end: a discovered candidate whose GSTIN conflicts with the
    # target's own GSTIN, and whose name is too dissimilar to match, drives
    # entity_resolution to "CONFLICTING_IDENTITY" -- this is the literal
    # "conflicting business identity information" case. merchant_decision
    # must be forced to MANUAL_REVIEW even though no risk rule fired and the
    # deterministic risk score/level are otherwise LOW. A substantive (non-
    # candidate) evidence record is included so the case is decided on its
    # own terms and not by the separate INSUFFICIENT_EVIDENCE path.
    inv = Investigation(
        input_data=json.dumps({"business_name": "Test Company", "gstin": "27AAAAA0000A1Z5"})
    )
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)

    save_research_result(
        db_session,
        make_test_result(result_id="R1", field_name="gst_status", field_value="Active"),
        inv.id,
    )
    candidates = [{"name": "Completely Unrelated Entity", "gstin": "07BBBBB1111B1Z9"}]
    save_research_result(
        db_session,
        make_test_result(
            result_id="R2",
            field_name="candidate_entities",
            field_value=json.dumps(candidates),
            confidence=0.9,
        ),
        inv.id,
    )

    report = generate_investigation_report(db_session, inv.id)

    assert report["assessment_status"] == "COMPLETED"
    assert report["overall_risk"]["level"] == "LOW"
    assert report["merchant_decision"] == "MANUAL_REVIEW"


# --------------------------------------------------------------------------- #
# GAP C - a strong GSTIN/CIN conflict against an independently discovered,
# unrelated candidate must never be silently outweighed by a separate,
# cleanly-matching candidate. In particular: entity discovery always adds a
# candidate that simply echoes the investigation's own claimed identity
# (see app/agents/discovery.py), so any real investigation with a genuinely
# conflicting candidate also has this "clean" echo sitting right next to it.
# Before the fix, that echo won as an EXACT match and buried the conflict.
# --------------------------------------------------------------------------- #
def test_conflicting_gstin_against_unrelated_candidate_is_never_approved(db_session):
    inv = Investigation(
        input_data=json.dumps({
            "business_name": "Ashford Business Services Private Limited",
            "gstin": "27AABCU9603R1ZM",
        })
    )
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)

    save_research_result(
        db_session,
        make_test_result(result_id="R1", field_name="gst_status", field_value="Active"),
        inv.id,
    )
    candidates = [
        # Entity discovery's own echo of the investigation's claimed identity
        # (see app/agents/discovery.py -- always tagged "intake_echo").
        {"name": "Ashford Business Services Private Limited", "gstin": "27AABCU9603R1ZM", "source": "intake_echo"},
        # An independently discovered, unrelated candidate with a conflicting GSTIN.
        {"name": "Completely Unrelated Traders LLP", "gstin": "07XYZAB1111Q1ZP"},
    ]
    save_research_result(
        db_session,
        make_test_result(
            result_id="R2",
            field_name="candidate_entities",
            field_value=json.dumps(candidates),
            confidence=0.9,
        ),
        inv.id,
    )

    report = generate_investigation_report(db_session, inv.id)

    assert report["overall_risk"]["level"] == "LOW"
    assert report["merchant_decision"] == "MANUAL_REVIEW"
    assert report["merchant_decision"] != "APPROVE"


def test_matching_gstin_only_still_approves_cleanly(db_session):
    # Same shape as above, minus the conflicting candidate: clean behavior
    # must be unaffected by the GAP C fix.
    inv = Investigation(
        input_data=json.dumps({
            "business_name": "Ashford Business Services Private Limited",
            "gstin": "27AABCU9603R1ZM",
        })
    )
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)

    save_research_result(
        db_session,
        make_test_result(result_id="R1", field_name="gst_status", field_value="Active"),
        inv.id,
    )
    candidates = [
        {"name": "Ashford Business Services Private Limited", "gstin": "27AABCU9603R1ZM"},
    ]
    save_research_result(
        db_session,
        make_test_result(
            result_id="R2",
            field_name="candidate_entities",
            field_value=json.dumps(candidates),
            confidence=0.9,
        ),
        inv.id,
    )

    report = generate_investigation_report(db_session, inv.id)

    assert report["overall_risk"]["level"] == "LOW"
    assert report["merchant_decision"] == "APPROVE"


def test_conflicting_cin_against_unrelated_candidate_is_never_approved(db_session):
    inv = Investigation(
        input_data=json.dumps({
            "business_name": "Zenith Corporate Solutions Private Limited",
            "cin": "U11111DL2001PLC000001",
        })
    )
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)

    save_research_result(
        db_session,
        make_test_result(result_id="R1", field_name="gst_status", field_value="Active"),
        inv.id,
    )
    candidates = [
        # Entity discovery's own echo of the investigation's claimed identity
        # (see app/agents/discovery.py -- always tagged "intake_echo").
        {"name": "Zenith Corporate Solutions Private Limited", "cin": "U11111DL2001PLC000001", "source": "intake_echo"},
        # An independently discovered, unrelated candidate with a conflicting CIN.
        {"name": "Totally Different Enterprises Limited", "cin": "U99999MH2010PLC999999"},
    ]
    save_research_result(
        db_session,
        make_test_result(
            result_id="R2",
            field_name="candidate_entities",
            field_value=json.dumps(candidates),
            confidence=0.9,
        ),
        inv.id,
    )

    report = generate_investigation_report(db_session, inv.id)

    assert report["overall_risk"]["level"] == "LOW"
    assert report["merchant_decision"] == "MANUAL_REVIEW"
    assert report["merchant_decision"] != "APPROVE"


def test_report_merchant_decision_insufficient_evidence_is_manual_review(db_session, investigation_id):
    report = generate_investigation_report(db_session, investigation_id)

    assert report["assessment_status"] == "INSUFFICIENT_EVIDENCE"
    assert report["merchant_decision"] == "MANUAL_REVIEW"


def test_report_merchant_decision_adverse_company_status_is_not_approved(db_session, investigation_id):
    # COMPANY_STATUS_ADVERSE weight (35) lands in the existing MODERATE band
    # (31-60), which maps to APPROVE_WITH_MONITORING, not a bare APPROVE --
    # this is the existing, unmodified Risk Engine weighting; this test only
    # locks in that the mapping is applied correctly on top of it.
    res = make_test_result(result_id="R1", field_name="company_status", field_value="struck off")
    save_research_result(db_session, res, investigation_id)

    report = generate_investigation_report(db_session, investigation_id)

    assert report["overall_risk"]["level"] == "MODERATE"
    assert report["merchant_decision"] == "APPROVE_WITH_MONITORING"
    assert report["merchant_decision"] != "APPROVE"
