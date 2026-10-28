import csv
from pathlib import Path

from pymongo import UpdateOne

from app.core.database import create_mongo_client, get_database


PROJECT_ROOT = Path(__file__).resolve().parent
CSV_FILE = (
    PROJECT_ROOT
    / "data"
    / "uci_student_performance"
    / "student-mat.csv"
)

COLLECTION_NAME = "student_performance_records"
SOURCE_DATASET = "uci_student_performance"
SUBJECT = "mathematics"

INTEGER_FIELDS = {
    "age",
    "Medu",
    "Fedu",
    "traveltime",
    "studytime",
    "failures",
    "famrel",
    "freetime",
    "goout",
    "Dalc",
    "Walc",
    "health",
    "absences",
    "G1",
    "G2",
    "G3",
}


def convert_value(field, value):
    value = value.strip()

    if field in INTEGER_FIELDS:
        return int(value)

    return value


def main():
    if not CSV_FILE.is_file():
        raise FileNotFoundError(f"Dataset not found: {CSV_FILE}")

    with CSV_FILE.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file, delimiter=";")

        if not reader.fieldnames or not {"G1", "G2", "G3"}.issubset(
            reader.fieldnames
        ):
            raise ValueError("CSV is missing expected grade columns.")

        operations = []

        for index, row in enumerate(reader, start=1):
            record = {
                field: convert_value(field, value)
                for field, value in row.items()
                if field is not None and value is not None
            }

            dataset_id = f"student-mat-{index:03d}"

            record.update(
                {
                    "dataset_id": dataset_id,
                    "source_dataset": SOURCE_DATASET,
                    "subject": SUBJECT,
                }
            )

            operations.append(
                UpdateOne(
                    {"dataset_id": dataset_id},
                    {"$set": record},
                    upsert=True,
                )
            )

    if len(operations) != 395:
        raise ValueError(
            f"Expected 395 Mathematics records, found {len(operations)}."
        )

    client = create_mongo_client()

    try:
        client.admin.command("ping")
        database = get_database(client)
        collection = database[COLLECTION_NAME]

        collection.create_index("dataset_id", unique=True)
        collection.create_index([("subject", 1), ("G3", 1)])

        result = collection.bulk_write(operations, ordered=True)

        imported_count = collection.count_documents(
            {
                "source_dataset": SOURCE_DATASET,
                "subject": SUBJECT,
            }
        )

        print("Dataset import completed.")
        print(f"Collection: {COLLECTION_NAME}")
        print(f"Records processed: {len(operations)}")
        print(f"New records inserted: {result.upserted_count}")
        print(f"Existing records updated: {result.modified_count}")
        print(f"Total Mathematics records: {imported_count}")

        if imported_count != 395:
            raise RuntimeError(
                f"Expected 395 records after import; found {imported_count}."
            )

        sample = collection.find_one(
            {"dataset_id": "student-mat-001"},
            {"_id": 0, "dataset_id": 1, "subject": 1, "G1": 1, "G2": 1, "G3": 1},
        )
        print(f"Sample record: {sample}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
