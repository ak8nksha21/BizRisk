"""
GROUND-TRUTH EVALUATION DATASET for the merchant/business verification
capability. This file is data only -- no system logic, no metric
computation. See run_evaluation.py for how it is executed and scored.

Every case is a *synthetic* business, invented for this evaluation and not
based on any real company. Each case specifies:

  - case_id:      short identifier
  - description:  what the case is meant to exercise (for human review)
  - ground_truth: the manually-assigned label -- "LEGITIMATE" or "SUSPICIOUS"
  - input:        the InvestigationCreate-shaped dict a user would submit
  - evidence:     the research evidence records the (existing, unmodified)
                   browser-research/entity-resolution layer would have
                   produced for this business. Feeding pre-formed evidence
                   directly into the pipeline keeps the evaluation
                   deterministic and reproducible -- it exercises the same
                   entity-resolution + Risk Engine + report code that a real
                   run would use, without depending on live network access
                   or non-deterministic browser research.

Ground truth was assigned by hand, before running the system, based on
whether the case is meant to represent a legitimate business (consistent,
clean records) or a suspicious one (adverse registry status, conflicting
identity/name/address information, or conflicting statutory identifiers).
The evaluation script does not know these labels while computing a
prediction -- it derives merchant_decision purely from the existing risk
output (see run_evaluation.py:PREDICTED_LABEL rule).
"""

DATASET = [
    # ---------------------------------------------------------------
    # LEGITIMATE cases: consistent, clean evidence across sources.
    # ---------------------------------------------------------------
    {
        "case_id": "L1",
        "description": "Single verified source, GST active, no conflicts.",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Alpha Textiles Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
        ],
    },
    {
        "case_id": "L2",
        "description": "GST + MCA agree on status and legal name.",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Nightingale Traders LLP"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {"field_name": "company_status", "field_value": "Active", "source_name": "MCA Portal", "confidence": 0.9},
            {"field_name": "legal_name", "field_value": "Nightingale Traders LLP", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "legal_name", "field_value": "Nightingale Traders LLP", "source_name": "MCA Portal", "confidence": 0.9},
        ],
    },
    {
        "case_id": "L3",
        "description": "GST + company website agree on address and business activity.",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Bluewave Logistics Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {"field_name": "registered_address", "field_value": "Plot No 22, Sector 18, Gurugram, Haryana", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "registered_address", "field_value": "Plot No 22 Sector 18 Gurugram Haryana", "source_name": "Company Website", "confidence": 0.85},
            {"field_name": "business_activity", "field_value": "Freight and logistics services", "source_name": "GST Portal", "confidence": 0.85},
            {"field_name": "business_activity", "field_value": "Freight and logistics services", "source_name": "Company Website", "confidence": 0.85},
        ],
    },
    {
        "case_id": "L4",
        "description": "Recently registered (under a year) but otherwise clean -- a low-severity signal alone.",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Sunrise Agro Foods Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {"field_name": "incorporation_date", "field_value": "2025-10-01", "source_name": "MCA Portal", "confidence": 0.9},
        ],
    },
    {
        "case_id": "L5",
        "description": "GST and EPFO records for distinct address types, both clean.",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Crimson Furnishings Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {"field_name": "registered_address", "field_value": "H.No 45, Industrial Area Phase 2, Chandigarh", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "establishment_address", "field_value": "H.No 45 Industrial Area Phase 2 Chandigarh", "source_name": "EPFO Portal", "confidence": 0.85},
        ],
    },
    {
        "case_id": "L6",
        "description": "Same registered address across sources, only superficial abbreviation differences (Road vs Rd).",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Meridian Software Solutions Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {"field_name": "registered_address", "field_value": "123 MG Road, Pune, Maharashtra", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "registered_address", "field_value": "123 MG Rd Pune Maharashtra", "source_name": "Company Website", "confidence": 0.85},
        ],
    },
    {
        "case_id": "L7",
        "description": "GST + MCA agree on active status and legal name.",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Falcon Auto Components Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {"field_name": "company_status", "field_value": "Active", "source_name": "MCA Portal", "confidence": 0.9},
            {"field_name": "legal_name", "field_value": "Falcon Auto Components Private Limited", "source_name": "GST Portal", "confidence": 0.85},
            {"field_name": "legal_name", "field_value": "Falcon Auto Components Private Limited", "source_name": "MCA Portal", "confidence": 0.85},
        ],
    },
    {
        "case_id": "L8",
        "description": "A discovered candidate record matches the target's own GSTIN exactly (clean entity resolution).",
        "ground_truth": "LEGITIMATE",
        "input": {"business_name": "Harbor Point Exports Private Limited", "gstin": "27AAAPL1234C1Z5"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {
                "field_name": "candidate_entities",
                "field_value": [{"name": "Harbor Point Exports Private Limited", "gstin": "27AAAPL1234C1Z5"}],
                "source_name": "GST Portal",
                "confidence": 0.9,
            },
        ],
    },

    # ---------------------------------------------------------------
    # SUSPICIOUS cases: adverse status, conflicting identity/name/address,
    # or conflicting statutory identifiers -- the fraud/verification signals
    # this product exists to surface.
    # ---------------------------------------------------------------
    {
        "case_id": "S1",
        "description": "Company registration struck off.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Silverline Constructions Private Limited"},
        "evidence": [
            {"field_name": "company_status", "field_value": "struck off", "source_name": "MCA Portal", "confidence": 0.95},
        ],
    },
    {
        "case_id": "S2",
        "description": "Legal name conflicts between GST and MCA records.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Vantage Retail Traders Private Limited"},
        "evidence": [
            {"field_name": "legal_name", "field_value": "Vantage Retail Traders Private Limited", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "legal_name", "field_value": "Vantage Retail Solutions Private Limited", "source_name": "MCA Portal", "confidence": 0.9},
        ],
    },
    {
        "case_id": "S3",
        "description": "GST registration inactive.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Emerald Textiles Private Limited"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Inactive", "source_name": "GST Portal", "confidence": 0.9},
        ],
    },
    {
        "case_id": "S4",
        "description": "Registered address and business activity both conflict across sources.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Trident Logistics Private Limited"},
        "evidence": [
            {"field_name": "registered_address", "field_value": "Plot 5, Sector 21, Faridabad, Haryana", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "registered_address", "field_value": "House No 204, Lake View Complex, Andheri, Mumbai, Maharashtra", "source_name": "MCA Portal", "confidence": 0.9},
            {"field_name": "business_activity", "field_value": "Freight and logistics services", "source_name": "GST Portal", "confidence": 0.85},
            {"field_name": "business_activity", "field_value": "Retail sale of electronic goods", "source_name": "MCA Portal", "confidence": 0.85},
        ],
    },
    {
        "case_id": "S5",
        "description": "Company dissolved AND legal name conflicts across sources.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Northgate Enterprises Private Limited"},
        "evidence": [
            {"field_name": "company_status", "field_value": "dissolved", "source_name": "MCA Portal", "confidence": 0.9},
            {"field_name": "legal_name", "field_value": "Northgate Enterprises Private Limited", "source_name": "GST Portal", "confidence": 0.85},
            {"field_name": "legal_name", "field_value": "Northgate Ventures Private Limited", "source_name": "MCA Portal", "confidence": 0.85},
        ],
    },
    {
        "case_id": "S6",
        "description": "Company under liquidation AND registered address conflicts across sources.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Zenith Distributors Private Limited"},
        "evidence": [
            {"field_name": "company_status", "field_value": "under liquidation", "source_name": "MCA Portal", "confidence": 0.9},
            {"field_name": "registered_address", "field_value": "12 Market Road, Coimbatore, Tamil Nadu", "source_name": "GST Portal", "confidence": 0.85},
            {"field_name": "registered_address", "field_value": "88 Ring Road, Nagpur, Maharashtra", "source_name": "MCA Portal", "confidence": 0.85},
        ],
    },
    {
        "case_id": "S7",
        "description": "GST cancelled, company struck off, AND legal name conflicts -- multiple compounding red flags.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Coral Bay Trading Company"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Cancelled", "source_name": "GST Portal", "confidence": 0.9},
            {"field_name": "company_status", "field_value": "struck off", "source_name": "MCA Portal", "confidence": 0.9},
            {"field_name": "legal_name", "field_value": "Coral Bay Trading Company", "source_name": "GST Portal", "confidence": 0.85},
            {"field_name": "legal_name", "field_value": "Coral Bay Ventures Private Limited", "source_name": "MCA Portal", "confidence": 0.85},
        ],
    },
    {
        "case_id": "S8",
        "description": "Discovered candidate's GSTIN conflicts with the target's own GSTIN, with no name match -- conflicting statutory identity.",
        "ground_truth": "SUSPICIOUS",
        "input": {"business_name": "Ashford Business Services Private Limited", "gstin": "27AABCU9603R1ZM"},
        "evidence": [
            {"field_name": "gst_status", "field_value": "Active", "source_name": "GST Portal", "confidence": 0.95},
            {
                "field_name": "candidate_entities",
                "field_value": [{"name": "Completely Unrelated Traders LLP", "gstin": "07XYZAB1111Q1ZP"}],
                "source_name": "General Web",
                "confidence": 0.85,
            },
        ],
    },
]
