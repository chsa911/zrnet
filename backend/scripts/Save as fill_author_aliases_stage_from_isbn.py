#!/usr/bin/env python3
import csv, re, sys, time
from urllib.parse import quote
import requests

INFILE = sys.argv[1]
OUTFILE = sys.argv[2] if len(sys.argv) > 2 else "author_aliases_stage_import_from_isbn.csv"
UNRESOLVED = "unresolved_isbn_lookup.csv"

def tidy(x):
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s == r"\N" or s.lower() == "nan":
        return None
    return s

def norm_abbr(abbr):
    s = tidy(abbr)
    if not s:
        return None
    s = re.sub(r"\s+", "", s.lower())
    if not s.endswith("."):
        s += "."
    return s

def abbr_norm(abbr_raw):
    if not abbr_raw:
        return None
    return re.sub(r"[^a-z0-9]+", "", abbr_raw.lower())

def clean_author_name(s):
    s = tidy(s)
    if not s:
        return None
    s = re.sub(r"\s+", " ", s).strip()
    # keep only the first author if multiple
    s = re.split(r"\s*(?:;|&| and )\s*", s)[0].strip()
    # "Last, First" -> "First Last"
    if "," in s:
        parts = [p.strip() for p in s.split(",")]
        if len(parts) >= 2 and parts[1]:
            s = f"{parts[1]} {parts[0]}".strip()
    # leading "v." -> "von"
    s = re.sub(r"^(?i)v\.\s+", "von ", s)
    return s

def ol_by_isbn(isbn):
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{quote(isbn)}&format=json&jscmd=data"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    data = r.json()
    key = f"ISBN:{isbn}"
    if key not in data:
        return None
    entry = data[key]
    authors = entry.get("authors") or []
    if not authors:
        return None
    return clean_author_name(authors[0].get("name"))  # less strict: first author

def gbooks_by_isbn(isbn):
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{quote(isbn)}"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    data = r.json()
    items = data.get("items") or []
    if not items:
        return None
    vi = items[0].get("volumeInfo") or {}
    authors = vi.get("authors") or []
    if not authors:
        return None
    return clean_author_name(authors[0])  # less strict: first author

def lookup_author(isbn13, isbn10):
    for isbn in [isbn13, isbn10]:
        isbn = tidy(isbn)
        if not isbn:
            continue
        try:
            name = ol_by_isbn(isbn)
            if name:
                return name, f"openlibrary:{isbn}"
        except Exception:
            pass
        try:
            name = gbooks_by_isbn(isbn)
            if name:
                return name, f"googlebooks:{isbn}"
        except Exception:
            pass
    return None, None

best = {}         # abbr_norm -> row
unresolved = []

with open(INFILE, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for r in reader:
        abbr_raw = norm_abbr(r.get("abbreviation"))
        if not abbr_raw or r.get("abbreviation") == r"\N":
            continue

        name, source = lookup_author(r.get("isbn13"), r.get("isbn10"))
        if not name:
            unresolved.append({
                "author_id": r.get("author_id"),
                "abbreviation": abbr_raw,
                "book_id": r.get("book_id"),
                "title_display": r.get("title_display"),
                "isbn13": r.get("isbn13"),
                "isbn10": r.get("isbn10"),
                "publisher": r.get("publisher"),
                "pages": r.get("pages"),
            })
            continue

        key = abbr_norm(abbr_raw)
        row = {"type": "author", "abbr_raw": abbr_raw, "abbr_norm": key, "full_raw": name, "source": source}

        # keep the longest name if duplicates happen
        if key not in best or len(row["full_raw"]) > len(best[key]["full_raw"]):
            best[key] = row

        time.sleep(0.15)  # polite rate limit

with open(OUTFILE, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["type","abbr_raw","abbr_norm","full_raw"])
    w.writeheader()
    for row in sorted(best.values(), key=lambda x: x["abbr_norm"]):
        w.writerow({k: row[k] for k in ["type","abbr_raw","abbr_norm","full_raw"]})

if unresolved:
    with open(UNRESOLVED, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(unresolved[0].keys()))
        w.writeheader()
        w.writerows(unresolved)

print(f"✅ wrote {OUTFILE} ({len(best)} rows)")
print(f"⚠️ unresolved {len(unresolved)} rows -> {UNRESOLVED}")