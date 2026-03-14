-- ============================================================
-- Migration V5: Supplier Portal
-- Winter League Cricket - March 2026
-- ============================================================
-- This migration adds the complete supplier portal system:
--   - Suppliers table (profiles, banking, SLA, performance)
--   - Supplier applications (self-registration workflow)
--   - Supplier orders (per-supplier order splitting)
--   - Supplier payouts (automated payout tracking)
--   - Supplier reviews (customer feedback)
--   - Supplier messages (admin-supplier communication)
--   - SLA configuration and breach tracking
--   - Commission settings
--   - Products table modifications (supplier_id, approval)
-- ============================================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SUPPLIERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(500),
    contact_person_name VARCHAR(255),
    contact_person_email VARCHAR(255),
    contact_person_phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    business_registration_number VARCHAR(100),
    company_type VARCHAR(100),
    vat_number VARCHAR(50),
    tax_number VARCHAR(100),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch_code VARCHAR(50),
    bank_account_type VARCHAR(50),
    bank_account_holder VARCHAR(255),
    physical_address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    logo VARCHAR(500),
    description TEXT,
    return_policy TEXT,
    categories JSONB DEFAULT '[]'::jsonb,
    payout_frequency VARCHAR(20) DEFAULT 'monthly',
    payout_day VARCHAR(20) DEFAULT '1',
    sla_tier VARCHAR(20) DEFAULT 'standard',
    performance_tier VARCHAR(20) DEFAULT 'bronze',
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    sla_compliance_rate DECIMAL(5, 2) DEFAULT 100.00,
    featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP,
    approved_by VARCHAR(255),
    last_login TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
CREATE INDEX IF NOT EXISTS idx_suppliers_performance_tier ON suppliers(performance_tier);

-- ============================================================
-- 2. SUPPLIER APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id),
    company_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    contact_person_name VARCHAR(255),
    contact_person_email VARCHAR(255),
    contact_person_phone VARCHAR(50),
    business_registration_number VARCHAR(100),
    company_type VARCHAR(100),
    vat_number VARCHAR(50),
    tax_number VARCHAR(100),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch_code VARCHAR(50),
    bank_account_type VARCHAR(50),
    bank_account_holder VARCHAR(255),
    physical_address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    description TEXT,
    product_categories JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    agreed_to_terms BOOLEAN DEFAULT false,
    agreed_to_sla BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'submitted',
    admin_notes TEXT,
    rejection_reason TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_applications_email ON supplier_applications(email);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_status ON supplier_applications(status);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_created ON supplier_applications(created_at);

-- ============================================================
-- 3. SUPPLIER ORDERS TABLE
-- Per-supplier split of orders containing their products
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    order_number VARCHAR(50) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    team_id INTEGER REFERENCES teams(id),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    supplier_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    admin_margin DECIMAL(10, 2) NOT NULL DEFAULT 0,
    team_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_fee_rate DECIMAL(5, 2) DEFAULT 2.93,
    net_admin_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fulfillment_status VARCHAR(30) DEFAULT 'pending',
    acknowledged_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    shipping_tracking_number VARCHAR(255),
    shipping_courier VARCHAR(255),
    sla_acknowledge_deadline TIMESTAMP,
    sla_ship_deadline TIMESTAMP,
    sla_breached BOOLEAN DEFAULT false,
    sla_breach_type VARCHAR(30),
    payout_status VARCHAR(20) DEFAULT 'pending',
    payout_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_id ON supplier_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_team_id ON supplier_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_fulfillment ON supplier_orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_payout_status ON supplier_orders(payout_status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_sla_ship ON supplier_orders(sla_ship_deadline);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_created ON supplier_orders(created_at);

-- ============================================================
-- 4. SUPPLIER PAYOUTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
    supplier_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
    adjustments DECIMAL(12, 2) DEFAULT 0,
    sla_penalties DECIMAL(12, 2) DEFAULT 0,
    net_payout DECIMAL(12, 2) NOT NULL DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'pending',
    payment_reference VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'eft',
    paid_at TIMESTAMP,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_payouts_supplier_id ON supplier_payouts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payouts_status ON supplier_payouts(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payouts_period ON supplier_payouts(period_start, period_end);

-- ============================================================
-- 5. SUPPLIER REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_order_id UUID REFERENCES supplier_orders(id),
    order_id UUID REFERENCES orders(id),
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    visible BOOLEAN DEFAULT false,
    supplier_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier_id ON supplier_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reviews_visible ON supplier_reviews(visible);

-- ============================================================
-- 6. SUPPLIER MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    sender_type VARCHAR(20) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    parent_id UUID REFERENCES supplier_messages(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_messages_supplier_id ON supplier_messages(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_read ON supplier_messages(read);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_parent ON supplier_messages(parent_id);

-- ============================================================
-- 7. SLA CONFIGURATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_sla_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier VARCHAR(20) UNIQUE NOT NULL,
    acknowledge_hours INTEGER NOT NULL DEFAULT 24,
    ship_business_days INTEGER NOT NULL DEFAULT 3,
    return_processing_days INTEGER NOT NULL DEFAULT 7,
    tracking_required BOOLEAN DEFAULT true,
    breach_warning_threshold INTEGER DEFAULT 2,
    breach_penalty_rate DECIMAL(5, 2) DEFAULT 5.00,
    breach_suspension_threshold INTEGER DEFAULT 5,
    breach_period_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default SLA tiers
INSERT INTO supplier_sla_config (tier, acknowledge_hours, ship_business_days, return_processing_days, breach_warning_threshold, breach_penalty_rate, breach_suspension_threshold, breach_period_days)
VALUES 
    ('standard', 24, 3, 7, 2, 5.00, 5, 30),
    ('premium', 12, 2, 5, 1, 5.00, 3, 30)
ON CONFLICT (tier) DO NOTHING;

-- ============================================================
-- 8. SLA BREACHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_sla_breaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_order_id UUID REFERENCES supplier_orders(id),
    breach_type VARCHAR(30) NOT NULL,
    deadline TIMESTAMP NOT NULL,
    breached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_taken VARCHAR(30) DEFAULT 'warning',
    penalty_amount DECIMAL(10, 2) DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sla_breaches_supplier_id ON supplier_sla_breaches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_created ON supplier_sla_breaches(created_at);

-- ============================================================
-- 9. COMMISSION SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_type VARCHAR(50) UNIQUE NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    notes TEXT,
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default commission: 10% team commission on supplier product sales
INSERT INTO commission_settings (commission_type, percentage, enabled, notes)
VALUES ('team-supplier-product', 10.00, true, 'Team receives 10% commission when a team member purchases a supplier product')
ON CONFLICT (commission_type) DO NOTHING;

-- ============================================================
-- 10. MODIFY PRODUCTS TABLE
-- Add supplier-related columns
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_cost DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_rating INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status);

-- ============================================================
-- 11. ADD updated_at TRIGGERS FOR NEW TABLES
-- ============================================================

-- Reuse the existing update_updated_at_column() function
-- (DROP + CREATE pattern because PG14 doesn't support CREATE TRIGGER IF NOT EXISTS)
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_orders_updated_at ON supplier_orders;
CREATE TRIGGER update_supplier_orders_updated_at 
    BEFORE UPDATE ON supplier_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commission_settings_updated_at ON commission_settings;
CREATE TRIGGER update_commission_settings_updated_at 
    BEFORE UPDATE ON commission_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
