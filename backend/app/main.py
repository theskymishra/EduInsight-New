
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_mongo_client, get_database
from app.routers.auth import router as auth_router
from app.routers.analytics import router as analytics_router
from app.routers.faculty import router as faculty_router
from app.routers.students import router as students_router
from app.routers.early_warning import router as early_warning_router
from app.routers.assessments import router as assessments_router
from app.routers import attendance
from app.routers import interventions
from app.routers import student_portal


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    try:
        client.admin.command("ping")
        database = get_database(client)

        database.users.create_index("email", unique=True)
        database.users.create_index(
            [("student_profile_id", 1)],
            unique=True,
            partialFilterExpression={"student_profile_id": {"$type": "objectId"}},
        )

        database.students.create_index(
            [("student_id", 1)],
            unique=True,
            partialFilterExpression={"student_id": {"$type": "string"}},
        )

        database.students.create_index(
            [("email", 1)],
            unique=True,
            partialFilterExpression={"email": {"$type": "string"}},
        )

        database.student_attendance.create_index(
            [
                ("student_profile_id", 1),
                ("attendance_date", 1),
            ],
            unique=True,
            name="unique_student_attendance_date",
        )

        app.state.mongo_client = client
        app.state.database = database
        yield
    finally:
        client.close()


app = FastAPI(
    title="EduInsight API",
    description="Student performance analytics and reporting system",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(faculty_router)
app.include_router(students_router)
app.include_router(early_warning_router)
app.include_router(assessments_router)
app.include_router(attendance.router)
app.include_router(interventions.router)
app.include_router(student_portal.router)

@app.get("/")
def root():
    return {
        "name": "EduInsight API",
        "version": "0.1.0",
        "message": "API is running",
    }


@app.get("/api/health")
def health(request: Request):
    request.app.state.database.command("ping")

    return {
        "status": "healthy",
        "service": "EduInsight API",
        "database": "connected",
    }
