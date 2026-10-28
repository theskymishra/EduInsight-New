
from typing import Any


RISK_RULES_VERSION = "1.0"
GRADE_PASS_THRESHOLD = 10
HIGH_RISK_THRESHOLD = 3


def assess_historical_record(record: dict[str, Any]) -> dict[str, Any]:
    """
    Assess a historical academic record using indicators available
    before the final grade.

    This is a provisional decision-support rule set, not a validated
    predictive model.
    """
    required_fields = ("G1", "G2", "absences", "failures")

    missing_fields = [
        field
        for field in required_fields
        if record.get(field) is None
    ]

    if missing_fields:
        return {
            "assessable": False,
            "status": "not_assessable",
            "risk_score": None,
            "risk_level": "unknown",
            "reasons": [],
            "missing_fields": missing_fields,
            "rules_version": RISK_RULES_VERSION,
        }

    try:
        g1 = float(record["G1"])
        g2 = float(record["G2"])
        absences = float(record["absences"])
        failures = float(record["failures"])
    except (TypeError, ValueError):
        return {
            "assessable": False,
            "status": "not_assessable",
            "risk_score": None,
            "risk_level": "unknown",
            "reasons": [],
            "missing_fields": [],
            "rules_version": RISK_RULES_VERSION,
        }

    if (
        not 0 <= g1 <= 20
        or not 0 <= g2 <= 20
        or absences < 0
        or failures < 0
    ):
        return {
            "assessable": False,
            "status": "not_assessable",
            "risk_score": None,
            "risk_level": "unknown",
            "reasons": [],
            "missing_fields": [],
            "rules_version": RISK_RULES_VERSION,
        }

    score = 0
    reasons = []

    if g2 < GRADE_PASS_THRESHOLD:
        score += 2
        reasons.append(
            "Second-period grade is below 10 out of 20 (+2)"
        )

    if g2 < g1:
        score += 1
        reasons.append(
            "Grade declined between the first and second periods (+1)"
        )

    if absences >= 10:
        score += 1
        reasons.append("At least 10 absences recorded (+1)")

    if failures >= 1:
        score += 1
        reasons.append("One or more previous course failures (+1)")

    if score >= HIGH_RISK_THRESHOLD:
        level = "high"
    elif score >= 1:
        level = "medium"
    else:
        level = "low"

    return {
        "assessable": True,
        "status": "assessed",
        "risk_score": score,
        "risk_level": level,
        "reasons": reasons,
        "missing_fields": [],
        "rules_version": RISK_RULES_VERSION,
        "data_note": (
            "Historical research record. This score is a provisional "
            "decision-support indicator, not a validated prediction."
        ),
    }


def assess_live_student(
    assessment_data: dict[str, Any] | None,
    attendance_data: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Live students remain not assessable until real, sufficiently
    complete assessment and attendance data are available.
    """
    if not assessment_data or not attendance_data:
        missing = []

        if not assessment_data:
            missing.append("assessment_data")

        if not attendance_data:
            missing.append("attendance_data")

        return {
            "assessable": False,
            "status": "not_yet_assessable",
            "risk_score": None,
            "risk_level": "unknown",
            "reasons": [],
            "missing_fields": missing,
            "rules_version": RISK_RULES_VERSION,
        }

    return {
        "assessable": False,
        "status": "not_yet_assessable",
        "risk_score": None,
        "risk_level": "unknown",
        "reasons": [],
        "missing_fields": [
            "validated_live_risk_policy"
        ],
        "rules_version": RISK_RULES_VERSION,
    }
