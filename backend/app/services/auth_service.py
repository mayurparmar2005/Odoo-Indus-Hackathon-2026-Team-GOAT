import re
import secrets
import string
import bcrypt
from datetime import datetime, timezone, timedelta
from ..extensions import db
from ..models.user import User


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(12)).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def generate_otp(length: int = 6) -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def _mask_email(email: str) -> str:
    """Return a masked email like c*****@gmail.com for display."""
    parts = email.split('@')
    local = parts[0]
    domain = parts[1] if len(parts) > 1 else ''
    masked = local[0] + '*' * max(1, len(local) - 1)
    return f"{masked}@{domain}"


def _send_email(mail_ext, recipients: list, subject: str, body: str) -> None:
    """Shared helper to send via Flask-Mail. In dev, falls back to console if SMTP fails."""
    import os
    try:
        from flask_mail import Message
        msg = Message(subject=subject, recipients=recipients, body=body)
        mail_ext.send(msg)
    except Exception as e:
        # In development, print OTP to console so login still works without working SMTP
        if os.getenv('FLASK_ENV', 'development') == 'development':
            # Extract OTP from body (it's on the line after "code is:\n\n  ")
            otp_line = [l.strip() for l in body.split('\n') if l.strip() and len(l.strip()) == 6 and l.strip().isdigit()]
            otp_val = otp_line[0] if otp_line else '(check body above)'
            print('\n' + '='*55)
            print('  ⚠️  EMAIL SEND FAILED — DEV MODE OTP FALLBACK')
            print(f'  To: {", ".join(recipients)}')
            print(f'  Subject: {subject}')
            print(f'  ★  OTP CODE: {otp_val}  ★')
            print('='*55 + '\n')
            return  # Don't raise in dev — let login proceed
        raise ValueError(f'Failed to send email. Please contact support. ({type(e).__name__})')


def validate_login_id(login_id: str) -> None:
    """Raise ValueError if login_id does not meet requirements."""
    if not login_id:
        raise ValueError('Login ID is required')
    if not (6 <= len(login_id) <= 12):
        raise ValueError('Login ID must be between 6 and 12 characters')
    if not re.match(r'^[A-Za-z0-9_]+$', login_id):
        raise ValueError('Login ID may only contain letters, digits, and underscores')


def validate_password(password: str) -> None:
    """Raise ValueError if password does not meet strength requirements."""
    if len(password) <= 8:
        raise ValueError('Password must be more than 8 characters long')
    if not re.search(r'[a-z]', password):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'[A-Z]', password):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`\';]', password):
        raise ValueError('Password must contain at least one special character')


def register_user(login_id: str, name: str, email: str, password: str, role: str = 'staff') -> User:
    validate_login_id(login_id)
    validate_password(password)

    if User.query.filter_by(login_id=login_id).first():
        raise ValueError('Login ID is already taken. Please choose another.')

    if User.query.filter_by(email=email).first():
        raise ValueError('Email is already registered. Please use a different email.')

    user = User(
        login_id=login_id,
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()
    return user


def login_user_step1(login_id: str, password: str, mail_ext) -> dict:
    """
    Step 1 of login: verify credentials, then send OTP to registered email.
    Returns dict with masked email so frontend can show where OTP was sent.
    """
    user = User.query.filter_by(login_id=login_id, is_active=True).first()
    if not user or not check_password(password, user.password_hash):
        raise ValueError('Invalid login ID or password')

    # Generate and store login OTP
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.session.commit()

    # Send OTP email
    body = (
        f"Hello {user.name},\n\n"
        f"Your one-time login code for CoreInventory is:\n\n"
        f"  {otp}\n\n"
        f"This code is valid for 10 minutes. Do not share it with anyone.\n\n"
        f"If you did not attempt to log in, please change your password immediately.\n\n"
        f"— CoreInventory Team\n"
        f"Hackathon 2026 · Team GOAT"
    )

    try:
        _send_email(mail_ext, [user.email], 'CoreInventory — Login Verification Code', body)
    except ValueError as e:
        # Roll back OTP if email fails
        user.otp = None
        user.otp_expiry = None
        db.session.commit()
        raise

    return {
        'login_id': login_id,
        'masked_email': _mask_email(user.email),
    }


def login_user_step2(login_id: str, otp: str) -> User:
    """
    Step 2 of login: verify the OTP sent to user's email and return the user.
    JWT tokens are generated by the route layer.
    """
    user = User.query.filter_by(login_id=login_id, is_active=True).first()
    if not user:
        raise ValueError('Invalid login ID or OTP')
    if user.otp != otp:
        raise ValueError('Invalid OTP. Please check your email and try again.')
    if user.otp_expiry and user.otp_expiry < datetime.now(timezone.utc):
        raise ValueError('OTP has expired. Please login again to get a new code.')

    # Clear OTP after successful verification
    user.otp = None
    user.otp_expiry = None
    db.session.commit()
    return user


def send_otp(email: str, mail_ext) -> str:
    """Forgot-password OTP flow."""
    user = User.query.filter_by(email=email, is_active=True).first()
    if not user:
        raise ValueError('No account found with that email')

    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.session.commit()

    body = (
        f"Hello {user.name},\n\n"
        f"Your one-time password (OTP) for resetting your CoreInventory account is:\n\n"
        f"  {otp}\n\n"
        f"This OTP is valid for 10 minutes. Do not share it with anyone.\n\n"
        f"If you did not request a password reset, please ignore this email.\n\n"
        f"— CoreInventory Team\n"
        f"Hackathon 2026 · Team GOAT"
    )

    try:
        _send_email(mail_ext, [email], 'CoreInventory — Password Reset OTP', body)
    except ValueError:
        user.otp = None
        user.otp_expiry = None
        db.session.commit()
        raise

    return otp


def verify_otp(email: str, otp: str) -> User:
    user = User.query.filter_by(email=email, otp=otp).first()
    if not user:
        raise ValueError('Invalid OTP')
    if user.otp_expiry and user.otp_expiry < datetime.now(timezone.utc):
        raise ValueError('OTP has expired')
    return user


def reset_password(email: str, otp: str, new_password: str) -> User:
    validate_password(new_password)
    user = verify_otp(email, otp)
    user.password_hash = hash_password(new_password)
    user.otp = None
    user.otp_expiry = None
    db.session.commit()
    return user
