
from datetime import date, datetime, time, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pymongo.database import Database

from app.routers.auth import get_database, require_role

router = APIRouter(
    prefix="/api/students",
    tags=["Live Student Assessments"],
)

STUDENTS_COLLECTION = "students"
ASSESSMENTS_COLLECTION = "student_assessments"


class AssessmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=80)
    assessment_name: str = Field(min_length=1, max_length=120)
    score: float = Field(ge=0, allow_inf_nan=False)
    max_marks: float = Field(gt=0, allow_inf_nan=False)
    assessment_date: date
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("subject", "assessment_name")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None


def get_active_student(database: Database, student_id: str) -> dict:
    if not ObjectId.is_valid(student_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    student = database[STUDENTS_COLLECTION].find_one(
        {"_id": ObjectId(student_id), "active": True},
        {"student_id": 1, "full_name": 1},
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active student not found",
        )

    return student


def serialize_assessment(record: dict) -> dict:
    assessment_date = record["assessment_date"]

    if isinstance(assessment_date, datetime):
        assessment_date = assessment_date.date()

    return {
        "id": str(record["_id"]),
        "student_id": record["student_id"],
        "student_profile_id": str(record["student_profile_id"]),
        "subject": record["subject"],
        "assessment_name": record["assessment_name"],
        "score": record["score"],
        "max_marks": record["max_marks"],
        "percentage": round(
            record["score"] / record["max_marks"] * 100,
            2,
        ),
        "assessment_date": assessment_date.isoformat(),
        "notes": record.get("notes"),
        "created_at": record["created_at"].isoformat(),
    }


@router.post(
    "/{student_id}/assessments",
    status_code=status.HTTP_201_CREATED,
)
def create_assessment(
    student_id: str,
    body: AssessmentCreate,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    if body.score > body.max_marks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Score cannot exceed maximum marks",
        )

    if body.assessment_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assessment date cannot be in the future",
        )

    student = get_active_student(database, student_id)
    now = datetime.now(timezone.utc)

    document = {
        "student_profile_id": student["_id"],
        "student_id": student["student_id"],
        "subject": body.subject,
        "assessment_name": body.assessment_name,
        "score": body.score,
        "max_marks": body.max_marks,
        "assessment_date": datetime.combine(
            body.assessment_date,
            time.min,
            tzinfo=timezone.utc,
        ),
        "notes": body.notes,
        "created_at": now,
        "created_by": str(user["_id"]),
        "source": "live_eduinsight",
    }

    result = database[ASSESSMENTS_COLLECTION].insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_assessment(document)


@router.get("/{student_id}/assessments")
def list_assessments(
    student_id: str,
    subject: str | None = Query(default=None, max_length=80),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    student = get_active_student(database, student_id)

    query = {"student_profile_id": student["_id"]}

    if subject and subject.strip():
        query["subject"] = subject.strip()

    records = database[ASSESSMENTS_COLLECTION].find(query).sort(
        [("assessment_date", -1), ("_id", -1)]
    )

    return {
        "student_profile_id": str(student["_id"]),
        "student_id": student["student_id"],
        "items": [serialize_assessment(record) for record in records],
    }
