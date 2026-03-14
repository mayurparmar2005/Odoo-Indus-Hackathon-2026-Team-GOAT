from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.warehouse import Warehouse, Location

warehouses_bp = Blueprint('warehouses', __name__, url_prefix='/api/warehouses')


@warehouses_bp.get('')
@jwt_required()
def list_warehouses():
    warehouses = Warehouse.query.filter_by(is_active=True).all()
    result = []
    for wh in warehouses:
        d = wh.to_dict()
        d['locations'] = [loc.to_dict() for loc in wh.locations]
        result.append(d)
    return jsonify(result), 200


@warehouses_bp.post('')
@jwt_required()
def create_warehouse():
    data = request.get_json()
    if Warehouse.query.filter_by(code=data.get('code', '')).first():
        return jsonify({'message': 'Warehouse code already exists'}), 409
    wh = Warehouse(name=data['name'], code=data['code'].upper(), address=data.get('address'))
    db.session.add(wh)
    db.session.commit()
    return jsonify(wh.to_dict()), 201


@warehouses_bp.get('/<int:wh_id>')
@jwt_required()
def get_warehouse(wh_id):
    wh = Warehouse.query.get_or_404(wh_id)
    d = wh.to_dict()
    d['locations'] = [loc.to_dict() for loc in wh.locations]
    return jsonify(d), 200


@warehouses_bp.post('/<int:wh_id>/locations')
@jwt_required()
def add_location(wh_id):
    Warehouse.query.get_or_404(wh_id)
    data = request.get_json()
    loc = Location(
        warehouse_id=wh_id,
        name=data['name'],
        code=data['code'].upper(),
        loc_type=data.get('loc_type', 'internal'),
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify(loc.to_dict()), 201


@warehouses_bp.get('/locations')
@jwt_required()
def list_all_locations():
    locations = Location.query.filter_by(is_active=True).all()
    return jsonify([l.to_dict() for l in locations]), 200
