from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.database import Database

from app.routers.auth import get_database, require_role

router = APIRouter(
    prefix="/api/faculty",
    tags=["Faculty Analytics"],
)

COLLECTION_NAME = "student_performance_records"
SOURCE_DATASET = "uci_student_performance"
VALID_SUBJECTS = {"mathematics", "portuguese"}


@router.get("/dashboard")
def get_dashboard(
    subject: str = Query(default="mathematics"),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    subject = subject.strip().lower()

    if subject not in VALID_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail="Subject must be mathematics or portuguese",
        )

    collection = database[COLLECTION_NAME]

    match = {
        "source_dataset": SOURCE_DATASET,
        "subject": subject,
    }

    summary = list(
        collection.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": None,
                        "total_records": {"$sum": 1},
                        "average_g1": {"$avg": "$G1"},
                        "average_g2": {"$avg": "$G2"},
                        "average_g3": {"$avg": "$G3"},
                        "average_absences": {"$avg": "$absences"},
                        "at_risk_count": {
                            "$sum": {
                                "$cond": [
                                    {"$lt": ["$G3", 10]},
                                    1,
                                    0,
                                ]
                            }
                        },
                        "passing_count": {
                            "$sum": {
                                "$cond": [
                                    {"$gte": ["$G3", 10]},
                                    1,
                                    0,
                                ]
                            }
                        },
                    }
                },
            ]
        )
    )

    if not summary:
        return {
            "subject": subject,
            "total_records": 0,
            "average_grades": {"G1": None, "G2": None, "G3": None},
            "average_absences": None,
            "at_risk_count": 0,
            "passing_count": 0,
            "at_risk_threshold": "G3 < 10 on a 0–20 scale",
            "grade_distribution": [],
            "study_time_summary": [],
        }

    result = summary[0]
    result.pop("_id", None)

    grade_distribution = list(
        collection.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": "$G3",
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    )

    study_time_summary = list(
        collection.aggregate(
            [
                {"$match": match},
                {
                    "$group": {
                        "_id": "$studytime",
                        "students": {"$sum": 1},
                        "average_final_grade": {"$avg": "$G3"},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    )

    return {
        "subject": subject,
        "total_records": result["total_records"],
        "average_grades": {
            "G1": round(result["average_g1"], 2),
            "G2": round(result["average_g2"], 2),
            "G3": round(result["average_g3"], 2),
        },
        "average_absences": round(result["average_absences"], 2),
        "at_risk_count": result["at_risk_count"],
        "passing_count": result["passing_count"],
        "at_risk_threshold": "G3 < 10 on a 0–20 scale",
        "grade_distribution": [
            {"grade": item["_id"], "count": item["count"]}
            for item in grade_distribution
        ],
        "study_time_summary": [
            {
                "study_time_category": item["_id"],
                "students": item["students"],
                "average_final_grade": round(
                    item["average_final_grade"], 2
                ),
            }
            for item in study_time_summary
        ],
        "data_note": (
            "Historical UCI secondary-school research data; "
            "these records are not live EduInsight student accounts."
        ),
    }
