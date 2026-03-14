from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, date
from ..extensions import db
from ..models.receipt import Receipt, ReceiptLine
from ..models.warehouse import Warehouse, Location
from ..services import stock_service

receipts_bp = Blueprint('receipts', __name__, url_prefix='/api/receipts')


def _next_ref():
    year = date.today().year
    count = Receipt.query.count() + 1
    return f"REC/{year}/{count:04d}"


@receipts_bp.get('')
@jwt_required()
def list_receipts():
    status = request.args.get('status')
    q = Receipt.query.order_by(Receipt.created_at.desc())
    if status:
        q = q.filter_by(status=status)
    return jsonify([r.to_dict() for r in q.all()]), 200


@receipts_bp.post('')
@jwt_required()
def create_receipt():
    data   = request.get_json()
    user_id = int(get_jwt_identity())

    receipt = Receipt(
        reference=_next_ref(),
        supplier_name=data.get('supplier_name'),
        warehouse_id=data['warehouse_id'],
        scheduled_date=data.get('scheduled_date'),
        status='draft',
        created_by=user_id,
    )
    db.session.add(receipt)
    db.session.flush()   # get receipt.id

    for line_data in data.get('lines', []):
        line = ReceiptLine(
            receipt_id=receipt.id,
            product_id=line_data['product_id'],
            expected_qty=line_data.get('qty', 0),
            done_qty=line_data.get('qty', 0),
        )
        db.session.add(line)

    # Auto-move to 'ready' if lines present
    if data.get('lines'):
        receipt.status = 'ready'

    db.session.commit()
    return jsonify(receipt.to_dict()), 201


@receipts_bp.get('/<int:receipt_id>')
@jwt_required()
def get_receipt(receipt_id):
    r = Receipt.query.get_or_404(receipt_id)
    return jsonify(r.to_dict()), 200


@receipts_bp.post('/<int:receipt_id>/validate')
@jwt_required()
def validate_receipt(receipt_id):
    """
    Validate receipt — atomically increases stock for every product line
    and appends stock_moves ledger entries.
    """
    receipt = Receipt.query.get_or_404(receipt_id)
    user_id = int(get_jwt_identity())

    if receipt.status not in ('draft', 'ready', 'waiting'):
        return jsonify({'message': f'Cannot validate a receipt with status "{receipt.status}"'}), 422

    # Find the default receiving location for this warehouse
    dest_loc = Location.query.filter_by(
        warehouse_id=receipt.warehouse_id, loc_type='internal', is_active=True
    ).first()

    if not dest_loc:
        return jsonify({'message': 'No internal location found for the destination warehouse. Please add a location first.'}), 422

    try:
        for line in receipt.lines:
            if float(line.done_qty) <= 0:
                continue
            stock_service.increase_stock(
                product_id=line.product_id,
                location_id=dest_loc.id,
                qty=float(line.done_qty),
                move_type='receipt',
                ref_id=receipt.id,
                ref_type='receipt',
                user_id=user_id,
            )

        receipt.status = 'done'
        receipt.validated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({'message': 'Receipt validated', 'receipt': receipt.to_dict()}), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 422


@receipts_bp.delete('/<int:receipt_id>')
@jwt_required()
def cancel_receipt(receipt_id):
    receipt = Receipt.query.get_or_404(receipt_id)
    if receipt.status == 'done':
        return jsonify({'message': 'Cannot cancel a done receipt'}), 422
    receipt.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Receipt cancelled'}), 200
