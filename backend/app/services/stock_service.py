"""
StockService — Core inventory engine.

All stock quantity changes MUST go through this service.
Every operation is atomic: updates stock_quants AND appends to stock_moves
in a single database transaction.
"""
from datetime import datetime, timezone
from sqlalchemy import select
from ..extensions import db
from ..models.stock import StockQuant, StockMove


def _get_or_create_quant(product_id: int, location_id: int) -> StockQuant:
    """Fetch existing stock quant or create a zero-qty one."""
    quant = db.session.execute(
        select(StockQuant)
        .where(StockQuant.product_id == product_id,
               StockQuant.location_id == location_id)
        .with_for_update()          # Row-level lock — prevents race conditions
    ).scalar_one_or_none()

    if quant is None:
        quant = StockQuant(product_id=product_id, location_id=location_id,
                           quantity=0, reserved_qty=0)
        db.session.add(quant)
        db.session.flush()          # get PK before we continue
    return quant


def _write_move(product_id, from_loc, to_loc, qty,
                move_type, ref_id, ref_type, user_id=None):
    move = StockMove(
        product_id=product_id,
        from_location_id=from_loc,
        to_location_id=to_loc,
        quantity=qty,
        move_type=move_type,
        reference_id=ref_id,
        reference_type=ref_type,
        created_by=user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(move)
    return move


# ─── PUBLIC API ───────────────────────────────────────────────────────────────

def increase_stock(product_id: int, location_id: int, qty: float,
                   move_type: str, ref_id: int, ref_type: str, user_id: int = None):
    """Increase stock at a location. Used for RECEIPTS."""
    if qty <= 0:
        raise ValueError(f"Quantity must be positive, got {qty}")

    quant = _get_or_create_quant(product_id, location_id)
    quant.quantity = float(quant.quantity) + qty
    quant.updated_at = datetime.now(timezone.utc)

    _write_move(product_id, None, location_id, qty, move_type, ref_id, ref_type, user_id)


def decrease_stock(product_id: int, location_id: int, qty: float,
                   move_type: str, ref_id: int, ref_type: str, user_id: int = None):
    """Decrease stock at a location. Used for DELIVERIES."""
    if qty <= 0:
        raise ValueError(f"Quantity must be positive, got {qty}")

    quant = _get_or_create_quant(product_id, location_id)
    available = float(quant.quantity) - float(quant.reserved_qty)

    if available < qty:
        from ..models.product import Product
        p = db.session.get(Product, product_id)
        name = p.name if p else f"product #{product_id}"
        raise ValueError(
            f"Insufficient stock for '{name}': "
            f"available={available:.3f}, requested={qty:.3f}"
        )

    quant.quantity = float(quant.quantity) - qty
    quant.updated_at = datetime.now(timezone.utc)

    _write_move(product_id, location_id, None, qty, move_type, ref_id, ref_type, user_id)


def transfer_stock(product_id: int, from_location_id: int, to_location_id: int,
                   qty: float, ref_id: int, ref_type: str, user_id: int = None):
    """
    Atomically move qty from one location to another.
    Total stock across all locations remains unchanged.
    Used for INTERNAL TRANSFERS.
    """
    if qty <= 0:
        raise ValueError(f"Quantity must be positive, got {qty}")
    if from_location_id == to_location_id:
        raise ValueError("Source and destination location cannot be the same")

    # Deduct from source
    src = _get_or_create_quant(product_id, from_location_id)
    available = float(src.quantity) - float(src.reserved_qty)
    if available < qty:
        from ..models.product import Product
        p = db.session.get(Product, product_id)
        name = p.name if p else f"product #{product_id}"
        raise ValueError(
            f"Insufficient stock at source for '{name}': "
            f"available={available:.3f}, requested={qty:.3f}"
        )
    src.quantity = float(src.quantity) - qty
    src.updated_at = datetime.now(timezone.utc)

    # Add to destination
    dst = _get_or_create_quant(product_id, to_location_id)
    dst.quantity = float(dst.quantity) + qty
    dst.updated_at = datetime.now(timezone.utc)

    _write_move(product_id, from_location_id, to_location_id,
                qty, 'transfer', ref_id, ref_type, user_id)


def adjust_stock(product_id: int, location_id: int,
                 counted_qty: float, ref_id: int, user_id: int = None):
    """
    Correct stock to match physical count.
    difference = counted - system  (negative = shrinkage)
    Used for STOCK ADJUSTMENTS.
    """
    quant = _get_or_create_quant(product_id, location_id)
    system_qty = float(quant.quantity)
    difference = counted_qty - system_qty

    if difference == 0:
        return 0   # nothing to do

    if difference > 0:
        increase_stock(product_id, location_id, difference,
                       'adjustment', ref_id, 'adjustment', user_id)
    else:
        decrease_stock(product_id, location_id, abs(difference),
                       'adjustment', ref_id, 'adjustment', user_id)

    return difference
