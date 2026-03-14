from flask import jsonify


def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'message': 'Bad request', 'detail': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'message': 'Unauthorized'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'message': 'Forbidden'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'message': 'Resource not found'}), 404

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({'message': 'Conflict — resource already exists'}), 409

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({'message': str(e)}), 422

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'message': 'Internal server error', 'detail': str(e)}), 500
