# CoreInventory IMS — Master Task Checklist
> Stack: **React** (Vite + TailwindCSS) · **Flask** (Blueprint architecture) · **PostgreSQL**
> Style reference: **Apple.com** — clean whitespace, SF-style typography, glassmorphism cards, micro-animations

---

## PHASE 0 — Project Scaffolding
- [ ] Create monorepo folder structure:
  ```
  CoreInventory/
  ├── backend/          ← Flask API
  ├── frontend/         ← React (Vite)
  ├── database/         ← SQL schemas & migrations
  └── docs/             ← ERD, API docs
  ```
- [ ] Init git repo, [.gitignore](file:///c:/Users/chint/OneDrive/Desktop/WT%20EXP/htdocs/Odoo-Indus-Hackathon-2026-Team-GOAT-main/.gitignore) for Python + Node
- [ ] Create root [README.md](file:///c:/Users/chint/OneDrive/Desktop/WT%20EXP/htdocs/Odoo-Indus-Hackathon-2026-Team-GOAT-main/README.md)

---

## PHASE 1 — Database Design & Schema

### 1.1 PostgreSQL Setup
- [ ] Install PostgreSQL locally (or use Docker `postgres:16-alpine`)
- [ ] Create database: `coreinventory_db`
- [ ] Create `.env` with `DATABASE_URL`

### 1.2 Core Tables (ERD)
- [ ] `users` — id, name, email, password_hash, role, otp, otp_expiry, created_at
- [ ] `warehouses` — id, name, code, address, is_active
- [ ] `locations` — id, warehouse_id (FK), name, code, type (rack/shelf/zone)
- [ ] `categories` — id, name, parent_id (self-ref FK), description
- [ ] `products` — id, name, sku, category_id (FK), uom, min_stock_qty, description, is_active, created_at
- [ ] `stock_quants` — id, product_id (FK), location_id (FK), quantity, reserved_qty (UNIQUE constraint on product+location)
- [ ] `receipts` — id, reference, supplier_name, warehouse_id (FK), status, scheduled_date, created_by (FK), created_at
- [ ] `receipt_lines` — id, receipt_id (FK), product_id (FK), expected_qty, done_qty
- [ ] `deliveries` — id, reference, customer_name, warehouse_id (FK), status, scheduled_date, created_by (FK), created_at
- [ ] `delivery_lines` — id, delivery_id (FK), product_id (FK), demand_qty, done_qty
- [ ] `transfers` — id, reference, from_location_id (FK), to_location_id (FK), status, created_by (FK), created_at
- [ ] `transfer_lines` — id, transfer_id (FK), product_id (FK), quantity
- [ ] `adjustments` — id, product_id (FK), location_id (FK), counted_qty, system_qty, difference, reason, created_by (FK), created_at
- [ ] `stock_moves` — id (ledger), product_id (FK), from_location_id (FK nullable), to_location_id (FK nullable), quantity, move_type (RECEIPT/DELIVERY/TRANSFER/ADJUSTMENT), reference_id, reference_type, created_at
- [ ] Write `database/schema.sql` with all DDL + indexes
- [ ] Add FK indexes on all foreign keys
- [ ] Add composite UNIQUE index on `stock_quants(product_id, location_id)`

---

## PHASE 2 — Backend (Flask)

### 2.1 Project Setup
- [ ] `cd backend && python -m venv venv && pip install flask flask-sqlalchemy flask-migrate flask-jwt-extended flask-cors psycopg2-binary python-dotenv bcrypt`
- [ ] Create [requirements.txt](file:///c:/Users/chint/OneDrive/Desktop/WT%20EXP/htdocs/Odoo-Indus-Hackathon-2026-Team-GOAT-main/requirements.txt)
- [ ] Create `config.py` (Dev / Prod configs)
- [ ] Create `extensions.py` (db, jwt, cors, migrate instances)

### 2.2 Folder Structure
```
backend/
├── app/
│   ├── __init__.py          ← create_app() factory
│   ├── config.py
│   ├── extensions.py
│   ├── models/
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── warehouse.py
│   │   ├── stock.py         ← stock_quants, stock_moves
│   │   ├── receipt.py
│   │   ├── delivery.py
│   │   ├── transfer.py
│   │   └── adjustment.py
│   ├── routes/
│   │   ├── auth.py          ← Blueprint
│   │   ├── products.py
│   │   ├── warehouses.py
│   │   ├── receipts.py
│   │   ├── deliveries.py
│   │   ├── transfers.py
│   │   ├── adjustments.py
│   │   └── dashboard.py
│   ├── services/
│   │   ├── stock_service.py ← core stock logic
│   │   ├── auth_service.py
│   │   └── alert_service.py
│   ├── schemas/             ← marshmallow / manual serializers
│   └── middlewares/
│       └── auth_middleware.py
├── migrations/
├── run.py
└── .env
```

### 2.3 Auth Module
- [ ] `POST /api/auth/register` — hash password (bcrypt), save user
- [ ] `POST /api/auth/login` — verify password, return JWT access + refresh tokens
- [ ] `POST /api/auth/forgot-password` — generate 6-digit OTP, email it
- [ ] `POST /api/auth/verify-otp` — validate OTP + expiry
- [ ] `POST /api/auth/reset-password` — update password hash
- [ ] JWT `@jwt_required()` decorator on all protected routes
- [ ] Role guard middleware (Manager vs Staff)

### 2.4 Products Module
- [ ] `GET /api/products` — list with filters (category, search, low_stock)
- [ ] `POST /api/products` — create product
- [ ] `GET /api/products/<id>` — single product + stock per location
- [ ] `PUT /api/products/<id>` — update product
- [ ] `DELETE /api/products/<id>` — soft delete (is_active=false)
- [ ] `GET /api/categories` — list categories
- [ ] `POST /api/categories` — create category
- [ ] `GET /api/products/<id>/stock` — stock_quants breakdown by location

### 2.5 Warehouse Module
- [ ] `GET /api/warehouses` — list all
- [ ] `POST /api/warehouses` — create warehouse
- [ ] `GET /api/warehouses/<id>/locations` — list locations in warehouse
- [ ] `POST /api/warehouses/<id>/locations` — add location

### 2.6 Receipts Module
- [ ] `GET /api/receipts` — list (filter: status, warehouse, date)
- [ ] `POST /api/receipts` — create draft receipt
- [ ] `GET /api/receipts/<id>` — detail with lines
- [ ] `PUT /api/receipts/<id>` — update (add/remove lines)
- [ ] `POST /api/receipts/<id>/validate` — **validate: increment stock_quants + write stock_moves**
- [ ] Status flow: Draft → Waiting → Ready → Done / Cancelled

### 2.7 Deliveries Module
- [ ] `GET /api/deliveries` — list
- [ ] `POST /api/deliveries` — create draft delivery
- [ ] `GET /api/deliveries/<id>` — detail
- [ ] `PUT /api/deliveries/<id>` — update lines
- [ ] `POST /api/deliveries/<id>/validate` — **validate: decrement stock_quants + write stock_moves, check availability**
- [ ] Availability check: reserved_qty logic

### 2.8 Transfers Module
- [ ] `GET /api/transfers` — list
- [ ] `POST /api/transfers` — create (from_location → to_location)
- [ ] `GET /api/transfers/<id>` — detail
- [ ] `POST /api/transfers/<id>/validate` — **decrement source, increment dest stock_quants + write stock_moves**

### 2.9 Adjustments Module
- [ ] `GET /api/adjustments` — list adjustment history
- [ ] `POST /api/adjustments` — create adjustment (auto-calculate difference, write stock_move)
- [ ] Negative adjustment (shrinkage) ← system handles sign

### 2.10 Dashboard Module
- [ ] `GET /api/dashboard/kpis` — returns:
  - total_products, low_stock_count, out_of_stock_count
  - pending_receipts, pending_deliveries, pending_transfers
- [ ] `GET /api/dashboard/recent-moves` — last 10 stock_moves
- [ ] `GET /api/dashboard/alerts` — products below min_stock_qty

### 2.11 Stock Ledger
- [ ] `GET /api/stock/moves` — paginated stock_moves (filter: product, type, date range)
- [ ] `GET /api/stock/quants` — current stock snapshot per product+location

### 2.12 Core Stock Service (`stock_service.py`)
- [ ] `increase_stock(product_id, location_id, qty, move_type, ref_id, ref_type)` — atomic
- [ ] `decrease_stock(product_id, location_id, qty, ...)` — check sufficient qty, raise on shortfall
- [ ] `transfer_stock(product_id, from_loc, to_loc, qty, ...)` — atomic two-op
- [ ] `adjust_stock(product_id, location_id, counted_qty)` — compute delta, call increase/decrease
- [ ] All ops wrapped in `db.session` transactions with rollback on error

---

## PHASE 3 — Frontend (React + Vite)

### 3.1 Project Setup
- [ ] `npm create vite@latest frontend -- --template react`
- [ ] Install: `tailwindcss postcss autoprefixer react-router-dom axios zustand react-query @tanstack/react-query react-hot-toast lucide-react recharts`
- [ ] Configure Tailwind with custom design tokens (Apple-inspired palette)
- [ ] Setup `src/api/axiosClient.js` with base URL + JWT interceptor
- [ ] Setup `src/store/authStore.js` (Zustand)

### 3.2 Design System (Apple-Inspired)
- [ ] Font: **SF Pro Display** (Inter as fallback) from Google Fonts
- [ ] Color palette:
  - Background: `#F5F5F7` (Apple light gray)
  - Surface: `#FFFFFF`
  - Primary: `#0071E3` (Apple blue)
  - Success: `#34C759`, Warning: `#FF9500`, Danger: `#FF3B30`
  - Text primary: `#1D1D1F`, Text secondary: `#6E6E73`
- [ ] Glassmorphism card: `backdrop-blur-md bg-white/70 border border-white/20 shadow-xl`
- [ ] Micro-animations: `transition-all duration-300 ease-in-out`
- [ ] Shared components: `Button`, `Card`, `Input`, `Badge`, `Modal`, `Table`, `Sidebar`

### 3.3 Folder Structure
```
frontend/src/
├── api/
│   ├── axiosClient.js
│   ├── authApi.js
│   ├── productsApi.js
│   ├── receiptsApi.js
│   ├── deliveriesApi.js
│   ├── transfersApi.js
│   ├── adjustmentsApi.js
│   └── dashboardApi.js
├── store/
│   ├── authStore.js        ← Zustand
│   └── uiStore.js
├── components/
│   ├── common/             ← Button, Card, Input, Badge, Modal, Spinner
│   ├── layout/             ← Sidebar, TopNav, PageWrapper
│   └── charts/             ← StockBarChart, KPICard
├── pages/
│   ├── auth/               ← Login.jsx, ForgotPassword.jsx, ResetPassword.jsx
│   ├── dashboard/          ← Dashboard.jsx
│   ├── products/           ← Products.jsx, ProductDetail.jsx, ProductForm.jsx
│   ├── receipts/           ← Receipts.jsx, ReceiptDetail.jsx, ReceiptForm.jsx
│   ├── deliveries/         ← Deliveries.jsx, DeliveryDetail.jsx
│   ├── transfers/          ← Transfers.jsx, TransferForm.jsx
│   ├── adjustments/        ← Adjustments.jsx
│   ├── ledger/             ← StockLedger.jsx
│   └── settings/           ← Warehouses.jsx, WarehouseForm.jsx
├── hooks/
│   ├── useAuth.js
│   └── useStock.js
├── utils/
│   ├── formatters.js       ← currency, date, qty
│   └── validators.js
├── router/
│   └── AppRouter.jsx       ← ProtectedRoute, routes
├── App.jsx
└── main.jsx
```

### 3.4 Auth Pages
- [ ] **Login Page** — Apple-style centered card, email/password, "Sign In" button
  - Logo + "CoreInventory" wordmark
  - Subtle gradient background
  - Redirect to dashboard on success
- [ ] **Forgot Password Page** — email input → send OTP
- [ ] **OTP Verification Page** — 6-box OTP input
- [ ] **Reset Password Page** — new password + confirm

### 3.5 Layout Shell
- [ ] **Sidebar** — fixed left, collapsible
  - Logo at top
  - Nav items: Dashboard, Products, Receipts, Deliveries, Transfers, Adjustments, Ledger, Settings
  - Active state: Apple blue left border + tinted bg
  - Bottom: User avatar + name + logout
- [ ] **TopNav** — breadcrumb + search bar + notification bell (low stock badge)
- [ ] **ProtectedRoute** — redirect to login if no JWT

### 3.6 Dashboard Page
- [ ] KPI Cards row: Total Products | Low Stock | Out of Stock | Pending Receipts | Pending Deliveries
  - Glassmorphism style, icon + number + label + trend arrow
- [ ] Stock Movement Bar Chart (Recharts) — last 7 days IN vs OUT
- [ ] Recent Stock Moves table (last 10 moves)
- [ ] Low Stock Alerts panel (products below min_stock_qty)
- [ ] Filter bar: warehouse selector

### 3.7 Products Pages
- [ ] **Products List** — searchable, filterable (category, stock status) data table
  - Columns: SKU | Name | Category | UOM | Current Stock | Min Stock | Status
  - Row actions: View, Edit
- [ ] **Product Detail** — stock breakdown by location, reorder rules
- [ ] **Product Form** — create / edit (name, SKU, category, UOM, min stock)

### 3.8 Receipts Pages
- [ ] **Receipts List** — status badges (Draft/Waiting/Ready/Done/Cancelled), filters
- [ ] **Receipt Form** — supplier, warehouse, scheduled date, add product lines (product + qty)
- [ ] **Receipt Detail** — line items view, status timeline, **Validate button** (triggers stock increase)

### 3.9 Delivery Orders Pages
- [ ] **Deliveries List** — with status, customer, warehouse columns
- [ ] **Delivery Form** — customer, warehouse, product lines
- [ ] **Delivery Detail** — availability indicators per line, **Validate button** (triggers stock decrease)

### 3.10 Transfers Pages
- [ ] **Transfers List**
- [ ] **Transfer Form** — from location, to location, product lines
- [ ] **Transfer Detail** — validate button (atomic move)

### 3.11 Adjustments Page
- [ ] Search product, select location, enter counted qty
- [ ] Display: system qty | counted qty | difference (color-coded)
- [ ] **Apply Adjustment** button
- [ ] History table below

### 3.12 Stock Ledger Page
- [ ] Full paginated table: Date | Product | Type | From | To | Qty | Reference
- [ ] Filters: product search, move type, date range
- [ ] Export CSV button

### 3.13 Settings — Warehouses
- [ ] Warehouse list + create form
- [ ] Locations sub-list per warehouse

---

## PHASE 4 — Integration & Testing

### 4.1 API Integration
- [ ] Wire all React pages to actual Flask endpoints
- [ ] Error handling: toast notifications for API errors
- [ ] Loading skeletons on data fetch
- [ ] Optimistic UI updates where appropriate

### 4.2 State Management
- [ ] Zustand auth store: user, token, login(), logout()
- [ ] React Query for server state caching (products, receipts, etc.)

### 4.3 Testing
- [ ] Backend: test validate receipt → check stock_quants incremented
- [ ] Backend: test validate delivery → check stock_quants decremented
- [ ] Backend: test transfer → check source - qty, dest + qty, total unchanged
- [ ] Backend: test adjustment → check stock_moves entry created
- [ ] Frontend: verify KPI cards render correct numbers

---

## PHASE 5 — Polish & Production Readiness

### 5.1 UI Polish
- [ ] Responsive layout (tablet breakpoints)
- [ ] Empty states (illustrations for empty tables)
- [ ] Confirm modals for destructive actions (cancel operation)
- [ ] Status badge colors: Draft=gray, Waiting=yellow, Ready=blue, Done=green, Cancelled=red
- [ ] Page transitions (framer-motion or CSS transitions)

### 5.2 Security
- [ ] JWT refresh token rotation
- [ ] Rate limiting on auth endpoints (Flask-Limiter)
- [ ] Input validation on all POST/PUT routes
- [ ] CORS whitelist only frontend origin
- [ ] No raw SQL — use SQLAlchemy ORM only

### 5.3 Performance
- [ ] DB indexes on: `product_id`, `location_id`, `created_at`, `status`, `sku`
- [ ] React Query stale time configuration
- [ ] Pagination on all list endpoints (page, per_page params)

### 5.4 Deployment Prep
- [ ] Create `Dockerfile` for backend
- [ ] Create `Dockerfile` for frontend
- [ ] `docker-compose.yml` (postgres + backend + frontend)
- [ ] `run.sh` for local dev
- [ ] `.env.example` file

---

## DONE CRITERIA ✅
- [ ] User can register, login, reset password via OTP
- [ ] Dashboard shows accurate live KPIs
- [ ] Receipt validation increases stock (verified in DB)
- [ ] Delivery validation decreases stock (verified in DB)
- [ ] Transfer moves stock between locations (total unchanged)
- [ ] Adjustment corrects stock and logs to ledger
- [ ] Stock ledger shows complete audit trail
- [ ] Low stock alerts visible on dashboard
- [ ] Multi-warehouse locations working
- [ ] UI matches Apple-inspired design standard
