from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, date
from ..extensions import db
from ..models.transfer import Transfer, TransferLine
from ..services import stock_service

transfers_bp = Blueprint('transfers', __name__, url_prefix='/api/transfers')


def _next_ref():
    year  = date.today().year
    count = Transfer.query.count() + 1
    return f"INT/{year}/{count:04d}"


@transfers_bp.get('')
@jwt_required()
def list_transfers():
    status = request.args.get('status')
    q = Transfer.query.order_by(Transfer.created_at.desc())
    if status:
        q = q.filter_by(status=status)
    return jsonify([t.to_dict() for t in q.all()]), 200


@transfers_bp.post('')
@jwt_required()
def create_transfer():
    data    = request.get_json()
    user_id = int(get_jwt_identity())

    from_id = data.get('from_location_id')
    to_id   = data.get('to_location_id')

    if from_id == to_id:
        return jsonify({'message': 'Source and destination cannot be the same'}), 422

    transfer = Transfer(
        reference=_next_ref(),
        from_location_id=from_id,
        to_location_id=to_id,
        status='ready',
        created_by=user_id,
    )
    db.session.add(transfer)
    db.session.flush()

    for line_data in data.get('lines', []):
        line = TransferLine(
            transfer_id=transfer.id,
            product_id=line_data['product_id'],
            quantity=line_data.get('qty', 0),
        )
        db.session.add(line)

    db.session.commit()
    return jsonify(transfer.to_dict()), 201


@transfers_bp.get('/<int:transfer_id>')
@jwt_required()
def get_transfer(transfer_id):
    return jsonify(Transfer.query.get_or_404(transfer_id).to_dict()), 200


@transfers_bp.post('/<int:transfer_id>/validate')
@jwt_required()
def validate_transfer(transfer_id):
    transfer = Transfer.query.get_or_404(transfer_id)
    user_id  = int(get_jwt_identity())

    if transfer.status not in ('draft', 'ready', 'waiting'):
        return jsonify({'message': f'Cannot validate status "{transfer.status}"'}), 422

    try:
        for line in transfer.lines:
            if float(line.quantity) <= 0:
                continue
            stock_service.transfer_stock(
                product_id=line.product_id,
                from_location_id=transfer.from_location_id,
                to_location_id=transfer.to_location_id,
                qty=float(line.quantity),
                ref_id=transfer.id,
                ref_type='transfer',
                user_id=user_id,
            )

        transfer.status       = 'done'
        transfer.validated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({'message': 'Transfer validated', 'transfer': transfer.to_dict()}), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 422


@transfers_bp.delete('/<int:transfer_id>')
@jwt_required()
def cancel_transfer(transfer_id):
    transfer = Transfer.query.get_or_404(transfer_id)
    if transfer.status == 'done':
        return jsonify({'message': 'Cannot cancel a done transfer'}), 422
    transfer.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Transfer cancelled'}), 200
