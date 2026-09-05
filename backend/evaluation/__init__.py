"""
Minimal, reproducible precision/recall evaluation for the existing merchant/
business verification pipeline (entity resolution + deterministic Risk Engine
+ report service). See dataset.py and run_evaluation.py.

Nothing here changes production behavior: it only feeds hand-labelled,
synthetic evidence into the unmodified pipeline (app.services.report.
generate_investigation_report) and compares its output to ground truth.
"""
