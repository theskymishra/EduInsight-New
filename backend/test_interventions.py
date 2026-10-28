import unittest
from datetime import date, timedelta

from pydantic import ValidationError

from app.routers.interventions import InterventionCreate, InterventionUpdate


class TestInterventionValidation(unittest.TestCase):
    def valid_create_data(self):
        return {
            "student_profile_id": "507f1f77bcf86cd799439011",
            "title": "Mathematics support",
            "concern": "Low mathematics assessment scores",
            "action_plan": "Provide weekly tutoring and review progress",
            "priority": "medium",
            "target_date": date.today() + timedelta(days=7),
        }

    def test_valid_intervention(self):
        intervention = InterventionCreate(**self.valid_create_data())
        self.assertEqual(intervention.priority, "medium")
        self.assertIsNone(intervention.notes)

    def test_priority_is_normalized(self):
        data = self.valid_create_data()
        data["priority"] = " HIGH "
        intervention = InterventionCreate(**data)
        self.assertEqual(intervention.priority, "high")

    def test_invalid_priority_is_rejected(self):
        data = self.valid_create_data()
        data["priority"] = "critical"
        with self.assertRaises(ValidationError):
            InterventionCreate(**data)

    def test_past_target_date_is_rejected(self):
        data = self.valid_create_data()
        data["target_date"] = date.today() - timedelta(days=1)
        with self.assertRaises(ValidationError):
            InterventionCreate(**data)

    def test_invalid_status_is_rejected(self):
        with self.assertRaises(ValidationError):
            InterventionUpdate(status="started")

    def test_valid_status_is_normalized(self):
        update = InterventionUpdate(status=" IN_PROGRESS ")
        self.assertEqual(update.status, "in_progress")

    def test_blank_follow_up_notes_can_be_cleared(self):
        update = InterventionUpdate(notes="   ")
        self.assertIsNone(update.notes)
        self.assertIn("notes", update.model_dump(exclude_unset=True))

    def test_blank_assigned_faculty_is_rejected(self):
        with self.assertRaises(ValidationError):
            InterventionUpdate(assigned_to="   ")


if __name__ == "__main__":
    unittest.main()
