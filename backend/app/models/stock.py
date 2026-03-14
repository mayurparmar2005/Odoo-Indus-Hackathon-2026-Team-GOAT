from datetime import datetime, timezone
from .extensions import db


class StockQuant(db.Model):
    """Live stock snapshot — one row per (product, location)."""
    __tablename__ = 'stock_quants'
    __table_args__ = (db.UniqueConstraint('product_id', 'location_id', name='uq_sq_prod_loc'),)

    id           = db.Column(db.Integer, primary_key=True)
    product_id   = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    location_id  = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete='CASCADE'), nullable=False)
    quantity     = db.Column(db.Numeric(12, 3), nullable=False, default=0)
    reserved_qty = db.Column(db.Numeric(12, 3), nullable=False, default=0)
    updated_at   = db.Column(db.DateTime(timezone=True),
                             default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))

    product  = db.relationship('Product', back_populates='stock_quants')
    location = db.relationship('Location')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'location_id': self.location_id,
            'location_name': self.location.name if self.location else None,
            'warehouse_code': self.location.warehouse.code if self.location and self.location.warehouse else None,
            'quantity': float(self.quantity),
            'reserved_qty': float(self.reserved_qty),
            'available_qty': float(self.quantity) - float(self.reserved_qty),
        }


class StockMove(db.Model):
    """Immutable ledger — every stock quantity change appends one row here."""
    __tablename__ = 'stock_moves'

    id               = db.Column(db.Integer, primary_key=True)
    product_id       = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    from_location_id = db.Column(db.Integer, db.ForeignKey('locations.id'))
    to_location_id   = db.Column(db.Integer, db.ForeignKey('locations.id'))
    quantity         = db.Column(db.Numeric(12, 3), nullable=False)
    move_type        = db.Column(db.String(20), nullable=False)   # receipt|delivery|transfer|adjustment
    reference_id     = db.Column(db.Integer, nullable=False)
    reference_type   = db.Column(db.String(20), nullable=False)
    created_by       = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at       = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product       = db.relationship('Product')
    from_location = db.relationship('Location', foreign_keys=[from_location_id])
    to_location   = db.relationship('Location', foreign_keys=[to_location_id])
    creator       = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'from_location': self.from_location.name if self.from_location else '—',
            'to_location': self.to_location.name if self.to_location else '—',
            'quantity': float(self.quantity),
            'move_type': self.move_type,
            'reference_id': self.reference_id,
            'reference_type': self.reference_type,
            'created_by_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
