
from datetime import date, datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pymongo.database import Database

from app.routers.auth import get_database, require_role
from app.routers.assessments import get_active_student

router = APIRouter(
    prefix="/api/interventions",
    tags=["Student Interventions"],
)

COLLECTION_NAME = "student_interventions"

VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_STATUSES = {"planned", "in_progress", "completed", "on_hold"}


class InterventionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_profile_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=3, max_length=120)
    concern: str = Field(min_length=3, max_length=1000)
    action_plan: str = Field(min_length=3, max_length=2000)
    priority: str = "medium"
    assigned_to: str | None = Field(default=None, max_length=120)
    target_date: date
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("title", "concern", "action_plan")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in VALID_PRIORITIES:
            raise ValueError("Invalid intervention priority")
        return value

    @field_validator("assigned_to", "notes")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Target date cannot be in the past")
        return value


class InterventionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = Field(default=None, max_length=120)
    target_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip().lower()
        if value not in VALID_STATUSES:
            raise ValueError("Invalid intervention status")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip().lower()
        if value not in VALID_PRIORITIES:
            raise ValueError("Invalid intervention priority")
        return value

    @field_validator("assigned_to", "notes")
    @classmethod
    def clean_optional_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            if info.field_name == "notes":
                return None
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("Target date cannot be in the past")
        return value


def serialize_intervention(record: dict) -> dict:
    target_date = record["target_date"]
    if isinstance(target_date, datetime):
        target_date = target_date.date()

    created_at = record["created_at"]
    updated_at = record["updated_at"]

    return {
        "id": str(record["_id"]),
        "student_profile_id": str(record["student_profile_id"]),
        "student_id": record["student_id"],
        "student_name": record["student_name"],
        "title": record["title"],
        "concern": record["concern"],
        "action_plan": record["action_plan"],
        "priority": record["priority"],
        "status": record["status"],
        "assigned_to": record.get("assigned_to"),
        "target_date": target_date.isoformat(),
        "notes": record.get("notes"),
        "created_at": created_at.isoformat(),
        "updated_at": updated_at.isoformat(),
        "created_by": record["created_by"],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_intervention(
    body: InterventionCreate,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    if not ObjectId.is_valid(body.student_profile_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active student not found",
        )

    student = get_active_student(database, body.student_profile_id)
    now = datetime.now(timezone.utc)

    document = {
        "student_profile_id": student["_id"],
        "student_id": student["student_id"],
        "student_name": student["full_name"],
        "title": body.title,
        "concern": body.concern,
        "action_plan": body.action_plan,
        "priority": body.priority,
        "status": "planned",
        "assigned_to": body.assigned_to,
        "target_date": datetime.combine(
            body.target_date, datetime.min.time(), tzinfo=timezone.utc
        ),
        "notes": body.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": str(user["_id"]),
    }

    result = database[COLLECTION_NAME].insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_intervention(document)


@router.get("")
def list_interventions(
    student_profile_id: str | None = Query(default=None),
    intervention_status: str | None = Query(default=None, alias="status"),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    query = {}

    if student_profile_id:
        if not ObjectId.is_valid(student_profile_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid student profile ID",
            )
        query["student_profile_id"] = ObjectId(student_profile_id)

    if intervention_status:
        intervention_status = intervention_status.strip().lower()
        if intervention_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid intervention status",
            )
        query["status"] = intervention_status

    collection = database[COLLECTION_NAME]
    records = collection.find(query).sort(
        [("target_date", 1), ("created_at", -1)]
    )

    return {
        "items": [serialize_intervention(record) for record in records],
        "total": collection.count_documents(query),
    }


@router.patch("/{intervention_id}")
def update_intervention(
    intervention_id: str,
    body: InterventionUpdate,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    if not ObjectId.is_valid(intervention_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervention not found",
        )

    changes = body.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update",
        )

    if any(
        value is None and field != "notes"
        for field, value in changes.items()
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Updated fields cannot be null, except notes",
        )

    if "target_date" in changes:
        changes["target_date"] = datetime.combine(
            changes["target_date"], datetime.min.time(), tzinfo=timezone.utc
        )

    changes["updated_at"] = datetime.now(timezone.utc)

    collection = database[COLLECTION_NAME]
    result = collection.update_one(
        {"_id": ObjectId(intervention_id)},
        {"$set": changes},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intervention not found",
        )

    record = collection.find_one({"_id": ObjectId(intervention_id)})
    return serialize_intervention(record)
