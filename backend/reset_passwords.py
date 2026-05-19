#!/usr/bin/env python3
"""
reset_passwords.py  (fixed)
───────────────────────────
Uses bcrypt and sqlite3 directly — bypasses the passlib/bcrypt 4.x
incompatibility entirely.

Run from the backend/ directory:
    cd backend
    pip install bcrypt --upgrade
    python reset_passwords.py

Finds your SQLite DB automatically, updates only the password_hash
column for the listed users. No other data is touched.
"""

import bcrypt
import sqlite3
import sys
from pathlib import Path

# ── New passwords ─────────────────────────────────────────────────────────────
# Satisfy client-side rules: 8+ chars, uppercase, lowercase, number, special char
UPDATES = [
    ("admin@uam.local",  "Admin@1234!"),
    ("editor@uam.local", "Editor@1234!"),
    ("viewer@uam.local", "Viewer@1234!"),
]

# ── Locate the SQLite database ────────────────────────────────────────────────
POSSIBLE_PATHS = [
    Path(__file__).parent / "uam_scorecard.db",
    Path(__file__).parent / "scorecard.db",
    Path(__file__).parent / "app.db",
    Path(__file__).parent / "data" / "uam_scorecard.db",
]

db_path = None
for p in POSSIBLE_PATHS:
    if p.exists():
        db_path = p
        break

if db_path is None:
    # Last resort: search for any .db file nearby
    for p in Path(__file__).parent.glob("*.db"):
        db_path = p
        break

if db_path is None:
    print("ERROR: Could not find the SQLite .db file.")
    print("Set the path manually: db_path = Path('path/to/your.db')")
    sys.exit(1)

print(f"Database found: {db_path}\n")


def hash_password(plain: str) -> str:
    """Hash with bcrypt directly — no passlib involved."""
    salt   = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def reset() -> None:
    conn = sqlite3.connect(str(db_path))
    cur  = conn.cursor()

    # Auto-detect the password column name
    cur.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cur.fetchall()]
    print(f"users table columns: {columns}\n")

    if "password_hash" in columns:
        pw_col = "password_hash"
    elif "hashed_password" in columns:
        pw_col = "hashed_password"
    else:
        candidates = [c for c in columns if "password" in c.lower() or "hash" in c.lower()]
        if not candidates:
            print(f"ERROR: Cannot find a password column. Columns are: {columns}")
            sys.exit(1)
        pw_col = candidates[0]

    print(f"Password column: '{pw_col}'\n")

    updated = 0
    for email, new_password in UPDATES:
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        if not row:
            print(f"  ✗  {email:<32}  NOT FOUND — skipping")
            continue

        new_hash = hash_password(new_password)
        cur.execute(
            f"UPDATE users SET {pw_col} = ? WHERE email = ?",
            (new_hash, email),
        )
        print(f"  ✓  {email:<32}  updated  →  {new_password}")
        updated += 1

    conn.commit()
    conn.close()

    print(f"\n{updated}/{len(UPDATES)} passwords updated.")
    print("Restart uvicorn then sign in with the credentials above.")


if __name__ == "__main__":
    reset()
