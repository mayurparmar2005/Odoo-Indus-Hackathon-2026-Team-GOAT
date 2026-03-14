from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from ..extensions import db
from ..models.transfer import Adjustment
from ..models.stock import StockQuant
from ..services import stock_service

adjustments_bp = Blueprint('adjustments', __name__, url_prefix='/api/adjustments')


def _next_ref():
    year  = date.today().year
    count = Adjustment.query.count() + 1
    return f"ADJ/{year}/{count:04d}"


@adjustments_bp.get('')
@jwt_required()
def list_adjustments():
    adjs = Adjustment.query.order_by(Adjustment.created_at.desc()).all()
    return jsonify([a.to_dict() for a in adjs]), 200


@adjustments_bp.post('')
@jwt_required()
def create_adjustment():
    data    = request.get_json()
    user_id = int(get_jwt_identity())

    product_id  = data['product_id']
    location_id = data['location_id']
    counted_qty = float(data['counted_qty'])

    # Get current system stock
    quant = StockQuant.query.filter_by(
        product_id=product_id, location_id=location_id
    ).first()
    system_qty = float(quant.quantity) if quant else 0.0

    if system_qty == counted_qty:
        return jsonify({'message': 'No difference — stock is already correct'}), 422

    difference = counted_qty - system_qty

    try:
        stock_service.adjust_stock(
            product_id=product_id,
            location_id=location_id,
            counted_qty=counted_qty,
            ref_id=0,       # Temporary — will update after commit
            user_id=user_id,
        )

        adj = Adjustment(
            reference=_next_ref(),
            product_id=product_id,
            location_id=location_id,
            system_qty=system_qty,
            counted_qty=counted_qty,
            difference=difference,
            reason=data.get('reason'),
            created_by=user_id,
        )
        db.session.add(adj)
        db.session.commit()
        return jsonify(adj.to_dict()), 201

    except ValueError as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 422
