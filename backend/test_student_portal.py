import unittest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock

from bson import ObjectId
from fastapi import HTTPException

from app.routers.auth import require_role
from app.routers.student_portal import (
    get_linked_student,
    serialize_assessment,
    serialize_attendance,
    student_dashboard,
)
from create_user import create_user_data, resolve_student_profile


class FakeCollection:
    def __init__(self, data=None):
        self._data = list(data or [])

    def find_one(self, query, projection=None):
        for item in self._data:
            if self._matches(item, query):
                return item
        return None

    def find(self, query=None, projection=None):
        query = query or {}
        matched = [item for item in self._data if self._matches(item, query)]
        return FakeCursor(matched)

    def aggregate(self, pipeline):
        # Support simple group by status pipeline
        match_query = {}
        for stage in pipeline:
            if "$match" in stage:
                match_query = stage["$match"]
        matched = [item for item in self._data if self._matches(item, match_query)]
        counts = {}
        for item in matched:
            status = item.get("attendance_status")
            counts[status] = counts.get(status, 0) + 1
        return [{"_id": k, "count": v} for k, v in counts.items()]

    def _matches(self, item, query):
        for k, v in query.items():
            if k == "$or":
                if not any(self._matches(item, sub) for sub in v):
                    return False
            elif item.get(k) != v:
                return False
        return True


class FakeCursor:
    def __init__(self, data):
        self._data = list(data)

    def sort(self, key_or_list):
        return self

    def limit(self, count):
        return FakeCursor(self._data[:count])

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)


class FakeDatabase:
    def __init__(self):
        self.students = FakeCollection()
        self.users = FakeCollection()
        self.student_assessments = FakeCollection()
        self.student_attendance = FakeCollection()

    def __getitem__(self, name):
        return getattr(self, name)


class TestStudentProfileLinking(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.student_id = ObjectId()
        self.student_email = "student@university.edu"

    def test_link_student_success(self):
        self.db.students._data.append({
            "_id": self.student_id,
            "student_id": "STU1001",
            "full_name": "Jane Doe",
            "email": self.student_email,
            "active": True,
        })

        resolved_id = resolve_student_profile(self.db, "  STUDENT@university.edu  ")
        self.assertEqual(resolved_id, self.student_id)

        user_data = create_user_data(
            self.db,
            "STUDENT@university.edu",
            "Jane Doe",
            "student",
            "securepassword123",
        )
        self.assertEqual(user_data["role"], "student")
        self.assertEqual(user_data["student_profile_id"], self.student_id)
        self.assertTrue(user_data["active"])

    def test_reject_when_no_active_profile_matches(self):
        with self.assertRaises(ValueError) as ctx:
            resolve_student_profile(self.db, "missing@university.edu")
        self.assertIn("No active student profile matches", str(ctx.exception))

    def test_reject_when_profile_is_inactive(self):
        self.db.students._data.append({
            "_id": self.student_id,
            "student_id": "STU1001",
            "full_name": "Jane Doe",
            "email": self.student_email,
            "active": False,
        })
        with self.assertRaises(ValueError) as ctx:
            resolve_student_profile(self.db, self.student_email)
        self.assertIn("No active student profile matches", str(ctx.exception))

    def test_reject_when_multiple_active_profiles_match(self):
        self.db.students._data.extend([
            {
                "_id": ObjectId(),
                "student_id": "STU1001",
                "email": self.student_email,
                "active": True,
            },
            {
                "_id": ObjectId(),
                "student_id": "STU1002",
                "email": self.student_email,
                "active": True,
            },
        ])
        with self.assertRaises(ValueError) as ctx:
            resolve_student_profile(self.db, self.student_email)
        self.assertIn("Multiple active student profiles match", str(ctx.exception))

    def test_reject_when_profile_already_linked(self):
        self.db.students._data.append({
            "_id": self.student_id,
            "student_id": "STU1001",
            "email": self.student_email,
            "active": True,
        })
        self.db.users._data.append({
            "_id": ObjectId(),
            "email": self.student_email,
            "student_profile_id": self.student_id,
        })
        with self.assertRaises(ValueError) as ctx:
            resolve_student_profile(self.db, self.student_email)
        self.assertIn("already linked to an account", str(ctx.exception))

    def test_faculty_role_does_not_attach_profile_id(self):
        user_data = create_user_data(
            self.db,
            "faculty@university.edu",
            "Dr. Smith",
            "faculty",
            "facultysecret123",
        )
        self.assertEqual(user_data["role"], "faculty")
        self.assertNotIn("student_profile_id", user_data)


class TestStudentPortalSecurityAndDashboard(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.student_profile_id = ObjectId()
        self.active_student = {
            "_id": self.student_profile_id,
            "student_id": "STU2001",
            "full_name": "Alex Mercer",
            "email": "alex@university.edu",
            "class_name": "CS-101",
            "department": "Computer Science",
            "enrollment_year": 2024,
            "active": True,
        }
        self.db.students._data.append(self.active_student)

    def test_get_linked_student_success(self):
        user = {
            "_id": ObjectId(),
            "role": "student",
            "student_profile_id": self.student_profile_id,
        }
        student = get_linked_student(self.db, user)
        self.assertEqual(student["_id"], self.student_profile_id)
        self.assertEqual(student["student_id"], "STU2001")

    def test_get_linked_student_missing_profile_id_rejected(self):
        user = {"_id": ObjectId(), "role": "student"}
        with self.assertRaises(HTTPException) as ctx:
            get_linked_student(self.db, user)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("not linked to a student profile", ctx.exception.detail)

    def test_get_linked_student_invalid_profile_id_rejected(self):
        user = {
            "_id": ObjectId(),
            "role": "student",
            "student_profile_id": "not-an-object-id",
        }
        with self.assertRaises(HTTPException) as ctx:
            get_linked_student(self.db, user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_get_linked_student_inactive_profile_rejected(self):
        inactive_id = ObjectId()
        self.db.students._data.append({
            "_id": inactive_id,
            "student_id": "STU9999",
            "full_name": "Ghost Student",
            "email": "ghost@university.edu",
            "active": False,
        })
        user = {
            "_id": ObjectId(),
            "role": "student",
            "student_profile_id": inactive_id,
        }
        with self.assertRaises(HTTPException) as ctx:
            get_linked_student(self.db, user)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("unavailable", ctx.exception.detail)

    def test_role_enforcement(self):
        faculty_user = {"_id": ObjectId(), "role": "faculty"}
        student_user = {
            "_id": ObjectId(),
            "role": "student",
            "student_profile_id": self.student_profile_id,
        }

        faculty_guard = require_role("faculty")
        student_guard = require_role("student")

        # Faculty can access faculty routes, student cannot
        self.assertEqual(faculty_guard(faculty_user)["role"], "faculty")
        with self.assertRaises(HTTPException) as ctx:
            faculty_guard(student_user)
        self.assertEqual(ctx.exception.status_code, 403)

        # Student can access student routes, faculty cannot
        self.assertEqual(student_guard(student_user)["role"], "student")
        with self.assertRaises(HTTPException) as ctx:
            student_guard(faculty_user)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_student_dashboard_full_data_and_calculations(self):
        # Add assessments
        self.db.student_assessments._data.extend([
            {
                "_id": ObjectId(),
                "student_profile_id": self.student_profile_id,
                "subject": "Mathematics",
                "assessment_name": "Midterm Exam",
                "score": 85,
                "max_marks": 100,
                "assessment_date": datetime(2026, 10, 10, tzinfo=timezone.utc),
                "notes": "Good performance",
            },
            {
                "_id": ObjectId(),
                "student_profile_id": self.student_profile_id,
                "subject": "Mathematics",
                "assessment_name": "Quiz 1",
                "score": 45,
                "max_marks": 50,
                "assessment_date": datetime(2026, 9, 20, tzinfo=timezone.utc),
                "notes": None,
            },
        ])

        # Add attendance: 8 Present, 2 Absent, 3 Leave
        for _ in range(8):
            self.db.student_attendance._data.append({
                "_id": ObjectId(),
                "student_profile_id": self.student_profile_id,
                "attendance_date": date(2026, 10, 1),
                "attendance_status": "Present",
                "notes": None,
            })
        for _ in range(2):
            self.db.student_attendance._data.append({
                "_id": ObjectId(),
                "student_profile_id": self.student_profile_id,
                "attendance_date": date(2026, 10, 2),
                "attendance_status": "Absent",
                "notes": "Doctor appointment",
            })
        for _ in range(3):
            self.db.student_attendance._data.append({
                "_id": ObjectId(),
                "student_profile_id": self.student_profile_id,
                "attendance_date": date(2026, 10, 3),
                "attendance_status": "Leave",
                "notes": "Approved leave",
            })

        user = {
            "_id": ObjectId(),
            "role": "student",
            "student_profile_id": self.student_profile_id,
        }

        data = student_dashboard(database=self.db, user=user)

        # Verify profile
        self.assertEqual(data["profile"]["student_id"], "STU2001")
        self.assertEqual(data["profile"]["full_name"], "Alex Mercer")
        self.assertEqual(data["profile"]["department"], "Computer Science")

        # Verify assessments
        self.assertEqual(data["assessments"]["total"], 2)
        # 85% and 90% -> average is 87.5%
        self.assertEqual(data["assessments"]["average_percentage"], 87.5)
        self.assertEqual(len(data["assessments"]["items"]), 2)

        # Verify attendance: 8 Present / (8 Present + 2 Absent) * 100 = 80.0%
        # Leave (3) is excluded from denominator
        self.assertEqual(data["attendance"]["total_records"], 13)
        self.assertEqual(data["attendance"]["present"], 8)
        self.assertEqual(data["attendance"]["absent"], 2)
        self.assertEqual(data["attendance"]["leave"], 3)
        self.assertEqual(data["attendance"]["attendance_percentage"], 80.0)
        self.assertEqual(len(data["attendance"]["items"]), 13)

    def test_student_dashboard_empty_states(self):
        user = {
            "_id": ObjectId(),
            "role": "student",
            "student_profile_id": self.student_profile_id,
        }

        data = student_dashboard(database=self.db, user=user)

        self.assertEqual(data["assessments"]["total"], 0)
        self.assertIsNone(data["assessments"]["average_percentage"])
        self.assertEqual(data["assessments"]["items"], [])

        self.assertEqual(data["attendance"]["total_records"], 0)
        self.assertEqual(data["attendance"]["present"], 0)
        self.assertEqual(data["attendance"]["absent"], 0)
        self.assertEqual(data["attendance"]["leave"], 0)
        self.assertIsNone(data["attendance"]["attendance_percentage"])
        self.assertEqual(data["attendance"]["items"], [])


if __name__ == "__main__":
    unittest.main()
