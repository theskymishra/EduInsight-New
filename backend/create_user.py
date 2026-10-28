import getpass
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from pwdlib import PasswordHash

load_dotenv(Path(__file__).resolve().parent / ".env")


def resolve_student_profile(database, email: str):
    normalized_email = email.strip().lower()
    profiles = list(
        database.students.find(
            {"email": normalized_email, "active": True},
            {"_id": 1},
        ).limit(2)
    )

    if len(profiles) == 0:
        raise ValueError(
            "No active student profile matches this email. "
            "Ask faculty to verify the existing student profile email."
        )

    if len(profiles) > 1:
        raise ValueError(
            "Multiple active student profiles match this email. "
            "Resolve the duplicate profiles before creating an account."
        )

    profile_id = profiles[0]["_id"]

    existing_link = database.users.find_one(
        {"student_profile_id": profile_id},
        {"_id": 1},
    )

    if existing_link:
        raise ValueError(
            "This student profile is already linked to an account."
        )

    return profile_id


def create_user_data(
    database, email: str, full_name: str, role: str, password: str
) -> dict:
    normalized_email = email.strip().lower()
    user = {
        "email": normalized_email,
        "full_name": full_name.strip(),
        "role": role.strip().lower(),
        "hashed_password": PasswordHash.recommended().hash(password),
        "active": True,
    }

    if user["role"] == "student":
        user["student_profile_id"] = resolve_student_profile(
            database, normalized_email
        )

    return user


def main():
    uri = os.getenv("MONGODB_URI")
    database_name = os.getenv("MONGODB_DATABASE", "eduinsight")

    if not uri:
        sys.exit("MONGODB_URI is missing from backend/.env")

    email = input("Account email: ").strip().lower()
    full_name = input("Full name: ").strip()
    role = input("Role (faculty/student): ").strip().lower()

    if role not in {"faculty", "student"}:
        sys.exit("Role must be faculty or student.")

    if not email or "@" not in email or not full_name:
        sys.exit("Enter a valid email and full name.")

    password = getpass.getpass("New password (minimum 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")

    if len(password) < 12:
        sys.exit("Password must contain at least 12 characters.")

    if password != confirmation:
        sys.exit("Passwords do not match.")

    client = MongoClient(uri, serverSelectionTimeoutMS=10000)

    try:
        client.admin.command("ping")
        database = client[database_name]
        database.users.create_index("email", unique=True)
        database.users.create_index(
            [("student_profile_id", 1)],
            unique=True,
            partialFilterExpression={"student_profile_id": {"$type": "objectId"}},
        )

        try:
            user = create_user_data(database, email, full_name, role, password)
        except ValueError as err:
            sys.exit(str(err))

        database.users.insert_one(user)
        print(f"Created {role} account successfully for {email}.")

    except DuplicateKeyError:
        sys.exit("An account with that email already exists.")

    except Exception as exc:
        sys.exit(
            f"Account creation failed: {type(exc).__name__}. "
            "Check your database configuration."
        )

    finally:
        client.close()
        password = ""
        confirmation = ""


if __name__ == "__main__":
    main()
