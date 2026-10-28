
import re
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database

from app.routers.auth import get_database, require_role

router = APIRouter(
    prefix="/api/students",
    tags=["Student Management"],
)

COLLECTION_NAME = "students"


class StudentCreate(BaseModel):
    student_id: str = Field(min_length=1, max_length=40)
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    class_name: str = Field(min_length=1, max_length=60)
    department: str = Field(min_length=1, max_length=100)
    enrollment_year: int = Field(ge=2000, le=2100)

    @field_validator("student_id", "full_name", "class_name", "department")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", value):
            raise ValueError(
                "Student ID may contain letters, numbers, hyphens, and underscores only"
            )
        return value


class StudentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_id: str | None = Field(default=None, min_length=1, max_length=40)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    class_name: str | None = Field(default=None, min_length=1, max_length=60)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    enrollment_year: int | None = Field(default=None, ge=2000, le=2100)

    @field_validator(
        "student_id", "full_name", "class_name", "department"
    )
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[A-Za-z0-9_-]+", value):
            raise ValueError(
                "Student ID may contain letters, numbers, hyphens, and underscores only"
            )
        return value


def serialize_student(student: dict) -> dict:
    mongo_id = str(student["_id"])
    return {
        # Keep both keys for compatibility with frontend components:
        # "id" is the API-facing identifier; "_id" matches existing UI usage.
        "id": mongo_id,
        "_id": mongo_id,
        "student_id": student["student_id"],
        "full_name": student["full_name"],
        "email": student["email"],
        "class_name": student["class_name"],
        "department": student["department"],
        "enrollment_year": student["enrollment_year"],
        "active": student["active"],
        "created_at": student["created_at"].isoformat(),
        "updated_at": student["updated_at"].isoformat(),
    }


def get_student_or_404(database: Database, student_id: str) -> dict:
    if not ObjectId.is_valid(student_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    student = database[COLLECTION_NAME].find_one(
        {"_id": ObjectId(student_id), "active": True}
    )
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return student


def ensure_unique_student(
    database: Database,
    student_id: str,
    email: str,
    exclude_object_id: ObjectId | None = None,
) -> None:
    collection = database[COLLECTION_NAME]
    query = {
        "$or": [
            {"student_id": student_id},
            {"email": email},
        ]
    }
    if exclude_object_id is not None:
        query["_id"] = {"$ne": exclude_object_id}

    existing = collection.find_one(query, {"student_id": 1, "email": 1})
    if existing:
        if existing.get("student_id") == student_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A student with this student ID already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with this email already exists",
        )


@router.get("")
def list_students(
    search: str = Query(default="", max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    collection = database[COLLECTION_NAME]
    query = {"active": True}
    term = search.strip()

    if term:
        escaped = re.escape(term)
        query["$or"] = [
            {"student_id": {"$regex": escaped, "$options": "i"}},
            {"full_name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
        ]

    total = collection.count_documents(query)
    records = collection.find(query).sort(
        [("full_name", ASCENDING), ("_id", ASCENDING)]
    ).skip((page - 1) * page_size).limit(page_size)

    return {
        "items": [serialize_student(record) for record in records],
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_student(
    body: StudentCreate,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    collection = database[COLLECTION_NAME]
    student_id = body.student_id.strip()
    email = str(body.email).strip().lower()

    ensure_unique_student(database, student_id, email)

    now = datetime.now(timezone.utc)
    document = {
        **body.model_dump(exclude={"student_id", "email"}),
        "student_id": student_id,
        "email": email,
        "active": True,
        "created_at": now,
        "updated_at": now,
        "created_by": str(user["_id"]),
    }

    result = collection.insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_student(document)


@router.get("/{student_id}")
def get_student(
    student_id: str,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    return serialize_student(get_student_or_404(database, student_id))


@router.patch("/{student_id}")
def update_student(
    student_id: str,
    body: StudentUpdate,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    student = get_student_or_404(database, student_id)
    changes = body.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update",
        )

    if any(value is None for value in changes.values()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Updated fields cannot be null",
        )

    if "student_id" in changes or "email" in changes:
        ensure_unique_student(
            database,
            changes.get("student_id", student["student_id"]),
            str(changes.get("email", student["email"])).strip().lower(),
            exclude_object_id=student["_id"],
        )

    if "email" in changes:
        changes["email"] = str(changes["email"]).strip().lower()

    changes["updated_at"] = datetime.now(timezone.utc)

    database[COLLECTION_NAME].update_one(
        {"_id": student["_id"], "active": True},
        {"$set": changes},
    )

    updated = database[COLLECTION_NAME].find_one(
        {"_id": student["_id"], "active": True}
    )
    return serialize_student(updated)


@router.delete("/{student_id}")
def deactivate_student(
    student_id: str,
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    student = get_student_or_404(database, student_id)

    database[COLLECTION_NAME].update_one(
        {"_id": student["_id"]},
        {
            "$set": {
                "active": False,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "message": "Student deactivated successfully",
        "student_id": student["student_id"],
    }
