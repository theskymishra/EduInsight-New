
import unittest

from app.services.risk_analysis import (
    assess_historical_record,
    assess_live_student,
)


class TestRiskAnalysis(unittest.TestCase):

    def test_low_risk_record(self):
        result = assess_historical_record({
            "G1": 14,
            "G2": 15,
            "absences": 2,
            "failures": 0,
        })

        self.assertTrue(result["assessable"])
        self.assertEqual(result["risk_score"], 0)
        self.assertEqual(result["risk_level"], "low")

    def test_medium_risk_record(self):
        result = assess_historical_record({
            "G1": 14,
            "G2": 12,
            "absences": 2,
            "failures": 0,
        })

        self.assertEqual(result["risk_score"], 1)
        self.assertEqual(result["risk_level"], "medium")

    def test_high_risk_record(self):
        result = assess_historical_record({
            "G1": 14,
            "G2": 8,
            "absences": 12,
            "failures": 1,
        })

        self.assertEqual(result["risk_score"], 5)
        self.assertEqual(result["risk_level"], "high")

    def test_missing_data_is_not_assessable(self):
        result = assess_historical_record({
            "G1": 12,
            "G2": None,
            "absences": 0,
            "failures": 0,
        })

        self.assertFalse(result["assessable"])
        self.assertIsNone(result["risk_score"])
        self.assertIn("G2", result["missing_fields"])

    def test_final_grade_does_not_affect_risk_score(self):
        record = {
            "G1": 14,
            "G2": 8,
            "absences": 12,
            "failures": 1,
        }

        first = assess_historical_record({**record, "G3": 2})
        second = assess_historical_record({**record, "G3": 19})

        self.assertEqual(first["risk_score"], second["risk_score"])

    def test_live_student_without_data_is_not_assessable(self):
        result = assess_live_student(None, None)

        self.assertFalse(result["assessable"])
        self.assertEqual(result["status"], "not_yet_assessable")
        self.assertIsNone(result["risk_score"])


if __name__ == "__main__":
    unittest.main()
