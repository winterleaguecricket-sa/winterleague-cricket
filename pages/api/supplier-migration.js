import { query, getClient } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple admin auth check
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await getClient();
  const results = [];

  try {
    await client.query('BEGIN');

    // 1. Suppliers table
    await client.query(`
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
      )
    `);
    results.push('Created suppliers table');

    // Suppliers indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_performance_tier ON suppliers(performance_tier)`);
    results.push('Created suppliers indexes');

    // 2. Supplier applications table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_applications table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_applications_email ON supplier_applications(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_applications_status ON supplier_applications(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_applications_created ON supplier_applications(created_at)`);
    results.push('Created supplier_applications indexes');

    // 3. Supplier orders table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_orders table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_id ON supplier_orders(order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON supplier_orders(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_team_id ON supplier_orders(team_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_fulfillment ON supplier_orders(fulfillment_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_payout_status ON supplier_orders(payout_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_sla_ship ON supplier_orders(sla_ship_deadline)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_orders_created ON supplier_orders(created_at)`);
    results.push('Created supplier_orders indexes');

    // 4. Supplier payouts table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_payouts table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_payouts_supplier_id ON supplier_payouts(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_payouts_status ON supplier_payouts(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_payouts_period ON supplier_payouts(period_start, period_end)`);
    results.push('Created supplier_payouts indexes');

    // 5. Supplier reviews table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_reviews table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_reviews_supplier_id ON supplier_reviews(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_reviews_visible ON supplier_reviews(visible)`);
    results.push('Created supplier_reviews indexes');

    // 6. Supplier messages table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_messages table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_messages_supplier_id ON supplier_messages(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_messages_read ON supplier_messages(read)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_supplier_messages_parent ON supplier_messages(parent_id)`);
    results.push('Created supplier_messages indexes');

    // 7. SLA configuration table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_sla_config table');

    // Insert default SLA tiers
    await client.query(`
      INSERT INTO supplier_sla_config (tier, acknowledge_hours, ship_business_days, return_processing_days, breach_warning_threshold, breach_penalty_rate, breach_suspension_threshold, breach_period_days)
      VALUES 
        ('standard', 24, 3, 7, 2, 5.00, 5, 30),
        ('premium', 12, 2, 5, 1, 5.00, 3, 30)
      ON CONFLICT (tier) DO NOTHING
    `);
    results.push('Inserted default SLA tiers');

    // 8. SLA breaches table
    await client.query(`
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
      )
    `);
    results.push('Created supplier_sla_breaches table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sla_breaches_supplier_id ON supplier_sla_breaches(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sla_breaches_created ON supplier_sla_breaches(created_at)`);
    results.push('Created supplier_sla_breaches indexes');

    // 9. Commission settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        commission_type VARCHAR(50) UNIQUE NOT NULL,
        percentage DECIMAL(5, 2) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        notes TEXT,
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.push('Created commission_settings table');

    // Insert default commission settings
    await client.query(`
      INSERT INTO commission_settings (commission_type, percentage, enabled, notes)
      VALUES ('team-supplier-product', 10.00, true, 'Team receives 10% commission when a team member purchases a supplier product')
      ON CONFLICT (commission_type) DO NOTHING
    `);
    results.push('Inserted default commission settings');

    // 10. Modify products table - add supplier columns
    const alterQueries = [
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_cost DECIMAL(10, 2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_notes TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_rating INTEGER`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS quality_notes TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_sku VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0`,
    ];

    for (const q of alterQueries) {
      await client.query(q);
    }
    results.push('Added supplier columns to products table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status)`);
    results.push('Created products supplier indexes');

    // 11. Triggers for updated_at
    await client.query(`DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers`);
    await client.query(`CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`);
    await client.query(`DROP TRIGGER IF EXISTS update_supplier_orders_updated_at ON supplier_orders`);
    await client.query(`CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`);
    await client.query(`DROP TRIGGER IF EXISTS update_commission_settings_updated_at ON commission_settings`);
    await client.query(`CREATE TRIGGER update_commission_settings_updated_at BEFORE UPDATE ON commission_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`);
    results.push('Created updated_at triggers');

    await client.query('COMMIT');

    // Verify: list all tables
    const tablesResult = await query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    const tables = tablesResult.rows.map(r => r.tablename);

    // Verify: count new supplier columns on products
    const prodCols = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name LIKE 'supplier%' OR column_name IN ('approval_status', 'approval_notes', 'approved_at', 'approved_by', 'quality_rating', 'quality_notes', 'low_stock_threshold', 'total_sold')
      ORDER BY column_name
    `);
    const newProductColumns = prodCols.rows.map(r => r.column_name);

    return res.status(200).json({
      success: true,
      message: 'Supplier portal migration completed successfully',
      steps: results,
      verification: {
        allTables: tables,
        newSupplierTablesCreated: [
          'suppliers', 'supplier_applications', 'supplier_orders',
          'supplier_payouts', 'supplier_reviews', 'supplier_messages',
          'supplier_sla_config', 'supplier_sla_breaches', 'commission_settings'
        ].filter(t => tables.includes(t)),
        newProductColumns
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      completedSteps: results
    });
  } finally {
    client.release();
  }
}
