from datetime import datetime, timezone
from .extensions import db


class Category(db.Model):
    __tablename__ = 'categories'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    parent_id   = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'))
    description = db.Column(db.Text)
    created_at  = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    children = db.relationship('Category', backref=db.backref('parent', remote_side=[id]))
    products = db.relationship('Product', back_populates='category', lazy='dynamic')

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'parent_id': self.parent_id,
                'description': self.description}


class Product(db.Model):
    __tablename__ = 'products'

    id             = db.Column(db.Integer, primary_key=True)
    name           = db.Column(db.String(200), nullable=False)
    sku            = db.Column(db.String(80), nullable=False, unique=True)
    category_id    = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'))
    uom            = db.Column(db.String(30), nullable=False, default='pcs')
    min_stock_qty  = db.Column(db.Numeric(12, 3), nullable=False, default=0)
    description    = db.Column(db.Text)
    is_active      = db.Column(db.Boolean, default=True, nullable=False)
    created_at     = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    category    = db.relationship('Category', back_populates='products')
    stock_quants = db.relationship('StockQuant', back_populates='product',
                                    cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self, with_stock=False):
        d = {
            'id': self.id, 'name': self.name, 'sku': self.sku,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'uom': self.uom, 'min_stock_qty': float(self.min_stock_qty),
            'description': self.description, 'is_active': self.is_active,
        }
        if with_stock:
            total = sum(float(q.quantity) for q in self.stock_quants)
            d['total_stock'] = total
        return d
