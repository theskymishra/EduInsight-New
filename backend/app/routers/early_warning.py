
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.routers.auth import get_database, require_role
from app.services.risk_analysis import assess_historical_record


router = APIRouter(
    prefix="/api/early-warning",
    tags=["Early Warning and Intervention"],
)

COLLECTION_NAME = "student_performance_records"
SOURCE_DATASET = "uci_student_performance"
VALID_SUBJECTS = {"mathematics", "portuguese"}


@router.get("/historical")
def get_historical_risk_analysis(
    subject: str = Query(default="mathematics"),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    subject = subject.strip().lower()

    if subject not in VALID_SUBJECTS:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail="Subject must be mathematics or portuguese",
        )

    query = {
        "source_dataset": SOURCE_DATASET,
        "subject": subject,
    }

    projection = {
        "_id": 0,
        "dataset_id": 1,
        "G1": 1,
        "G2": 1,
        "G3": 1,
        "absences": 1,
        "failures": 1,
    }

    records = database[COLLECTION_NAME].find(query, projection).sort(
        "dataset_id", 1
    )

    totals = defaultdict(
        lambda: {
            "students": 0,
            "final_grade_below_10": 0,
            "final_grade_10_or_above": 0,
            "final_grade_sum": 0.0,
        }
    )

    items = []
    total_records = 0
    assessable_records = 0
    outcome_records = 0

    for record in records:
        total_records += 1
        result = assess_historical_record(record)
        final_grade = record.get("G3")

        if result["assessable"]:
            assessable_records += 1

        if result["assessable"] and final_grade is not None:
            group = totals[result["risk_level"]]
            grade = float(final_grade)

            group["students"] += 1
            group["final_grade_sum"] += grade
            outcome_records += 1

            if grade < 10:
                group["final_grade_below_10"] += 1
            else:
                group["final_grade_10_or_above"] += 1

        items.append({
            "dataset_id": record.get("dataset_id"),
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "assessable": result["assessable"],
            "reasons": result["reasons"],
            "missing_fields": result["missing_fields"],
            "final_grade": final_grade,
        })

    summary = []

    for level in ("high", "medium", "low"):
        group = totals[level]
        count = group["students"]

        summary.append({
            "risk_level": level,
            "students": count,
            "final_grade_below_10": group["final_grade_below_10"],
            "final_grade_10_or_above": group["final_grade_10_or_above"],
            "below_10_outcome_rate": (
                round(
                    group["final_grade_below_10"] / count * 100,
                    2,
                )
                if count
                else None
            ),
            "average_final_grade": (
                round(group["final_grade_sum"] / count, 2)
                if count
                else None
            ),
        })

    return {
        "subject": subject,
        "source_dataset": SOURCE_DATASET,
        "data_type": "historical_research",
        "rules_version": "1.0",
        "total_records": total_records,
        "assessable_records": assessable_records,
        "outcome_records": outcome_records,
        "risk_summary": summary,
        "items": items,
        "methodology": {
            "score_inputs": ["G1", "G2", "absences", "failures"],
            "final_grade_used_for_scoring": False,
            "final_grade_used_for_retrospective_evaluation": True,
            "high_risk_score": "3 or more",
            "medium_risk_score": "1 to 2",
            "low_risk_score": "0",
            "limitations": (
                "Provisional rules evaluated on historical records. "
                "This is not a validated predictive model. Historical "
                "records are not live EduInsight student accounts."
            ),
        },
    }
