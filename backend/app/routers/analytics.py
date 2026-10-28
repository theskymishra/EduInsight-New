from collections import defaultdict

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.routers.auth import get_database, require_role

router = APIRouter(
    prefix="/api/analytics",
    tags=["Live Performance Analytics"],
)


@router.get("/performance")
def performance_analytics(
    database: Database = Depends(get_database),
    user: dict = Depends(require_role("faculty")),
):
    students = list(
        database["students"].find(
            {"active": True},
            {
                "student_id": 1,
                "full_name": 1,
                "department": 1,
                "class_name": 1,
            },
        ).sort("full_name", 1)
    )

    student_ids = [student["_id"] for student in students]
    student_id_strings = [str(student_id) for student_id in student_ids]

    assessments = list(
        database["student_assessments"].find(
            {"student_profile_id": {"$in": student_ids}},
            {
                "student_profile_id": 1,
                "subject": 1,
                "score": 1,
                "max_marks": 1,
                "assessment_name": 1,
                "assessment_date": 1,
            },
        )
    ) if student_ids else []

    attendance = list(
        database["student_attendance"].find(
            {"student_profile_id": {"$in": student_ids}},
            {
                "student_profile_id": 1,
                "attendance_status": 1,
            },
        )
    ) if student_ids else []

    assessment_by_student = defaultdict(list)
    subject_data = defaultdict(lambda: {"total_percentage": 0.0, "count": 0})
    attendance_by_student = defaultdict(
        lambda: {"Present": 0, "Absent": 0, "Leave": 0}
    )

    for record in assessments:
        profile_id = str(record["student_profile_id"])
        max_marks = record.get("max_marks", 0)
        if not max_marks:
            continue

        percentage = round(record.get("score", 0) / max_marks * 100, 2)
        assessment_by_student[profile_id].append(percentage)

        subject = record.get("subject", "Unspecified")
        subject_data[subject]["total_percentage"] += percentage
        subject_data[subject]["count"] += 1

    for record in attendance:
        profile_id = str(record["student_profile_id"])
        status_value = record.get("attendance_status")
        if status_value in ("Present", "Absent", "Leave"):
            attendance_by_student[profile_id][status_value] += 1

    student_rows = []
    for student in students:
        profile_id = str(student["_id"])
        marks = assessment_by_student[profile_id]
        counts = attendance_by_student[profile_id]
        attendance_denominator = counts["Present"] + counts["Absent"]

        student_rows.append({
            "id": profile_id,
            "student_id": student.get("student_id", ""),
            "full_name": student.get("full_name", "Unnamed student"),
            "department": student.get("department", ""),
            "class_name": student.get("class_name", ""),
            "assessment_count": len(marks),
            "average_percentage": round(sum(marks) / len(marks), 2) if marks else None,
            "attendance_records": sum(counts.values()),
            "present": counts["Present"],
            "absent": counts["Absent"],
            "leave": counts["Leave"],
            "attendance_percentage": (
                round(counts["Present"] / attendance_denominator * 100, 2)
                if attendance_denominator else None
            ),
        })

    all_percentages = [
        row["percentage"]
        for record in assessments
        if record.get("max_marks")
        for row in [{
            "percentage": record.get("score", 0) / record["max_marks"] * 100
        }]
    ]

    all_present = sum(row["present"] for row in student_rows)
    all_absent = sum(row["absent"] for row in student_rows)
    attendance_denominator = all_present + all_absent

    subjects = [
        {
            "subject": subject,
            "assessment_count": values["count"],
            "average_percentage": round(
                values["total_percentage"] / values["count"], 2
            ),
        }
        for subject, values in sorted(subject_data.items())
    ]

    return {
        "summary": {
            "active_students": len(students),
            "assessment_count": len(assessments),
            "average_assessment_percentage": (
                round(sum(all_percentages) / len(all_percentages), 2)
                if all_percentages else None
            ),
            "attendance_records": len(attendance),
            "present": all_present,
            "absent": all_absent,
            "leave": sum(row["leave"] for row in student_rows),
            "attendance_percentage": (
                round(all_present / attendance_denominator * 100, 2)
                if attendance_denominator else None
            ),
        },
        "subjects": subjects,
        "students": student_rows,
        "data_source": "Live EduInsight student assessments and attendance",
    }
