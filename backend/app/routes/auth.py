from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from ..services import auth_service
from ..extensions import mail

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.post('/register')
def register():
    data = request.get_json()
    try:
        user = auth_service.register_user(
            login_id=data['login_id'],
            name=data['name'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', 'staff')
        )
        access_token  = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        return jsonify({
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
    except (ValueError, KeyError) as e:
        return jsonify({'message': str(e)}), 400


# ── 2-Step Login ─────────────────────────────────────────────────────────────

@auth_bp.post('/login')
def login_step1():
    """
    Step 1: Verify login_id + password, then email an OTP to the user.
    Returns masked email so the frontend can show 'OTP sent to c*****@gmail.com'.
    Does NOT return JWT yet.
    """
    data = request.get_json()
    try:
        result = auth_service.login_user_step1(
            login_id=data['login_id'],
            password=data['password'],
            mail_ext=mail
        )
        return jsonify({
            'otp_sent': True,
            'masked_email': result['masked_email'],
            'login_id': result['login_id'],
            'message': f"OTP sent to {result['masked_email']}"
        }), 200
    except (ValueError, KeyError) as e:
        return jsonify({'message': str(e)}), 401


@auth_bp.post('/login/verify-otp')
def login_step2():
    """
    Step 2: Verify the OTP from email. If valid, issue JWT tokens.
    """
    data = request.get_json()
    try:
        user = auth_service.login_user_step2(
            login_id=data['login_id'],
            otp=data['otp']
        )
        access_token  = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        return jsonify({
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
    except (ValueError, KeyError) as e:
        return jsonify({'message': str(e)}), 401


# ── Forgot Password flow ──────────────────────────────────────────────────────

@auth_bp.post('/forgot-password')
def forgot_password():
    data = request.get_json()
    try:
        auth_service.send_otp(data['email'], mail)
        return jsonify({'message': 'OTP sent to email'}), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 404


@auth_bp.post('/verify-otp')
def verify_otp():
    data = request.get_json()
    try:
        auth_service.verify_otp(data['email'], data['otp'])
        return jsonify({'message': 'OTP verified', 'valid': True}), 200
    except ValueError as e:
        return jsonify({'message': str(e), 'valid': False}), 400


@auth_bp.post('/reset-password')
def reset_password():
    data = request.get_json()
    try:
        auth_service.reset_password(data['email'], data['otp'], data['new_password'])
        return jsonify({'message': 'Password reset successfully'}), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 400


@auth_bp.get('/me')
@jwt_required()
def me():
    from ..models.user import User
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.post('/refresh')
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200
