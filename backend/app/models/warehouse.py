from datetime import datetime, timezone
from .extensions import db


class Warehouse(db.Model):
    __tablename__ = 'warehouses'

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    code       = db.Column(db.String(20), nullable=False, unique=True)
    address    = db.Column(db.Text)
    is_active  = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    locations = db.relationship('Location', back_populates='warehouse',
                                 cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'code': self.code,
                'address': self.address, 'is_active': self.is_active}


class Location(db.Model):
    __tablename__ = 'locations'
    __table_args__ = (db.UniqueConstraint('warehouse_id', 'code', name='uq_loc_wh_code'),)

    id           = db.Column(db.Integer, primary_key=True)
    warehouse_id = db.Column(db.Integer, db.ForeignKey('warehouses.id', ondelete='CASCADE'), nullable=False)
    name         = db.Column(db.String(100), nullable=False)
    code         = db.Column(db.String(30), nullable=False)
    loc_type     = db.Column(db.String(20), nullable=False, default='internal')
    is_active    = db.Column(db.Boolean, default=True, nullable=False)

    warehouse = db.relationship('Warehouse', back_populates='locations')

    def to_dict(self):
        return {'id': self.id, 'warehouse_id': self.warehouse_id, 'name': self.name,
                'code': self.code, 'loc_type': self.loc_type,
                'warehouse_name': self.warehouse.name if self.warehouse else None}
