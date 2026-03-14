from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.product import Product, Category
from ..models.stock import StockQuant

products_bp = Blueprint('products', __name__, url_prefix='/api/products')


@products_bp.get('')
@jwt_required()
def list_products():
    category_id = request.args.get('category_id', type=int)
    q = Product.query.filter_by(is_active=True)
    if category_id:
        q = q.filter_by(category_id=category_id)
    products = q.all()
    return jsonify([p.to_dict(with_stock=True) for p in products]), 200


@products_bp.post('')
@jwt_required()
def create_product():
    data = request.get_json()
    if not data.get('name') or not data.get('sku'):
        return jsonify({'message': 'name and sku are required'}), 400
    if Product.query.filter_by(sku=data['sku']).first():
        return jsonify({'message': 'SKU already exists'}), 409
    product = Product(
        name=data['name'], sku=data['sku'],
        category_id=data.get('category_id'),
        uom=data.get('uom', 'pcs'),
        min_stock_qty=data.get('min_stock_qty', 0),
        description=data.get('description'),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.get('/<int:product_id>')
@jwt_required()
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = product.to_dict(with_stock=True)
    data['stock_quants'] = [q.to_dict() for q in product.stock_quants]
    return jsonify(data), 200


@products_bp.put('/<int:product_id>')
@jwt_required()
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    for field in ('name', 'category_id', 'uom', 'min_stock_qty', 'description', 'is_active'):
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    return jsonify(product.to_dict()), 200


@products_bp.delete('/<int:product_id>')
@jwt_required()
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    product.is_active = False   # Soft delete
    db.session.commit()
    return jsonify({'message': 'Product deactivated'}), 200


# ── Categories ──────────────────────────────────────────────────────

@products_bp.get('/categories')
@jwt_required()
def list_categories():
    return jsonify([c.to_dict() for c in Category.query.all()]), 200


@products_bp.post('/categories')
@jwt_required()
def create_category():
    data = request.get_json()
    cat = Category(name=data['name'], parent_id=data.get('parent_id'),
                   description=data.get('description'))
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201
