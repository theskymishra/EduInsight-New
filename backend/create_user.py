import getpass
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from pwdlib import PasswordHash

load_dotenv(Path(__file__).resolve().parent / ".env")

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

    user = {
        "email": email,
        "full_name": full_name,
        "role": role,
        "hashed_password": PasswordHash.recommended().hash(password),
        "active": True,
    }

    database.users.insert_one(user)
    print(f"Created {role} account successfully for {email}.")

except DuplicateKeyError:
    sys.exit("An account with that email already exists.")
except Exception as exc:
    sys.exit(f"Account creation failed: {type(exc).__name__}. Check your database configuration.")
finally:
    client.close()
    password = ""
    confirmation = ""
