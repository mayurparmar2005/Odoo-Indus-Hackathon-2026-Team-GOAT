# CoreInventory IMS — System Architecture Document
> **Stack:** React (Vite) · Flask (Blueprint) · PostgreSQL  
> **Design Language:** Apple.com — whitespace-first, clean typography, glassmorphism cards

---

## 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER CLIENT                   │
│         React (Vite) + Zustand + React Query        │
│  Login → Dashboard → Products/Ops/Settings modules  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS + JWT Bearer
                       ▼
┌─────────────────────────────────────────────────────┐
│               FLASK REST API SERVER                 │
│  Blueprints: auth | products | receipts | deliveries│
│              transfers | adjustments | dashboard    │
│  Services: StockService (atomic ops, ledger writes) │
│  JWT middleware, Role guard, Rate limiter            │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL 16 Database                 │
│  Normalized tables, FK indexes, UNIQUE constraints  │
│  Transaction-safe atomic stock operations           │
└─────────────────────────────────────────────────────┘
```

### How Modules Communicate

| Layer | Responsibility |
|---|---|
| **React pages** | Render UI, call API layer, update local cache |
| **React Query** | Cache server state, auto-refetch, loading/error states |
| **Zustand** | Client-only state (auth token, sidebar open, theme) |
| **Axios client** | Base URL + auto-attach JWT header + 401 interceptor |
| **Flask routes** | Parse request, delegate to service, return JSON |
| **Flask services** | Business logic, validation, DB transactions |
| **SQLAlchemy models** | ORM mapping, relationships, type enforcement |
| **PostgreSQL** | ACID storage, constraints, indexes |

---

## 2. TECHNOLOGY STACK

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast HMR, JSX, huge ecosystem |
| **Routing** | React Router v6 | Nested routes, ProtectedRoute pattern |
| **Server State** | TanStack React Query | Auto-caching, pagination, mutations |
| **Client State** | Zustand | Minimal boilerplate, persist middleware |
| **HTTP** | Axios | Interceptors for JWT auto-attach |
| **Styling** | TailwindCSS | Apple-like utility classes, easy tokens |
| **Charts** | Recharts | Composable, React-native charts |
| **Icons** | Lucide React | Clean SF-style icon set |
| **Backend** | Flask 3 | Lightweight, Blueprints for modularity |
| **ORM** | Flask-SQLAlchemy | Pythonic models, transaction support |
| **Migrations** | Flask-Migrate (Alembic) | Version-controlled schema changes |
| **Auth** | Flask-JWT-Extended | Access + refresh tokens, guard decorators |
| **Database** | PostgreSQL 16 | ACID, constraints, JSON support, indexing |
| **Password** | bcrypt | Industry standard hashing |
| **CORS** | Flask-CORS | Whitelist React dev/prod origins |
| **Email (OTP)** | Flask-Mail / SMTP | OTP delivery for password reset |

---

## 3. DATABASE DESIGN

### ERD Overview

```
users ─────────── creates ──> receipts, deliveries, transfers, adjustments
categories ──────────────── products (many-to-one, hierarchical self-ref)
warehouses ──────────────── locations (one-to-many)
locations ────────────────── stock_quants (product+location = current qty)
products  ────────────────── stock_quants, receipt_lines, delivery_lines, ...
stock_quants ────────────── single source of truth for current quantity
stock_moves ─────────────── append-only ledger (every qty change)
```

### How Stock Quantity Is Calculated

> **stock_quants.quantity** is always the **live, running total**.  
> Every validated operation calls `stock_service` which:
> 1. Finds or creates the `stock_quant` row for [(product_id, location_id)](file:///c:/Users/chint/OneDrive/Desktop/WT%20EXP/htdocs/Odoo-Indus-Hackathon-2026-Team-GOAT-main/app.py#10-13)
> 2. Atomically `UPDATE stock_quants SET quantity = quantity ± delta`
> 3. Appends one row to `stock_moves` as the audit trail
>
> **You should NEVER calculate stock by summing stock_moves**.  
> stock_quants is the current snapshot; stock_moves is the immutable ledger.

---

### Full SQL Schema

```sql
-- ============================================================
-- CoreInventory Database Schema
-- PostgreSQL 16
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('manager','staff')),
    otp           VARCHAR(6),
    otp_expiry    TIMESTAMPTZ,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WAREHOUSES
-- ─────────────────────────────────────────
CREATE TABLE warehouses (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    address    TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- LOCATIONS (racks, zones, shelves)
-- ─────────────────────────────────────────
CREATE TABLE locations (
    id           SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    code         VARCHAR(30)  NOT NULL,
    loc_type     VARCHAR(20) NOT NULL DEFAULT 'internal'
                 CHECK (loc_type IN ('internal','customer','supplier','virtual')),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(warehouse_id, code)
);
CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);

-- ─────────────────────────────────────────
-- CATEGORIES (self-referential hierarchy)
-- ─────────────────────────────────────────
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────
CREATE TABLE products (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    sku            VARCHAR(80)  NOT NULL UNIQUE,
    category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    uom            VARCHAR(30)  NOT NULL DEFAULT 'pcs',
    min_stock_qty  NUMERIC(12,3) NOT NULL DEFAULT 0,
    description    TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);

-- ─────────────────────────────────────────
-- STOCK QUANTS (current live stock snapshot)
-- ─────────────────────────────────────────
CREATE TABLE stock_quants (
    id           SERIAL PRIMARY KEY,
    product_id   INTEGER NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
    location_id  INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity     NUMERIC(12,3) NOT NULL DEFAULT 0,
    reserved_qty NUMERIC(12,3) NOT NULL DEFAULT 0, -- reserved for pending deliveries
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);
CREATE INDEX idx_sq_product  ON stock_quants(product_id);
CREATE INDEX idx_sq_location ON stock_quants(location_id);

-- ─────────────────────────────────────────
-- RECEIPTS (Incoming Goods)
-- ─────────────────────────────────────────
CREATE TABLE receipts (
    id             SERIAL PRIMARY KEY,
    reference      VARCHAR(50) NOT NULL UNIQUE,  -- e.g. REC/2026/0001
    supplier_name  VARCHAR(150),
    warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','waiting','ready','done','cancelled')),
    scheduled_date DATE,
    validated_at   TIMESTAMPTZ,
    created_by     INTEGER NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_receipts_status    ON receipts(status);
CREATE INDEX idx_receipts_warehouse ON receipts(warehouse_id);

CREATE TABLE receipt_lines (
    id           SERIAL PRIMARY KEY,
    receipt_id   INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    expected_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    done_qty     NUMERIC(12,3) NOT NULL DEFAULT 0
);
CREATE INDEX idx_rl_receipt ON receipt_lines(receipt_id);

-- ─────────────────────────────────────────
-- DELIVERIES (Outgoing Goods)
-- ─────────────────────────────────────────
CREATE TABLE deliveries (
    id             SERIAL PRIMARY KEY,
    reference      VARCHAR(50) NOT NULL UNIQUE,  -- e.g. OUT/2026/0001
    customer_name  VARCHAR(150),
    warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','waiting','ready','done','cancelled')),
    scheduled_date DATE,
    validated_at   TIMESTAMPTZ,
    created_by     INTEGER NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_deliveries_status    ON deliveries(status);
CREATE INDEX idx_deliveries_warehouse ON deliveries(warehouse_id);

CREATE TABLE delivery_lines (
    id          SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    demand_qty  NUMERIC(12,3) NOT NULL DEFAULT 0,
    done_qty    NUMERIC(12,3) NOT NULL DEFAULT 0
);
CREATE INDEX idx_dl_delivery ON delivery_lines(delivery_id);

-- ─────────────────────────────────────────
-- INTERNAL TRANSFERS
-- ─────────────────────────────────────────
CREATE TABLE transfers (
    id               SERIAL PRIMARY KEY,
    reference        VARCHAR(50) NOT NULL UNIQUE,  -- e.g. INT/2026/0001
    from_location_id INTEGER NOT NULL REFERENCES locations(id),
    to_location_id   INTEGER NOT NULL REFERENCES locations(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','waiting','ready','done','cancelled')),
    validated_at     TIMESTAMPTZ,
    created_by       INTEGER NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transfer_lines (
    id          SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    NUMERIC(12,3) NOT NULL DEFAULT 0
);
CREATE INDEX idx_tl_transfer ON transfer_lines(transfer_id);

-- ─────────────────────────────────────────
-- STOCK ADJUSTMENTS
-- ─────────────────────────────────────────
CREATE TABLE adjustments (
    id           SERIAL PRIMARY KEY,
    reference    VARCHAR(50) NOT NULL UNIQUE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    location_id  INTEGER NOT NULL REFERENCES locations(id),
    system_qty   NUMERIC(12,3) NOT NULL,
    counted_qty  NUMERIC(12,3) NOT NULL,
    difference   NUMERIC(12,3) NOT NULL,  -- counted - system (negative = shrinkage)
    reason       TEXT,
    created_by   INTEGER NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_adj_product  ON adjustments(product_id);
CREATE INDEX idx_adj_location ON adjustments(location_id);

-- ─────────────────────────────────────────
-- STOCK MOVES (Immutable Ledger)
-- ─────────────────────────────────────────
CREATE TABLE stock_moves (
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    from_location_id INTEGER REFERENCES locations(id),  -- NULL for receipts
    to_location_id   INTEGER REFERENCES locations(id),  -- NULL for deliveries
    quantity         NUMERIC(12,3) NOT NULL,
    move_type        VARCHAR(20) NOT NULL
                     CHECK (move_type IN ('receipt','delivery','transfer','adjustment')),
    reference_id     INTEGER NOT NULL,   -- FK to receipts/deliveries/transfers/adjustments
    reference_type   VARCHAR(20) NOT NULL,
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sm_product    ON stock_moves(product_id);
CREATE INDEX idx_sm_move_type  ON stock_moves(move_type);
CREATE INDEX idx_sm_created_at ON stock_moves(created_at);
CREATE INDEX idx_sm_from_loc   ON stock_moves(from_location_id);
CREATE INDEX idx_sm_to_loc     ON stock_moves(to_location_id);
```

---

## 4. INVENTORY FLOW DESIGN

### 4.1 Receipt Flow (Stock In)
```
Create Receipt (Draft)
   → Add supplier, warehouse, product lines + expected qty
   → Status: Draft → Ready
   → Click "Validate"
      └─ stock_service.increase_stock(product_id, location_id, done_qty)
         ├─ UPDATE stock_quants SET quantity += done_qty WHERE product_id=X AND location_id=Y
         └─ INSERT INTO stock_moves (type='receipt', from=NULL, to=location_id, qty=done_qty)
   → Receipt status: Done
```

### 4.2 Delivery Flow (Stock Out)
```
Create Delivery (Draft)
   → Add customer, warehouse, product lines + demand qty
   → System checks: available_qty = stock_quants.quantity - reserved_qty
   → Status: Draft → Ready (if stock available) or Waiting (if not)
   → Click "Validate"
      └─ stock_service.decrease_stock(product_id, location_id, done_qty)
         ├─ ASSERT quantity >= done_qty (raise 400 if insufficient)
         ├─ UPDATE stock_quants SET quantity -= done_qty WHERE ...
         └─ INSERT INTO stock_moves (type='delivery', from=location_id, to=NULL, qty=done_qty)
   → Delivery status: Done
```

### 4.3 Internal Transfer Flow (Location Change)
```
Create Transfer (Draft)
   → Select from_location → to_location → product lines + qty
   → Click "Validate"
      └─ stock_service.transfer_stock(product_id, from_loc, to_loc, qty) [single transaction]
         ├─ UPDATE stock_quants SET quantity -= qty WHERE product_id=X AND location_id=from_loc
         ├─ INSERT/UPDATE stock_quants SET quantity += qty WHERE product_id=X AND location_id=to_loc
         └─ INSERT INTO stock_moves (type='transfer', from=from_loc, to=to_loc, qty=qty)
   → Total stock unchanged. Location attribution changed.
```

### 4.4 Stock Adjustment Flow (Correction)
```
Select product + location
   → System shows: system_qty (from stock_quants)
   → User enters: counted_qty (physical count)
   → difference = counted_qty - system_qty
If difference > 0: call increase_stock(product_id, location_id, abs(difference))
If difference < 0: call decrease_stock(product_id, location_id, abs(difference))
   → INSERT INTO adjustments (system_qty, counted_qty, difference, reason)
   → INSERT INTO stock_moves (type='adjustment', qty=|difference|)
```

### 4.5 The Stock Ledger

`stock_moves` is an **append-only audit log**. Every single quantity change — regardless of source — produces exactly one row in `stock_moves`. This gives:

- Complete history of every gram/unit moved
- Traceability (linked to receipts/deliveries/transfers/adjustments via reference_id + reference_type)
- Ability to replay and audit
- Regulatory compliance

---

## 5. API DESIGN

> All endpoints prefixed with `/api/`  
> All protected routes require: `Authorization: Bearer <jwt_token>`

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT tokens |
| POST | `/auth/forgot-password` | Send OTP to email |
| POST | `/auth/verify-otp` | Validate OTP |
| POST | `/auth/reset-password` | Set new password |
| POST | `/auth/refresh` | Refresh access token |

**POST /auth/login** Request:
```json
{ "email": "manager@co.com", "password": "Secret123!" }
```
Response `200`:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": 1, "name": "Ali Hassan", "role": "manager" }
}
```

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List products (search, category, low_stock) |
| POST | `/products` | Create product |
| GET | `/products/:id` | Get product + stock quants |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Soft delete |
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |

**POST /products** Request:
```json
{
  "name": "Steel Rod 10mm",
  "sku": "SR-10MM-001",
  "category_id": 3,
  "uom": "pcs",
  "min_stock_qty": 50
}
```

### Receipts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/receipts` | List (status, warehouse, date filters) |
| POST | `/receipts` | Create draft |
| GET | `/receipts/:id` | Detail with lines |
| PUT | `/receipts/:id` | Update lines |
| POST | `/receipts/:id/validate` | **Validate → stock increases** |

**POST /receipts/:id/validate** Response `200`:
```json
{
  "message": "Receipt validated",
  "moves_created": 3,
  "receipt": { "id": 12, "status": "done", "reference": "REC/2026/0012" }
}
```

### Deliveries
| Method | Endpoint | Description |
|---|---|---|
| GET | `/deliveries` | List |
| POST | `/deliveries` | Create draft |
| GET | `/deliveries/:id` | Detail |
| POST | `/deliveries/:id/validate` | **Validate → stock decreases** |

### Transfers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/transfers` | List |
| POST | `/transfers` | Create |
| POST | `/transfers/:id/validate` | **Validate → atomic location change** |

### Adjustments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/adjustments` | Adjustment history |
| POST | `/adjustments` | Apply adjustment |

**POST /adjustments** Request:
```json
{
  "product_id": 7,
  "location_id": 2,
  "counted_qty": 45,
  "reason": "Physical count after Q1 audit"
}
```

### Dashboard & Stock
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/kpis` | KPI summary |
| GET | `/dashboard/alerts` | Low stock alerts |
| GET | `/dashboard/recent-moves` | Last 10 stock moves |
| GET | `/stock/quants` | All current stock (product+location) |
| GET | `/stock/moves` | Ledger (paginated, filterable) |
| GET | `/warehouses` | List warehouses |
| POST | `/warehouses` | Create warehouse |
| GET | `/warehouses/:id/locations` | Locations in warehouse |
| POST | `/warehouses/:id/locations` | Add location |

---

## 6. BACKEND MODULE STRUCTURE

```
backend/
├── run.py                    ← Entry point: create_app(), run server
├── .env                      ← DATABASE_URL, SECRET_KEY, JWT_SECRET, MAIL_*
├── requirements.txt
├── app/
│   ├── __init__.py           ← create_app() factory: register blueprints, extensions
│   ├── config.py             ← DevelopmentConfig, ProductionConfig
│   ├── extensions.py         ← db = SQLAlchemy(), jwt = JWTManager(), migrate, cors
│   │
│   ├── models/               ← Pure ORM models. No business logic here.
│   │   ├── __init__.py
│   │   ├── user.py           ← User model, check_password(), to_dict()
│   │   ├── product.py        ← Product, Category
│   │   ├── warehouse.py      ← Warehouse, Location
│   │   ├── stock.py          ← StockQuant, StockMove
│   │   ├── receipt.py        ← Receipt, ReceiptLine
│   │   ├── delivery.py       ← Delivery, DeliveryLine
│   │   ├── transfer.py       ← Transfer, TransferLine
│   │   └── adjustment.py     ← Adjustment
│   │
│   ├── routes/               ← Blueprints. Parse request, call service, return JSON.
│   │   ├── auth.py           ← Blueprint('auth', url_prefix='/api/auth')
│   │   ├── products.py       ← Blueprint('products', url_prefix='/api/products')
│   │   ├── receipts.py
│   │   ├── deliveries.py
│   │   ├── transfers.py
│   │   ├── adjustments.py
│   │   ├── warehouses.py
│   │   ├── stock.py          ← /api/stock/quants, /api/stock/moves
│   │   └── dashboard.py      ← /api/dashboard/*
│   │
│   ├── services/             ← Business logic. Called by routes. Calls models.
│   │   ├── stock_service.py  ← increase_stock, decrease_stock, transfer_stock, adjust_stock
│   │   ├── auth_service.py   ← register, login, otp generation/verify
│   │   └── alert_service.py  ← get_low_stock_products()
│   │
│   ├── schemas/              ← Manual dict serializers (or marshmallow schemas)
│   │   ├── product_schema.py
│   │   └── stock_schema.py
│   │
│   └── middlewares/
│       ├── auth_middleware.py  ← @manager_required decorator
│       └── error_handlers.py  ← register 400, 404, 422, 500 JSON error responses
│
└── migrations/               ← Alembic auto-generated migration files
```

### Separation of Concerns

| Layer | Does | Does NOT |
|---|---|---|
| **Route** | Parse JSON, validate input shape, call service, format response | Touch DB directly |
| **Service** | Business logic, validation, orchestrate model calls, manage transactions | Know about HTTP |
| **Model** | ORM mapping, relationships, simple helpers like `to_dict()` | Contain business rules |
| **Schema** | Serialize/deserialize data | Know about HTTP or DB |

---

## 7. FRONTEND UI DESIGN

### Apple-Inspired Design Tokens
```css
/* tailwind.config.js extended colors */
colors: {
  apple: {
    bg: '#F5F5F7',
    surface: '#FFFFFF',
    blue: '#0071E3',
    blue-hover: '#0077ED',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    text: '#1D1D1F',
    secondary: '#6E6E73',
    border: '#D2D2D7',
  }
}
```

### Page Layouts

#### Login Page
```
┌─────────────────────────────────────────┐
│          [subtle gradient background]   │
│  ┌──────────────────────────────────┐   │
│  │  [CoreInventory logo wordmark]   │   │
│  │  Sign in to your account        │   │
│  │  ──────────────────────────────  │   │
│  │  Email ________________________  │   │
│  │  Password ____________________   │   │
│  │  [Sign In]  Forgot password?    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```
- Glassmorphism card (`backdrop-blur-xl bg-white/80`)
- SF Pro / Inter font, 16px base
- Apple Blue button with `border-radius: 980px`

#### App Shell (post-login)
```
┌──────┬────────────────────────────────────────┐
│      │ [TopNav: breadcrumb + search + bell]   │
│ Side │────────────────────────────────────────│
│  bar │                                        │
│      │         [Page Content]                 │
│ Nav  │                                        │
│ items│                                        │
│      │                                        │
│ User │                                        │
└──────┴────────────────────────────────────────┘
```

#### Dashboard
```
┌──── KPI Row ────────────────────────────────────┐
│ [Total Products] [Low Stock] [Out of Stock]     │
│ [Pending Receipts] [Pending Deliveries]         │
└─────────────────────────────────────────────────┘
┌─── Chart ────────┐  ┌─── Low Stock Alerts ─────┐
│  IN vs OUT bars  │  │  Product A  — 3 left  🔴  │
│  (last 7 days)   │  │  Product B  — 8 left  🟡  │
└──────────────────┘  └──────────────────────────┘
┌─── Recent Stock Moves (table) ─────────────────┐
│ Date | Product | Type | From | To | Qty         │
└─────────────────────────────────────────────────┘
```

---

## 8. DASHBOARD KPI CALCULATIONS

| KPI | SQL / Query |
|---|---|
| **Total Active Products** | `SELECT COUNT(*) FROM products WHERE is_active = TRUE` |
| **Out of Stock** | `SELECT COUNT(DISTINCT product_id) FROM stock_quants WHERE quantity <= 0` |
| **Low Stock** | `SELECT COUNT(*) FROM products p JOIN (SELECT product_id, SUM(quantity) qty FROM stock_quants GROUP BY product_id) s ON p.id=s.product_id WHERE s.qty > 0 AND s.qty <= p.min_stock_qty` |
| **Pending Receipts** | `SELECT COUNT(*) FROM receipts WHERE status IN ('draft','waiting','ready')` |
| **Pending Deliveries** | `SELECT COUNT(*) FROM deliveries WHERE status IN ('draft','waiting','ready')` |
| **Pending Transfers** | `SELECT COUNT(*) FROM transfers WHERE status IN ('draft','waiting','ready')` |

---

## 9. SCALABILITY & BEST PRACTICES

### Transaction Safety
Every stock operation (`increase`, `decrease`, `transfer`) runs inside a single `db.session` block:
```python
try:
    db.session.begin_nested()   # savepoint
    # ... update stock_quants
    # ... insert stock_moves
    db.session.commit()
except Exception as e:
    db.session.rollback()
    raise
```

### Database Indexing
- Primary keys (auto-indexed)
- All FK columns
- `products.sku` — for SKU search
- `stock_moves.created_at` — for ledger date-range queries
- `stock_moves.move_type` — for filter queries
- `stock_quants(product_id, location_id)` — UNIQUE index

### Concurrency Handling
- Use PostgreSQL **row-level locking**: `SELECT ... FOR UPDATE` when updating stock_quants
- Prevents race condition where two deliveries draw from same qty simultaneously

### Security Checklist
- [x] Passwords hashed with bcrypt (cost factor 12)
- [x] JWT secret in `.env`, never hardcoded
- [x] JWT expiry: access=15min, refresh=7days
- [x] Role-based route guards (`@manager_required`)
- [x] Rate limiting on auth endpoints (Flask-Limiter: 5 req/min)
- [x] CORS whitelist only production frontend domain
- [x] All inputs validated before DB write
- [x] SQL injection prevented by SQLAlchemy ORM (parameterized queries)
- [x] OTP has 10-minute expiry window

### Audit Logs
- `stock_moves` is the audit log — every qty change is permanent and traceable
- All documents store `created_by` (user FK) and `created_at`
- Adjustments store `reason` field

---

## 10. RECOMMENDED FOLDER STRUCTURE (Full Project)

```
CoreInventory/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── extensions.py
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── middlewares/
│   ├── migrations/
│   ├── run.py
│   ├── .env
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── store/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── charts/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── receipts/
│   │   │   ├── deliveries/
│   │   │   ├── transfers/
│   │   │   ├── adjustments/
│   │   │   ├── ledger/
│   │   │   └── settings/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── router/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── database/
│   └── schema.sql
│
├── docker-compose.yml
└── README.md
```

### Naming Conventions
| Item | Convention | Example |
|---|---|---|
| DB tables | `snake_case` plural | `stock_quants` |
| DB columns | `snake_case` | `created_at` |
| Python files | `snake_case` | `stock_service.py` |
| Python classes | `PascalCase` | `StockQuant` |
| Python functions | `snake_case` | `increase_stock()` |
| React components | `PascalCase.jsx` | `ReceiptDetail.jsx` |
| React hooks | `camelCase` prefixed `use` | `useStockLedger.js` |
| API routes | `kebab-case` | `/api/stock-moves` |
| CSS classes | Tailwind utilities | No custom names needed |
| References | `TYPE/YYYY/0001` | `REC/2026/0001` |

---

## IMPLEMENTATION ORDER

Build in this exact order to avoid circular dependencies:

1. **PostgreSQL schema** (schema.sql, run it)
2. **Flask skeleton** (create_app, extensions, config)
3. **SQLAlchemy models** (all tables)
4. **Flask-Migrate** setup + initial migration
5. **Auth routes + service** (register, login, OTP)
6. **Stock service** (the core engine)
7. **Products + Categories endpoints**
8. **Warehouses + Locations endpoints**
9. **Receipts endpoint + validate**
10. **Deliveries endpoint + validate**
11. **Transfers endpoint + validate**
12. **Adjustments endpoint**
13. **Dashboard KPI endpoint**
14. **Stock moves ledger endpoint**
15. **React project init + Tailwind + design tokens**
16. **Auth pages (Login, Forgot, OTP, Reset)**
17. **App shell (Sidebar + TopNav + ProtectedRoute)**
18. **Dashboard page**
19. **Products, Receipts, Deliveries, Transfers, Adjustments pages**
20. **Stock Ledger page**
21. **Settings (Warehouses)**
22. **Polish: animations, empty states, error toasts, mobile**
