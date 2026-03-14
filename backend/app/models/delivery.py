from datetime import datetime, timezone
from .extensions import db


class Delivery(db.Model):
    __tablename__ = 'deliveries'

    id             = db.Column(db.Integer, primary_key=True)
    reference      = db.Column(db.String(50), nullable=False, unique=True)
    customer_name  = db.Column(db.String(150))
    warehouse_id   = db.Column(db.Integer, db.ForeignKey('warehouses.id'), nullable=False)
    status         = db.Column(db.String(20), nullable=False, default='draft')
    scheduled_date = db.Column(db.Date)
    validated_at   = db.Column(db.DateTime(timezone=True))
    created_by     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at     = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    warehouse = db.relationship('Warehouse')
    creator   = db.relationship('User')
    lines     = db.relationship('DeliveryLine', back_populates='delivery',
                                cascade='all, delete-orphan', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id, 'reference': self.reference,
            'customer_name': self.customer_name,
            'warehouse_id': self.warehouse_id,
            'warehouse_name': self.warehouse.name if self.warehouse else None,
            'status': self.status,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'validated_at': self.validated_at.isoformat() if self.validated_at else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'lines': [l.to_dict() for l in self.lines],
        }


class DeliveryLine(db.Model):
    __tablename__ = 'delivery_lines'

    id          = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('deliveries.id', ondelete='CASCADE'), nullable=False)
    product_id  = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    demand_qty  = db.Column(db.Numeric(12, 3), nullable=False, default=0)
    done_qty    = db.Column(db.Numeric(12, 3), nullable=False, default=0)

    delivery = db.relationship('Delivery', back_populates='lines')
    product  = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id, 'product_id': self.product_id,
            'product_name': self.product.name if self.product else None,
            'product_sku': self.product.sku if self.product else None,
            'product_uom': self.product.uom if self.product else None,
            'demand_qty': float(self.demand_qty), 'done_qty': float(self.done_qty),
        }
