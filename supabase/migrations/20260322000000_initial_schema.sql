-- ═══════════════════════════════════════════
-- Custom ENUM Types
-- ═══════════════════════════════════════════

CREATE TYPE branch_status      AS ENUM ('active', 'inactive');
CREATE TYPE employee_status    AS ENUM ('active', 'inactive', 'holiday');
CREATE TYPE employee_dept      AS ENUM ('sales', 'pharmacy', 'marketing', 'hr', 'it', 'logistics');
CREATE TYPE employee_role      AS ENUM ('admin', 'pharmacist_owner', 'pharmacist_manager', 'pharmacist', 'inventory_officer', 'assistant', 'hr_manager', 'cashier', 'senior_cashier', 'delivery', 'delivery_pharmacist', 'officeboy', 'manager');
CREATE TYPE payment_method     AS ENUM ('cash', 'visa');
CREATE TYPE sale_type          AS ENUM ('walk-in', 'delivery');
CREATE TYPE sale_status        AS ENUM ('completed', 'cancelled', 'pending', 'with_delivery', 'on_way');
CREATE TYPE purchase_status    AS ENUM ('completed', 'pending', 'rejected');
CREATE TYPE purchase_pay_type  AS ENUM ('cash', 'credit');
CREATE TYPE return_type        AS ENUM ('full', 'partial', 'unit');
CREATE TYPE return_reason      AS ENUM ('customer_request', 'wrong_item', 'damaged', 'expired', 'defective', 'other');
CREATE TYPE item_condition     AS ENUM ('sellable', 'damaged', 'expired', 'other');
CREATE TYPE purchase_ret_reason AS ENUM ('damaged', 'expired', 'wrong_item', 'defective', 'overage', 'other');
CREATE TYPE shift_status       AS ENUM ('open', 'closed');
CREATE TYPE cash_tx_type       AS ENUM ('opening', 'sale', 'card_sale', 'in', 'out', 'closing', 'return');
CREATE TYPE movement_type      AS ENUM ('initial', 'sale', 'purchase', 'return_customer', 'return_supplier', 'adjustment', 'damage', 'transfer_in', 'transfer_out', 'correction');
CREATE TYPE movement_status    AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE supplier_status    AS ENUM ('active', 'inactive');
CREATE TYPE drug_status        AS ENUM ('active', 'inactive', 'discontinued');
CREATE TYPE customer_status    AS ENUM ('active', 'inactive');

-- ═══════════════════════════════════════════
-- Core Tables (no dependencies)
-- ═══════════════════════════════════════════

CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  address       TEXT,
  phone         TEXT,
  status        branch_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  status          supplier_status DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  auth_user_id    UUID REFERENCES auth.users(id),  -- Supabase Auth link
  employee_code   TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_arabic     TEXT,
  phone           TEXT NOT NULL,
  email           TEXT,
  position        TEXT NOT NULL,
  department      employee_dept NOT NULL,
  role            employee_role NOT NULL,
  start_date      DATE NOT NULL,
  status          employee_status NOT NULL DEFAULT 'active',
  salary          NUMERIC(10,2),
  notes           TEXT,
  username        TEXT,
  photo           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, employee_code),  -- ✅ Scoped to branch
  UNIQUE(branch_id, username)        -- ✅ Scoped to branch
);

-- ═══════════════════════════════════════════
-- Inventory Domain (depends on: branches, suppliers)
-- ═══════════════════════════════════════════

CREATE TABLE drugs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_arabic     TEXT,
  generic_name    TEXT[] DEFAULT '{}',
  category        TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  cost_price      NUMERIC(10,2) NOT NULL,
  stock           INTEGER NOT NULL DEFAULT 0,
  damaged_stock   INTEGER DEFAULT 0,
  expiry_date     DATE,
  barcode         TEXT,
  internal_code   TEXT,
  units_per_pack  INTEGER DEFAULT 1,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,  -- ✅ Safe to delete supplier
  max_discount    NUMERIC(5,2),
  dosage_form     TEXT,
  min_stock       INTEGER DEFAULT 0,
  manufacturer    TEXT,
  tax             NUMERIC(5,2) DEFAULT 0,
  origin          TEXT,
  status          drug_status NOT NULL DEFAULT 'active', -- ✅ Allows Soft-Delete
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, barcode) -- ✅ Prevent duplicate barcodes within same branch
);

-- ═══════════════════════════════════════════
-- Purchases Domain (depends on: suppliers, employees, drugs)
-- ═══════════════════════════════════════════

CREATE TABLE purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID REFERENCES branches(id) ON DELETE CASCADE,
  date                TIMESTAMPTZ NOT NULL DEFAULT now(),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id),
  -- snapshot: الاسم وقت الفاتورة (لا يتغير لو الـ supplier اتعدل لاحقاً)
  supplier_name_snapshot TEXT NOT NULL,
  total_cost          NUMERIC(12,2) NOT NULL,
  total_tax           NUMERIC(10,2) DEFAULT 0,
  status              purchase_status NOT NULL DEFAULT 'pending',
  payment_type        purchase_pay_type DEFAULT 'cash',
  invoice_id          TEXT,
  external_invoice_id TEXT,
  approved_by         UUID REFERENCES employees(id),
  approval_date       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  purchase_id   UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  drug_id       UUID NOT NULL REFERENCES drugs(id),
  name          TEXT NOT NULL,  -- snapshot at purchase time
  quantity      INTEGER NOT NULL,
  cost_price    NUMERIC(10,2) NOT NULL,
  expiry_date   DATE,
  dosage_form   TEXT,
  discount      NUMERIC(5,2) DEFAULT 0,
  sale_price    NUMERIC(10,2),
  tax           NUMERIC(10,2) DEFAULT 0,
  is_unit       BOOLEAN DEFAULT false,
  units_per_pack INTEGER
);

-- ═══════════════════════════════════════════
-- Stock Batches (depends on: drugs, purchases)
-- ═══════════════════════════════════════════

CREATE TABLE stock_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id), -- RESTRICT: Prevent deleting drug if it has stock
  quantity        INTEGER NOT NULL,
  expiry_date     DATE NOT NULL,
  cost_price      NUMERIC(10,2) NOT NULL,
  purchase_id     UUID REFERENCES purchases(id),  -- ✅ purchases defined above
  date_received   DATE NOT NULL DEFAULT CURRENT_DATE,
  batch_number    TEXT,
  version         INTEGER NOT NULL DEFAULT 1,  -- Optimistic locking
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Sales Domain (depends on: branches, employees, drugs)
-- ═══════════════════════════════════════════

CREATE TABLE sales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_id           TEXT,
  branch_id           UUID REFERENCES branches(id) ON DELETE CASCADE,
  date                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  sold_by_employee_id UUID REFERENCES employees(id),
  daily_order_number  INTEGER,
  total               NUMERIC(12,2) NOT NULL,
  subtotal            NUMERIC(12,2),
  customer_name       TEXT,
  customer_code       TEXT,
  customer_phone      TEXT,
  customer_address    TEXT,
  payment_method      payment_method NOT NULL DEFAULT 'cash',
  sale_type           sale_type DEFAULT 'walk-in',
  delivery_fee        NUMERIC(10,2) DEFAULT 0,
  global_discount     NUMERIC(10,2) DEFAULT 0,
  status              sale_status NOT NULL DEFAULT 'completed',
  processing_time_min NUMERIC(6,1),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sale_id           UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  drug_id           UUID NOT NULL REFERENCES drugs(id),
  quantity          INTEGER NOT NULL,
  price             NUMERIC(10,2) NOT NULL,
  cost_price        NUMERIC(10,2),
  discount          NUMERIC(5,2) DEFAULT 0,
  is_unit           BOOLEAN DEFAULT false
);

-- Normalized batch allocations (replaces JSONB)
CREATE TABLE sale_item_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sale_item_id    UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  batch_id        UUID NOT NULL REFERENCES stock_batches(id),
  quantity        INTEGER NOT NULL,
  expiry_date     DATE NOT NULL
);

-- ═══════════════════════════════════════════
-- Stock Movements (depends on: drugs, employees, stock_batches)
-- ═══════════════════════════════════════════

CREATE TABLE stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id           UUID NOT NULL REFERENCES drugs(id),
  -- snapshot: اسم الدواء وقت الحركة (audit trail — لا يتغير)
  drug_name_snapshot TEXT NOT NULL,
  branch_id         UUID NOT NULL REFERENCES branches(id),
  type              movement_type NOT NULL,
  quantity          INTEGER NOT NULL,  -- Positive = add, Negative = remove
  previous_stock    INTEGER NOT NULL,
  new_stock         INTEGER NOT NULL,
  reason            TEXT,
  notes             TEXT,
  reference_id      UUID,       -- Sale/Purchase/Return ID
  transaction_id    UUID,       -- Grouping ID for bulk adjustments
  batch_id          UUID REFERENCES stock_batches(id),
  performed_by      UUID NOT NULL REFERENCES employees(id),
  -- snapshot: اسم الموظف وقت الحركة
  performed_by_name_snapshot TEXT,
  status            movement_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES employees(id),
  reviewed_at       TIMESTAMPTZ,
  expiry_date       DATE,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Returns Domain (depends on: sales, drugs, employees)
-- ═══════════════════════════════════════════

CREATE TABLE returns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID REFERENCES branches(id) ON DELETE CASCADE,
  sale_id       UUID NOT NULL REFERENCES sales(id),
  date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  return_type   return_type NOT NULL,
  total_refund  NUMERIC(12,2) NOT NULL,
  reason        return_reason NOT NULL,
  notes         TEXT,
  processed_by  UUID REFERENCES employees(id)
);

CREATE TABLE return_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  return_id           UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  drug_id             UUID NOT NULL REFERENCES drugs(id),
  name                TEXT NOT NULL,  -- snapshot
  quantity_returned   INTEGER NOT NULL,
  is_unit             BOOLEAN DEFAULT false,
  original_price      NUMERIC(10,2) NOT NULL,
  refund_amount       NUMERIC(10,2) NOT NULL,
  reason              return_reason,
  condition           item_condition NOT NULL DEFAULT 'sellable',
  dosage_form         TEXT
);

CREATE TABLE purchase_returns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  purchase_id     UUID NOT NULL REFERENCES purchases(id),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  -- snapshot
  supplier_name_snapshot TEXT NOT NULL,
  date            TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_refund    NUMERIC(12,2) NOT NULL,
  status          purchase_status NOT NULL DEFAULT 'pending',
  notes           TEXT
);

CREATE TABLE purchase_return_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  purchase_return_id  UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  drug_id             UUID NOT NULL REFERENCES drugs(id),
  name                TEXT NOT NULL,  -- snapshot
  quantity_returned   INTEGER NOT NULL,
  is_unit             BOOLEAN DEFAULT false,
  units_per_pack      INTEGER,
  cost_price          NUMERIC(10,2) NOT NULL,
  refund_amount       NUMERIC(10,2) NOT NULL,
  dosage_form         TEXT,
  reason              purchase_ret_reason NOT NULL,
  condition           item_condition NOT NULL DEFAULT 'sellable'
);

-- ═══════════════════════════════════════════
-- CRM Domain
-- ═══════════════════════════════════════════

CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID REFERENCES branches(id) ON DELETE CASCADE,
  serial_id           TEXT NOT NULL,
  code                TEXT NOT NULL,
  name                TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  governorate         TEXT,
  city                TEXT,
  area                TEXT,
  street_address      TEXT,
  insurance_provider  TEXT,
  policy_number       TEXT,
  chronic_conditions  TEXT[] DEFAULT '{}',
  total_purchases     NUMERIC(12,2) DEFAULT 0,
  points              INTEGER DEFAULT 0,
  last_visit          TIMESTAMPTZ,
  notes               TEXT,
  status              customer_status DEFAULT 'active',
  vip                 BOOLEAN DEFAULT false,
  registered_by       UUID REFERENCES employees(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, code),  -- ✅ Scoped to branch
  UNIQUE(branch_id, phone)  -- ✅ Prevent duplicate customers
);

-- ═══════════════════════════════════════════
-- Operations Domain
-- ═══════════════════════════════════════════

CREATE TABLE shifts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id               UUID REFERENCES branches(id) ON DELETE CASCADE,
  branch_name             TEXT,  -- snapshot at shift open
  status                  shift_status NOT NULL DEFAULT 'open',
  open_time               TIMESTAMPTZ NOT NULL DEFAULT now(),
  close_time              TIMESTAMPTZ,
  opened_by               UUID NOT NULL REFERENCES employees(id),
  closed_by               UUID REFERENCES employees(id),
  opening_balance         NUMERIC(12,2) NOT NULL,
  closing_balance         NUMERIC(12,2),
  expected_balance        NUMERIC(12,2),
  cash_in                 NUMERIC(12,2) DEFAULT 0,
  cash_out                NUMERIC(12,2) DEFAULT 0,
  cash_sales              NUMERIC(12,2) DEFAULT 0,
  card_sales              NUMERIC(12,2) DEFAULT 0,
  returns                 NUMERIC(12,2) DEFAULT 0,
  notes                   TEXT,
  handover_receipt_number INTEGER
);

CREATE TABLE cash_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  time            TIMESTAMPTZ NOT NULL DEFAULT now(),
  type            cash_tx_type NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  reason          TEXT,
  user_id         UUID NOT NULL REFERENCES employees(id),
  related_sale_id UUID REFERENCES sales(id)
);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID REFERENCES branches(id),
  actor_id        UUID REFERENCES employees(id),
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  details         TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════

-- Auth & Users (CRITICAL for RLS)
CREATE INDEX idx_emp_auth_uid ON employees(auth_user_id);

-- Inventory
CREATE INDEX idx_drugs_branch ON drugs(branch_id);
CREATE INDEX idx_drugs_barcode ON drugs(barcode);
CREATE INDEX idx_drugs_name ON drugs USING gin(to_tsvector('simple', name));
CREATE INDEX idx_stock_batches_drug ON stock_batches(drug_id);
CREATE INDEX idx_stock_batches_branch ON stock_batches(branch_id);
CREATE INDEX idx_batches_fefo ON stock_batches(drug_id, expiry_date ASC); -- For FEFO checkout

-- Sales
CREATE INDEX idx_sales_branch_date ON sales(branch_id, date DESC);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_drug ON sale_items(drug_id);
CREATE INDEX idx_sale_item_batches_item ON sale_item_batches(sale_item_id);

-- Stock Movements
CREATE INDEX idx_movements_drug ON stock_movements(drug_id);
CREATE INDEX idx_movements_branch_ts ON stock_movements(branch_id, timestamp DESC);

-- Purchases
CREATE INDEX idx_purchases_branch ON purchases(branch_id);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

-- Returns
CREATE INDEX idx_returns_sale ON returns(sale_id);

-- CRM
CREATE INDEX idx_customers_branch ON customers(branch_id);
CREATE INDEX idx_customers_code ON customers(code);

-- Operations
CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE INDEX idx_cash_tx_shift ON cash_transactions(shift_id);
CREATE INDEX idx_audit_logs_branch ON audit_logs(branch_id, timestamp DESC);

-- ═══════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════
-- Strategy: Use employee lookup table instead of JWT custom claims.
-- This avoids the requirement for a Supabase Auth Hook and is more robust.
--
-- Helper function: resolves auth.uid() → branch_id via employees table
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Branch-scoped policies (applied to ALL tables with branch_id)
CREATE POLICY branch_isolation ON drugs          FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON stock_batches  FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON stock_movements FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON sales          FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON sale_items     FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON sale_item_batches FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON customers      FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON employees      FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON purchases      FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON purchase_items FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON suppliers      FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON shifts         FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON cash_transactions FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON audit_logs     FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON returns        FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON return_items   FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON purchase_returns FOR ALL USING (branch_id = get_user_branch_id());
CREATE POLICY branch_isolation ON purchase_return_items FOR ALL USING (branch_id = get_user_branch_id());

-- ═══════════════════════════════════════════
-- Triggers for updated_at & Core Features
-- ═══════════════════════════════════════════

-- 1. Enable moddatetime extension to auto-update updated_at columns
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE TRIGGER handle_updated_at_branches BEFORE UPDATE ON branches FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_suppliers BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_employees BEFORE UPDATE ON employees FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_drugs BEFORE UPDATE ON drugs FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_purchases BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at_sales BEFORE UPDATE ON sales FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 2. Sync Stock Movements to Drugs Table (CRITICAL)
CREATE OR REPLACE FUNCTION sync_drug_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- FIX: Apply a relative delta (NEW.quantity) to prevent concurrency drift,
  -- instead of blindly copying NEW.new_stock which could be stale.
  UPDATE drugs SET stock = stock + NEW.quantity WHERE id = NEW.drug_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_stock
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION sync_drug_stock();

-- 3. Add Tables to Supabase Realtime Publication
-- Note: Must be executed manually in Supabase SQL editor or via migration
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE sales, drugs, stock_batches, stock_movements;
COMMIT;
```
