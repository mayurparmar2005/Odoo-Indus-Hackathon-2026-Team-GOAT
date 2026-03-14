from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, date
from ..extensions import db
from ..models.delivery import Delivery, DeliveryLine
from ..models.stock import StockQuant
from ..models.warehouse import Location
from ..services import stock_service

deliveries_bp = Blueprint('deliveries', __name__, url_prefix='/api/deliveries')


def _next_ref():
    year = date.today().year
    count = Delivery.query.count() + 1
    return f"OUT/{year}/{count:04d}"


@deliveries_bp.get('')
@jwt_required()
def list_deliveries():
    status = request.args.get('status')
    q = Delivery.query.order_by(Delivery.created_at.desc())
    if status:
        q = q.filter_by(status=status)
    return jsonify([d.to_dict() for d in q.all()]), 200


@deliveries_bp.post('')
@jwt_required()
def create_delivery():
    data    = request.get_json()
    user_id = int(get_jwt_identity())

    delivery = Delivery(
        reference=_next_ref(),
        customer_name=data.get('customer_name'),
        warehouse_id=data['warehouse_id'],
        scheduled_date=data.get('scheduled_date'),
        status='draft',
        created_by=user_id,
    )
    db.session.add(delivery)
    db.session.flush()

    for line_data in data.get('lines', []):
        line = DeliveryLine(
            delivery_id=delivery.id,
            product_id=line_data['product_id'],
            demand_qty=line_data.get('qty', 0),
            done_qty=line_data.get('qty', 0),
        )
        db.session.add(line)

    if data.get('lines'):
        delivery.status = 'ready'

    db.session.commit()
    return jsonify(delivery.to_dict()), 201


@deliveries_bp.get('/<int:delivery_id>')
@jwt_required()
def get_delivery(delivery_id):
    return jsonify(Delivery.query.get_or_404(delivery_id).to_dict()), 200


@deliveries_bp.post('/<int:delivery_id>/validate')
@jwt_required()
def validate_delivery(delivery_id):
    delivery = Delivery.query.get_or_404(delivery_id)
    user_id  = int(get_jwt_identity())

    if delivery.status not in ('draft', 'ready', 'waiting'):
        return jsonify({'message': f'Cannot validate status "{delivery.status}"'}), 422

    # Pick source location (first internal location of the warehouse)
    src_loc = Location.query.filter_by(
        warehouse_id=delivery.warehouse_id, loc_type='internal', is_active=True
    ).first()

    if not src_loc:
        return jsonify({'message': 'No internal location found for this warehouse'}), 422

    try:
        for line in delivery.lines:
            if float(line.done_qty) <= 0:
                continue
            stock_service.decrease_stock(
                product_id=line.product_id,
                location_id=src_loc.id,
                qty=float(line.done_qty),
                move_type='delivery',
                ref_id=delivery.id,
                ref_type='delivery',
                user_id=user_id,
            )

        delivery.status       = 'done'
        delivery.validated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({'message': 'Delivery validated', 'delivery': delivery.to_dict()}), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 422


@deliveries_bp.delete('/<int:delivery_id>')
@jwt_required()
def cancel_delivery(delivery_id):
    delivery = Delivery.query.get_or_404(delivery_id)
    if delivery.status == 'done':
        return jsonify({'message': 'Cannot cancel a done delivery'}), 422
    delivery.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Delivery cancelled'}), 200
