from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from ..extensions import db
from ..models.product import Product
from ..models.stock import StockQuant, StockMove
from ..models.receipt import Receipt
from ..models.delivery import Delivery
from ..models.transfer import Transfer

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.get('/kpis')
@jwt_required()
def get_kpis():
    total_products = Product.query.filter_by(is_active=True).count()

    # Low stock: products where sum(quants) <= min_stock_qty
    low_stock = 0
    out_of_stock = 0
    products = Product.query.filter_by(is_active=True).all()
    for p in products:
        total_qty = sum(float(q.quantity) for q in p.stock_quants)
        if total_qty <= 0:
            out_of_stock += 1
        elif total_qty <= float(p.min_stock_qty):
            low_stock += 1

    pending_receipts   = Receipt.query.filter(Receipt.status.in_(['draft','waiting','ready'])).count()
    pending_deliveries = Delivery.query.filter(Delivery.status.in_(['draft','waiting','ready'])).count()
    pending_transfers  = Transfer.query.filter(Transfer.status.in_(['draft','waiting','ready'])).count()

    return jsonify({
        'total_products':    total_products,
        'low_stock':         low_stock,
        'out_of_stock':      out_of_stock,
        'pending_receipts':  pending_receipts,
        'pending_deliveries': pending_deliveries,
        'pending_transfers': pending_transfers,
    }), 200


@dashboard_bp.get('/stock-movement')
@jwt_required()
def stock_movement_chart():
    """Last 7 days IN/OUT totals grouped by day."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import case, cast, Date

    now   = datetime.now(timezone.utc)
    since = now - timedelta(days=7)

    rows = db.session.query(
        cast(StockMove.created_at, Date).label('day'),
        func.sum(case((StockMove.move_type == 'receipt', StockMove.quantity), else_=0)).label('stock_in'),
        func.sum(case((StockMove.move_type == 'delivery', StockMove.quantity), else_=0)).label('stock_out'),
    ).filter(StockMove.created_at >= since)\
     .group_by('day')\
     .order_by('day')\
     .all()

    return jsonify([
        {'day': str(r.day), 'in': float(r.stock_in or 0), 'out': float(r.stock_out or 0)}
        for r in rows
    ]), 200


@dashboard_bp.get('/low-stock-alerts')
@jwt_required()
def low_stock_alerts():
    """Products with total stock below min_stock_qty."""
    products = Product.query.filter_by(is_active=True).all()
    alerts = []
    for p in products:
        total_qty = sum(float(q.quantity) for q in p.stock_quants)
        min_qty   = float(p.min_stock_qty)
        if total_qty <= min_qty:
            alerts.append({
                'product_id': p.id,
                'product_name': p.name,
                'product_sku': p.sku,
                'total_stock': total_qty,
                'min_stock_qty': min_qty,
                'uom': p.uom,
            })
    alerts.sort(key=lambda a: a['total_stock'])
    return jsonify(alerts), 200


@dashboard_bp.get('/recent-moves')
@jwt_required()
def recent_moves():
    moves = StockMove.query.order_by(StockMove.created_at.desc()).limit(20).all()
    return jsonify([m.to_dict() for m in moves]), 200
