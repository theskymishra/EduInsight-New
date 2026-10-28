
from datetime import date, datetime, time, timezone
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.routers.auth import get_database, require_role

router = APIRouter(
    prefix="/api/students",
    tags=["Live Student Attendance"],
)

STUDENTS_COLLECTION = "students"
ATTENDANCE_COLLECTION = "student_attendance"

AttendanceStatus = Literal["Present", "Absent", "Leave"]


class AttendanceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attendance_date: date
    attendance_status: AttendanceStatus
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
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


def serialize_attendance(record: dict) -> dict:
    attendance_date = record["attendance_date"]

    if isinstance(attendance_date, datetime):
        attendance_date = attendance_date.date()

    return {
        "id": str(record["_id"]),
        "student_id": record["student_id"],
        "student_profile_id": str(record["student_profile_id"]),
        "attendance_date": attendance_date.isoformat(),
        "attendance_status": record["attendance_status"],
        "notes": record.get("notes"),
        "created_at": record["created_at"].isoformat(),
        "updated_at": record["updated_at"].isoformat(),
    }


@router.post(
    "/{student_id}/attendance",
    status_code=status.HTTP_201_CREATED,
)
def create_attendance(
    student_id: str,
    body: AttendanceCreate,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    if body.attendance_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Attendance date cannot be in the future",
        )

    student = get_active_student(database, student_id)
    attendance_date = datetime.combine(
        body.attendance_date,
        time.min,
        tzinfo=timezone.utc,
    )

    collection = database[ATTENDANCE_COLLECTION]

    existing = collection.find_one(
        {
            "student_profile_id": student["_id"],
            "attendance_date": attendance_date,
        }
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance has already been recorded for this student and date",
        )

    now = datetime.now(timezone.utc)

    document = {
        "student_profile_id": student["_id"],
        "student_id": student["student_id"],
        "attendance_date": attendance_date,
        "attendance_status": body.attendance_status,
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": str(user["_id"]),
        "source": "live_eduinsight",
    }

    result = collection.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_attendance(document)


@router.get("/{student_id}/attendance")
def list_attendance(
    student_id: str,
    attendance_status: AttendanceStatus | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be after end_date",
        )

    student = get_active_student(database, student_id)

    query = {"student_profile_id": student["_id"]}

    if attendance_status:
        query["attendance_status"] = attendance_status

    if start_date or end_date:
        date_filter = {}

        if start_date:
            date_filter["$gte"] = datetime.combine(
                start_date, time.min, tzinfo=timezone.utc
            )

        if end_date:
            date_filter["$lte"] = datetime.combine(
                end_date, time.min, tzinfo=timezone.utc
            )

        query["attendance_date"] = date_filter

    records = database[ATTENDANCE_COLLECTION].find(query).sort(
        [("attendance_date", DESCENDING), ("_id", DESCENDING)]
    )

    return {
        "student_profile_id": str(student["_id"]),
        "student_id": student["student_id"],
        "items": [serialize_attendance(record) for record in records],
    }


@router.get("/{student_id}/attendance/summary")
def attendance_summary(
    student_id: str,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be after end_date",
        )

    student = get_active_student(database, student_id)

    match = {"student_profile_id": student["_id"]}

    date_filter = {}

    if start_date:
        date_filter["$gte"] = datetime.combine(
            start_date, time.min, tzinfo=timezone.utc
        )

    if end_date:
        date_filter["$lte"] = datetime.combine(
            end_date, time.min, tzinfo=timezone.utc
        )

    if date_filter:
        match["attendance_date"] = date_filter

    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": "$attendance_status",
                "count": {"$sum": 1},
            }
        },
    ]

    counts = {
        "Present": 0,
        "Absent": 0,
        "Leave": 0,
    }

    for item in database[ATTENDANCE_COLLECTION].aggregate(pipeline):
        counts[item["_id"]] = item["count"]

    total = sum(counts.values())
    attended_or_missed = counts["Present"] + counts["Absent"]

    attendance_percentage = (
        round(counts["Present"] / attended_or_missed * 100, 2)
        if attended_or_missed
        else None
    )

    return {
        "student_profile_id": str(student["_id"]),
        "student_id": student["student_id"],
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "total_records": total,
        "present": counts["Present"],
        "absent": counts["Absent"],
        "leave": counts["Leave"],
        "attendance_percentage": attendance_percentage,
        "percentage_basis": "Present / (Present + Absent); Leave excluded",
    }
