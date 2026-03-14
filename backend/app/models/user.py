from datetime import datetime, timezone
from .extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    login_id      = db.Column(db.String(12), nullable=False, unique=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(150), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.String(20), nullable=False, default='staff')
    otp           = db.Column(db.String(6))
    otp_expiry    = db.Column(db.DateTime(timezone=True))
    is_active     = db.Column(db.Boolean, default=True, nullable=False)
    created_at    = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'login_id': self.login_id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active
        }
