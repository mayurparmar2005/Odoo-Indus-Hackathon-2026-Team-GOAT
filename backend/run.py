"""
Backend entry point.
Run with:  python run.py
Or:        flask run  (with FLASK_APP=run.py)
"""
import os
from app import create_app

app = create_app(os.getenv('FLASK_ENV', 'development'))


@app.cli.command('seed')
def seed():
    """Seed initial data: admin user + default warehouse."""
    from app.extensions import db
    from app.models import User, Warehouse, Location
    from app.services.auth_service import hash_password

    with app.app_context():
        db.create_all()

        # Admin user
        if not User.query.filter_by(email='admin@coreinventory.com').first():
            admin = User(
                login_id='admin',
                name='Admin User',
                email='admin@coreinventory.com',
                password_hash=hash_password('Admin@1234'),
                role='manager',
            )
            db.session.add(admin)
            print("[OK] Admin user created  (login_id=admin / Admin@1234)")

        # Default warehouse
        if not Warehouse.query.filter_by(code='WH-MAIN').first():
            wh = Warehouse(name='Main Warehouse', code='WH-MAIN', address='Industrial Zone, Karachi')
            db.session.add(wh)
            db.session.flush()

            for loc_name, loc_code in [('Rack A', 'RACK-A'), ('Store Room', 'STORE'), ('Production Floor', 'PROD-FL')]:
                db.session.add(Location(warehouse_id=wh.id, name=loc_name, code=loc_code, loc_type='internal'))
            print("[OK] WH-MAIN warehouse created with 3 locations")

        db.session.commit()
        print("[OK] Seed complete!")


@app.cli.command('demo')
def seed_demo():
    """Seed rich demo data for hackathon presentation."""
    from app.extensions import db
    from app.models import User, Warehouse, Location, Category, Product
    from app.models.stock import StockQuant, StockMove
    from app.services.auth_service import hash_password
    from datetime import datetime, timezone

    with app.app_context():

        # ── Staff user ──────────────────────────────────────────────────
        if not User.query.filter_by(email='staff@coreinventory.com').first():
            db.session.add(User(
                login_id='staffuser',
                name='Warehouse Staff',
                email='staff@coreinventory.com',
                password_hash=hash_password('Staff@1234'),
                role='staff',
            ))
            print("[OK] Staff user created  (login_id=staffuser / Staff@1234)")

        # ── Second warehouse ────────────────────────────────────────────
        wh2 = Warehouse.query.filter_by(code='WH-SOUTH').first()
        if not wh2:
            wh2 = Warehouse(name='South Distribution Hub', code='WH-SOUTH', address='SITE Area, Karachi')
            db.session.add(wh2)
            db.session.flush()
            for lname, lcode in [('Bay 1', 'BAY-1'), ('Bay 2', 'BAY-2'), ('Cold Storage', 'COLD')]:
                db.session.add(Location(warehouse_id=wh2.id, name=lname, code=lcode, loc_type='internal'))
            print("[OK] WH-SOUTH warehouse created with 3 locations")

        db.session.commit()

        # ── Categories ──────────────────────────────────────────────────
        cat_data = [
            ('Raw Materials',    'Industrial raw materials and inputs'),
            ('Finished Goods',   'Ready-for-sale finished products'),
            ('Packaging',        'Boxes, wraps, and packing materials'),
            ('Tools & Equipment','Workshop tools and machinery parts'),
            ('Safety & PPE',     'Personal protective equipment and safety items'),
        ]
        cats = {}
        for name, desc in cat_data:
            c = Category.query.filter_by(name=name).first()
            if not c:
                c = Category(name=name, description=desc)
                db.session.add(c)
                db.session.flush()
            cats[name] = c
        db.session.commit()
        print(f"[OK] {len(cat_data)} categories ready")

        # ── Products ────────────────────────────────────────────────────
        products_data = [
            # (name, sku, category, uom, min_qty, description)
            ('Steel Rod 10mm',        'SR-10MM',  'Raw Materials',     'pcs',  100, 'Mild steel rod, 10mm diameter, 6m length'),
            ('Steel Rod 16mm',        'SR-16MM',  'Raw Materials',     'pcs',   50, 'Mild steel rod, 16mm diameter, 6m length'),
            ('Aluminum Sheet 2mm',    'AL-SH-2',  'Raw Materials',     'pcs',   30, 'Aluminum alloy sheet, 2mm thickness, 4x8 ft'),
            ('Copper Wire 2.5mm',     'CW-2.5',   'Raw Materials',     'kg',    20, 'Electrical grade copper wire spool'),
            ('Industrial Bolt M12',   'BLT-M12',  'Raw Materials',     'pcs',  500, 'Hex head bolt M12x50mm zinc plated'),
            ('Widget Assembly A',     'WGT-A',    'Finished Goods',    'pcs',   25, 'Fully assembled Widget Type A — model 2024'),
            ('Widget Assembly B',     'WGT-B',    'Finished Goods',    'pcs',   15, 'Fully assembled Widget Type B — heavy duty'),
            ('Control Panel Unit',    'CPU-STD',  'Finished Goods',    'unit',  10, 'Standard control panel, 24V DC, 12-relay'),
            ('Cardboard Box Large',   'BOX-LG',   'Packaging',        'pcs',  200, 'Single-wall corrugated box 60x40x40 cm'),
            ('Bubble Wrap Roll',      'BW-ROLL',  'Packaging',        'roll',  10, '1.2m wide, 50m length, small bubble'),
            ('Safety Helmet',         'PPE-HLM',  'Safety & PPE',     'pcs',   20, 'EN397 certified hard hat, adjustable'),
            ('Safety Gloves (pair)',  'PPE-GLV',  'Safety & PPE',     'pair',  50, 'Cut-resistant Level D, size L'),
        ]

        wh_main = Warehouse.query.filter_by(code='WH-MAIN').first()
        rack_a   = Location.query.filter_by(code='RACK-A').first()
        store    = Location.query.filter_by(code='STORE').first()

        admin = User.query.filter_by(email='admin@coreinventory.com').first()

        new_products = 0
        for name, sku, cat_name, uom, min_qty, desc in products_data:
            if product := Product.query.filter_by(sku=sku).first():
                continue  # skip existing
            p = Product(
                name=name, sku=sku,
                category_id=cats[cat_name].id,
                uom=uom, min_stock_qty=min_qty,
                description=desc,
            )
            db.session.add(p)
            db.session.flush()
            new_products += 1

            # Give each product some starting stock (varied quantities)
            import random
            initial_qty = random.randint(int(min_qty * 0.4), int(min_qty * 2.5))
            # Some products intentionally below min stock for alerts
            if sku in ('CPU-STD', 'WGT-B', 'AL-SH-2'):
                initial_qty = random.randint(1, int(min_qty * 0.5))

            location = rack_a if sku.startswith(('SR', 'AL', 'CW', 'BLT')) else store

            # Add StockQuant
            quant = StockQuant(
                product_id=p.id,
                location_id=location.id,
                quantity=initial_qty,
            )
            db.session.add(quant)

            # Record stock move
            move = StockMove(
                product_id=p.id,
                to_location_id=location.id,
                quantity=initial_qty,
                move_type='receipt',
                reference_id=0,
                reference_type='seed',
                created_by=admin.id if admin else None,
            )
            db.session.add(move)

        db.session.commit()
        print(f"[OK] {new_products} products created with initial stock")

        # ── Summary ─────────────────────────────────────────────────────
        total_p = Product.query.filter_by(is_active=True).count()
        total_moves = StockMove.query.count()
        print(f"[OK] Demo seed complete!")
        print(f"     Products : {total_p}")
        print(f"     Stock moves: {total_moves}")
        print(f"     Login as admin: admin@coreinventory.com / admin123")
        print(f"     Login as staff: staff@coreinventory.com / staff123")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
