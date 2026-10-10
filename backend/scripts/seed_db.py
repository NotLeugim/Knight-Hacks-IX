"""
Seed the Neon database with the static SPOT Challenge Kit CSVs (issue #2).

Loads, in foreign-key order:
    locations -> assets -> missions -> actions -> readings -> anomalies

assets.csv is included because actions, readings and anomalies reference assets.asset_id.

The script is re-runnable: inside ONE transaction it deletes the existing rows in
these six tables and re-inserts everything from the CSVs. If anything fails, the
transaction rolls back and the database is left unchanged.

Usage (from backend/, venv active):
    python scripts/seed_db.py
"""
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import func, select

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
DATA_DIR = REPO_ROOT / "data" / "SPOT_KnightHacks_Challenge_Kit Part One" / "02_DATA"

sys.path.insert(0, str(BACKEND_DIR))

from app.db.database import Base, engine  # noqa: E402
from app.db import models  # noqa: E402,F401  (registers tables on Base)

# Parent tables first so every foreign key already exists when a child row is inserted.
LOAD_ORDER = ["locations", "assets", "missions", "actions", "readings", "anomalies"]


def read_csv(table_name: str) -> list[dict]:
    """Read one CSV and convert it to plain Python values matching the table's columns."""
    table = Base.metadata.tables[table_name]
    path = DATA_DIR / f"{table_name}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing CSV: {path}")

    # Read everything as text first so IDs like "WP01" are never coerced.
    df = pd.read_csv(path, dtype=str, keep_default_na=False)

    expected = [c.name for c in table.columns]
    if set(df.columns) != set(expected):
        raise ValueError(
            f"{path.name}: CSV columns {sorted(df.columns)} do not match table columns {sorted(expected)}"
        )

    records = []
    for raw in df.to_dict("records"):
        row = {}
        for col in table.columns:
            value = raw[col.name].strip()
            if value == "":
                if not col.nullable:
                    raise ValueError(f"{path.name}: empty value in NOT NULL column '{col.name}'")
                row[col.name] = None
                continue
            py_type = col.type.python_type
            if py_type is bool:
                if value not in ("True", "False"):
                    raise ValueError(f"{path.name}: bad boolean '{value}' in '{col.name}'")
                row[col.name] = value == "True"
            elif py_type is int:
                row[col.name] = int(value)
            elif py_type is float:
                row[col.name] = float(value)
            elif py_type.__name__ == "datetime":
                row[col.name] = pd.Timestamp(value).to_pydatetime()
            else:
                row[col.name] = value
        records.append(row)
    return records


def main() -> int:
    if engine is None:
        print("ERROR: DATABASE_URL is not set. Add it to backend/.env first.")
        return 1

    print(f"Reading CSVs from: {DATA_DIR}")
    data = {name: read_csv(name) for name in LOAD_ORDER}
    for name in LOAD_ORDER:
        print(f"  parsed {name:<10} {len(data[name]):>4} rows")

    # Make sure the tables exist (no-op if issue #1 already created them).
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:  # one transaction: all or nothing
        for name in reversed(LOAD_ORDER):  # children first
            conn.execute(Base.metadata.tables[name].delete())
        for name in LOAD_ORDER:  # parents first
            conn.execute(Base.metadata.tables[name].insert(), data[name])

    print("Inserted. Verifying row counts in the database:")
    ok = True
    with engine.connect() as conn:
        for name in LOAD_ORDER:
            table = Base.metadata.tables[name]
            n = conn.execute(select(func.count()).select_from(table)).scalar()
            expected = len(data[name])
            status = "OK" if n == expected else "MISMATCH"
            ok &= n == expected
            print(f"  {name:<10} db={n:>4} csv={expected:>4} {status}")

    print("Seed complete." if ok else "ERROR: row counts do not match.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
