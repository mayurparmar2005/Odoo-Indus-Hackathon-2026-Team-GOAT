from datetime import datetime, timezone
from .extensions import db


class Transfer(db.Model):
    __tablename__ = 'transfers'

    id               = db.Column(db.Integer, primary_key=True)
    reference        = db.Column(db.String(50), nullable=False, unique=True)
    from_location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    to_location_id   = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    status           = db.Column(db.String(20), nullable=False, default='draft')
    validated_at     = db.Column(db.DateTime(timezone=True))
    created_by       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at       = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    from_location = db.relationship('Location', foreign_keys=[from_location_id])
    to_location   = db.relationship('Location', foreign_keys=[to_location_id])
    creator       = db.relationship('User')
    lines         = db.relationship('TransferLine', back_populates='transfer',
                                    cascade='all, delete-orphan', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id, 'reference': self.reference,
            'from_location_id': self.from_location_id,
            'from_location_name': (
                f"{self.from_location.warehouse.code} / {self.from_location.name}"
                if self.from_location else None
            ),
            'to_location_id': self.to_location_id,
            'to_location_name': (
                f"{self.to_location.warehouse.code} / {self.to_location.name}"
                if self.to_location else None
            ),
            'status': self.status,
            'validated_at': self.validated_at.isoformat() if self.validated_at else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'lines': [l.to_dict() for l in self.lines],
        }


class TransferLine(db.Model):
    __tablename__ = 'transfer_lines'

    id          = db.Column(db.Integer, primary_key=True)
    transfer_id = db.Column(db.Integer, db.ForeignKey('transfers.id', ondelete='CASCADE'), nullable=False)
    product_id  = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity    = db.Column(db.Numeric(12, 3), nullable=False, default=0)

    transfer = db.relationship('Transfer', back_populates='lines')
    product  = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id, 'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'quantity': float(self.quantity),
        }


class Adjustment(db.Model):
    __tablename__ = 'adjustments'

    id          = db.Column(db.Integer, primary_key=True)
    reference   = db.Column(db.String(50), nullable=False, unique=True)
    product_id  = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    system_qty  = db.Column(db.Numeric(12, 3), nullable=False)
    counted_qty = db.Column(db.Numeric(12, 3), nullable=False)
    difference  = db.Column(db.Numeric(12, 3), nullable=False)
    reason      = db.Column(db.Text)
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at  = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product  = db.relationship('Product')
    location = db.relationship('Location')
    creator  = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id, 'reference': self.reference,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'location_id': self.location_id,
            'location_name': self.location.name if self.location else None,
            'system_qty': float(self.system_qty),
            'counted_qty': float(self.counted_qty),
            'difference': float(self.difference),
            'reason': self.reason,
            'created_by_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
