import os
from flask import Flask
from .config import config_map
from .extensions import db, migrate, jwt, cors, mail

def create_app(env=None):
    env = env or os.getenv('FLASK_ENV', 'development')
    app = Flask(__name__)
    app.config.from_object(config_map.get(env, config_map['default']))

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    mail.init_app(app)

    # Register blueprints
    from .routes.auth        import auth_bp
    from .routes.products    import products_bp
    from .routes.warehouses  import warehouses_bp
    from .routes.receipts    import receipts_bp
    from .routes.deliveries  import deliveries_bp
    from .routes.transfers   import transfers_bp
    from .routes.adjustments import adjustments_bp
    from .routes.stock       import stock_bp
    from .routes.dashboard   import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(warehouses_bp)
    app.register_blueprint(receipts_bp)
    app.register_blueprint(deliveries_bp)
    app.register_blueprint(transfers_bp)
    app.register_blueprint(adjustments_bp)
    app.register_blueprint(stock_bp)
    app.register_blueprint(dashboard_bp)

    # Register error handlers
    from .middlewares.error_handlers import register_error_handlers
    register_error_handlers(app)

    return app
