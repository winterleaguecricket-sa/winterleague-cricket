-- Migration V3: Add missing columns to customers and orders tables
-- SAFE: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS only
-- NO DATA LOSS: No DROP statements, no table recreation
-- Both tables currently have 0 rows on production

-- ============================================
-- CUSTOMERS TABLE - Add missing columns
-- ============================================

-- Add columns the app needs that the original schema didn't include
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS team_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address2 TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_province VARCHAR(100);

-- ============================================
-- ORDERS TABLE - Add missing columns
-- ============================================

-- Add order_type to distinguish product orders from registrations
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'product';

-- Add items as JSONB (cart items array)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Add subtotal and shipping cost
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0;

-- Add status tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Add tracking info as JSONB
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking JSONB;

-- Add shipping province
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_province VARCHAR(100);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_team_id ON customers(team_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ============================================
-- Auto-update updated_at trigger for customers
-- ============================================
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_customers_updated_at();

-- Auto-update updated_at trigger for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();
