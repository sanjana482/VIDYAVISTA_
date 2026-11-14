import csv
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from schools.models import School


def parse_records(file_path):
    """
    Auto-detects and parses:
    1. Excel .xlsx / .xls files (even if named .csv)
    2. Plain text CSV files (UTF-8, UTF-8 with BOM, CP1252, Latin-1)
    """
    records = {}

    # Check if binary Excel file (zip magic header PK\x03\x04)
    is_excel = False
    try:
        with open(file_path, "rb") as f:
            header = f.read(4)
            if header.startswith(b"PK\x03\x04") or file_path.lower().endswith((".xlsx", ".xls")):
                is_excel = True
    except Exception:
        pass

    if is_excel:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file_path, data_only=True)
            sheet = wb.active
            for row in sheet.iter_rows(values_only=True):
                if not row or len(row) < 2:
                    continue
                c0, c1 = row[0], row[1]
                if c0 is None or c1 is None:
                    continue
                try:
                    sid = int(str(c0).strip())
                    url = str(c1).strip()
                    if url.startswith("http"):
                        records[sid] = url
                except ValueError:
                    continue
            if records:
                return records
        except Exception:
            pass

    # Read as text CSV with various encodings
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            with open(file_path, "r", encoding=encoding, errors="replace") as f:
                reader = csv.reader(f)
                for row in reader:
                    if not row or len(row) < 2:
                        continue
                    try:
                        sid = int(str(row[0]).strip())
                        url = str(row[1]).strip()
                        if url.startswith("http"):
                            records[sid] = url
                    except ValueError:
                        continue
            if records:
                return records
        except Exception:
            continue

    return records


class Command(BaseCommand):
    help = "Update school cover images using an Excel or CSV file (format: school_id, cloudinary_url)"

    def add_arguments(self, parser):
        parser.add_argument("file_path", type=str, help="Path to CSV or Excel file (.csv, .xlsx)")

    def handle(self, *args, **options):
        file_path = options["file_path"]

        # If file not found directly, try fuzzy extensions (e.g. covers.csv -> cover.csv.xlsx)
        if not os.path.exists(file_path):
            candidates = [
                file_path + ".xlsx",
                file_path + ".csv",
                file_path.replace(".csv", ".csv.xlsx"),
                file_path.replace(".csv", ".xlsx"),
                file_path.replace("covers", "cover"),
                file_path.replace("covers.csv", "cover.csv.xlsx"),
            ]
            for cand in candidates:
                if os.path.exists(cand):
                    file_path = cand
                    break

        if not os.path.exists(file_path):
            self.stderr.write(self.style.ERROR(f"File not found: {options['file_path']}"))
            return

        self.stdout.write(f"Reading file: {file_path}")
        url_map = parse_records(file_path)

        if not url_map:
            self.stderr.write(self.style.ERROR("No valid school_id, URL pairs found in file."))
            return

        self.stdout.write(f"Found {len(url_map)} unique school records. Updating Neon PostgreSQL database...")

        updated_count = 0
        not_found = []

        with transaction.atomic():
            for sid, url in url_map.items():
                cnt = School.objects.filter(school_id=sid).update(image=url, cover_image="")
                if cnt == 0:
                    cnt = School.objects.filter(pk=sid).update(image=url, cover_image="")
                if cnt > 0:
                    updated_count += cnt
                else:
                    not_found.append(sid)

        self.stdout.write(self.style.SUCCESS(f"Successfully updated {updated_count} schools!"))
        if not_found:
            self.stdout.write(self.style.WARNING(f"Schools not found for IDs: {not_found}"))
