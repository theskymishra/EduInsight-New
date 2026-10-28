from datetime import datetime, time, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import DESCENDING
from pymongo.database import Database

from app.routers.auth import get_database, require_role

router = APIRouter(
    prefix="/api/student-portal",
    tags=["Student Portal"],
)

STUDENTS_COLLECTION = "students"
ASSESSMENTS_COLLECTION = "student_assessments"
ATTENDANCE_COLLECTION = "student_attendance"


def get_linked_student(database: Database, user: dict) -> dict:
    profile_id = user.get("student_profile_id")

    if not isinstance(profile_id, ObjectId):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not linked to a student profile.",
        )

    student = database[STUDENTS_COLLECTION].find_one(
        {"_id": profile_id, "active": True}
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The linked student profile is unavailable.",
        )

    return student


def serialize_assessment(record: dict) -> dict:
    assessment_date = record["assessment_date"]

    if isinstance(assessment_date, datetime):
        assessment_date = assessment_date.date()

    score = record.get("score", 0.0)
    max_marks = record.get("max_marks", 0.0)
    percentage = (
        round(score / max_marks * 100, 2)
        if max_marks and max_marks > 0
        else 0.0
    )

    return {
        "id": str(record["_id"]),
        "subject": record["subject"],
        "assessment_name": record["assessment_name"],
        "score": score,
        "max_marks": max_marks,
        "percentage": percentage,
        "assessment_date": (
            assessment_date.isoformat()
            if hasattr(assessment_date, "isoformat")
            else str(assessment_date)
        ),
        "notes": record.get("notes"),
    }


def serialize_attendance(record: dict) -> dict:
    attendance_date = record["attendance_date"]

    if isinstance(attendance_date, datetime):
        attendance_date = attendance_date.date()

    return {
        "id": str(record["_id"]),
        "attendance_date": (
            attendance_date.isoformat()
            if hasattr(attendance_date, "isoformat")
            else str(attendance_date)
        ),
        "attendance_status": record["attendance_status"],
        "notes": record.get("notes"),
    }


@router.get("/dashboard")
def student_dashboard(
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("student")),
):
    student = get_linked_student(database, user)
    profile_id = student["_id"]

    assessments = database[ASSESSMENTS_COLLECTION].find(
        {"student_profile_id": profile_id},
        {
            "_id": 1,
            "subject": 1,
            "assessment_name": 1,
            "score": 1,
            "max_marks": 1,
            "assessment_date": 1,
            "notes": 1,
        },
    ).sort(
        [("assessment_date", DESCENDING), ("_id", DESCENDING)]
    )

    assessment_items = [
        serialize_assessment(record) for record in assessments
    ]

    attendance_pipeline = [
        {"$match": {"student_profile_id": profile_id}},
        {
            "$group": {
                "_id": "$attendance_status",
                "count": {"$sum": 1},
            }
        },
    ]

    counts = {"Present": 0, "Absent": 0, "Leave": 0}

    for item in database[ATTENDANCE_COLLECTION].aggregate(
        attendance_pipeline
    ):
        if item["_id"] in counts:
            counts[item["_id"]] = item["count"]

    attendance_total = sum(counts.values())
    attended_or_missed = counts["Present"] + counts["Absent"]

    attendance_percentage = (
        round(counts["Present"] / attended_or_missed * 100, 2)
        if attended_or_missed
        else None
    )

    attendance_records = database[ATTENDANCE_COLLECTION].find(
        {"student_profile_id": profile_id},
        {
            "_id": 1,
            "attendance_date": 1,
            "attendance_status": 1,
            "notes": 1,
        },
    ).sort([("attendance_date", DESCENDING), ("_id", DESCENDING)])

    attendance_items = [
        serialize_attendance(record) for record in attendance_records
    ]

    percentages = [item["percentage"] for item in assessment_items]
    average_percentage = (
        round(sum(percentages) / len(percentages), 2)
        if percentages
        else None
    )

    return {
        "profile": {
            "student_id": student["student_id"],
            "full_name": student["full_name"],
            "email": student.get("email"),
            "class_name": student.get("class_name"),
            "department": student.get("department"),
            "enrollment_year": student.get("enrollment_year"),
        },
        "assessments": {
            "total": len(assessment_items),
            "average_percentage": average_percentage,
            "items": assessment_items,
        },
        "attendance": {
            "total_records": attendance_total,
            "present": counts["Present"],
            "absent": counts["Absent"],
            "leave": counts["Leave"],
            "attendance_percentage": attendance_percentage,
            "percentage_basis": (
                "Present / (Present + Absent); Leave excluded"
            ),
            "items": attendance_items,
        },
    }
