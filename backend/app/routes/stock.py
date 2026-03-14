from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..models.stock import StockMove, StockQuant

stock_bp = Blueprint('stock', __name__, url_prefix='/api/stock')


@stock_bp.get('/moves')
@jwt_required()
def list_moves():
    """Full paginated stock ledger."""
    page      = request.args.get('page', 1, type=int)
    per_page  = request.args.get('per_page', 50, type=int)
    move_type = request.args.get('move_type')
    product_id = request.args.get('product_id', type=int)

    q = StockMove.query.order_by(StockMove.created_at.desc())
    if move_type:
        q = q.filter_by(move_type=move_type)
    if product_id:
        q = q.filter_by(product_id=product_id)

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'moves':   [m.to_dict() for m in paginated.items],
        'total':   paginated.total,
        'pages':   paginated.pages,
        'page':    page,
        'per_page': per_page,
    }), 200


@stock_bp.get('/quants')
@jwt_required()
def list_quants():
    """All live stock quantities."""
    product_id  = request.args.get('product_id', type=int)
    location_id = request.args.get('location_id', type=int)
    q = StockQuant.query
    if product_id:
        q = q.filter_by(product_id=product_id)
    if location_id:
        q = q.filter_by(location_id=location_id)
    return jsonify([sq.to_dict() for sq in q.all()]), 200
