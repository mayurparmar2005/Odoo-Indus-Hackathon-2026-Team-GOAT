"""
Quick fix: update the existing admin user to have login_id='admin'
and a valid password that passes the strength requirements.
Run with: python fix_admin.py
"""
import os
os.environ['FLASK_ENV'] = 'development'

from app import create_app
from app.extensions import db
from app.models.user import User
from app.services.auth_service import hash_password

app = create_app('development')

with app.app_context():
    # Fix admin user
    admin = User.query.filter_by(email='admin@coreinventory.com').first()
    if admin:
        admin.login_id = 'admin'
        admin.password_hash = hash_password('Admin@1234')
        db.session.commit()
        print(f"[OK] Admin user updated: login_id='admin', password='Admin@1234'")
    else:
        # Create fresh
        admin = User(
            login_id='admin',
            name='Admin User',
            email='admin@coreinventory.com',
            password_hash=hash_password('Admin@1234'),
            role='manager',
        )
        db.session.add(admin)
        db.session.commit()
        print("[OK] Admin user created: login_id='admin', password='Admin@1234'")

    # Fix staff user
    staff = User.query.filter_by(email='staff@coreinventory.com').first()
    if staff:
        staff.login_id = 'staffuser'
        staff.password_hash = hash_password('Staff@1234')
        db.session.commit()
        print("[OK] Staff user updated: login_id='staffuser', password='Staff@1234'")

    print("\n=== Login Credentials ===")
    print("Admin  -> Login ID: admin      | Password: Admin@1234 | Role: manager")
    print("Staff  -> Login ID: staffuser  | Password: Staff@1234 | Role: staff")
    print("Note: OTP will be sent to the registered email for each user.")
