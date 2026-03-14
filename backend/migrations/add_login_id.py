"""
Migration: Add login_id column to users table
Run once if the database already exists.
Safe to run multiple times — checks if column exists first.
"""
import sqlite3
import os

# Adjust this path to where your SQLite DB lives
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'app', 'instance', 'inventory.db')

def run_migration():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Check if login_id column already exists
    cur.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cur.fetchall()]

    if 'login_id' not in columns:
        print("[Migration] Adding login_id column to users table...")
        cur.execute("ALTER TABLE users ADD COLUMN login_id TEXT")

        # Back-fill existing rows with a placeholder login_id (email prefix)
        cur.execute("SELECT id, email FROM users")
        for row_id, email in cur.fetchall():
            base = email.split('@')[0][:12]
            # Ensure minimum 6 chars
            placeholder = (base if len(base) >= 6 else base + '_usr')[:12]
            cur.execute("UPDATE users SET login_id = ? WHERE id = ?", (placeholder, row_id))

        conn.commit()
        print("[Migration] Done. Existing users assigned placeholder Login IDs.")
        print("[WARNING]  Ask existing users to update their Login ID via Settings.")
    else:
        print("[Migration] login_id column already exists. Nothing to do.")

    conn.close()


if __name__ == '__main__':
    run_migration()
