import { query } from '../../lib/db';

export default async function handler(req, res) {
  // GET - fetch applications (admin) or check existing application (public)
  if (req.method === 'GET') {
    try {
      const { id, email, status } = req.query;

      // Get single application by ID
      if (id) {
        const result = await query(
          'SELECT * FROM supplier_applications WHERE id = $1',
          [id]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Application not found' });
        }
        return res.status(200).json({ application: formatApplication(result.rows[0]) });
      }

      // Check if email already has a pending/approved application
      if (email) {
        const result = await query(
          `SELECT id, status, created_at FROM supplier_applications 
           WHERE LOWER(email) = LOWER($1) AND status IN ('submitted', 'under_review', 'approved')
           ORDER BY created_at DESC LIMIT 1`,
          [email]
        );
        return res.status(200).json({
          exists: result.rows.length > 0,
          application: result.rows.length > 0 ? {
            id: result.rows[0].id,
            status: result.rows[0].status,
            createdAt: result.rows[0].created_at
          } : null
        });
      }

      // List all applications (admin) - optional status filter
      let sql = 'SELECT * FROM supplier_applications';
      const params = [];
      if (status) {
        sql += ' WHERE status = $1';
        params.push(status);
      }
      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      return res.status(200).json({
        applications: result.rows.map(formatApplication),
        counts: {
          total: result.rows.length,
          submitted: result.rows.filter(r => r.status === 'submitted').length,
          under_review: result.rows.filter(r => r.status === 'under_review').length,
          approved: result.rows.filter(r => r.status === 'approved').length,
          rejected: result.rows.filter(r => r.status === 'rejected').length
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
  }

  // POST - submit new application (public) or admin actions
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const action = body.action;

      // Admin: approve application
      if (action === 'approve') {
        return handleApprove(body, res);
      }

      // Admin: reject application
      if (action === 'reject') {
        return handleReject(body, res);
      }

      // Admin: mark as under review
      if (action === 'review') {
        const { applicationId } = body;
        await query(
          `UPDATE supplier_applications SET status = 'under_review', reviewed_at = NOW() WHERE id = $1`,
          [applicationId]
        );
        return res.status(200).json({ success: true });
      }

      // Public: submit new application
      return handleSubmit(body, res);

    } catch (error) {
      console.error('Error in POST:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSubmit(body, res) {
  const {
    companyName, tradingName, email, phone,
    contactPersonName, contactPersonEmail, contactPersonPhone,
    businessRegistrationNumber, companyType, vatNumber, taxNumber,
    bankName, bankAccountNumber, bankBranchCode, bankAccountType, bankAccountHolder,
    physicalAddress, city, province, postalCode,
    description, productCategories, documents,
    agreedToTerms, agreedToSla
  } = body;

  // Validate required fields
  if (!companyName || !email || !contactPersonName || !businessRegistrationNumber) {
    return res.status(400).json({
      error: 'Missing required fields: company name, email, contact person name, and business registration number are required'
    });
  }

  if (!agreedToTerms || !agreedToSla) {
    return res.status(400).json({ error: 'You must agree to both the Terms & Conditions and the SLA' });
  }

  // Check for existing application
  const existing = await query(
    `SELECT id, status FROM supplier_applications 
     WHERE LOWER(email) = LOWER($1) AND status IN ('submitted', 'under_review')`,
    [email]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({
      error: 'An application with this email address is already pending review',
      applicationId: existing.rows[0].id
    });
  }

  const result = await query(
    `INSERT INTO supplier_applications (
      company_name, trading_name, email, phone,
      contact_person_name, contact_person_email, contact_person_phone,
      business_registration_number, company_type, vat_number, tax_number,
      bank_name, bank_account_number, bank_branch_code, bank_account_type, bank_account_holder,
      physical_address, city, province, postal_code,
      description, product_categories, documents,
      agreed_to_terms, agreed_to_sla, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'submitted')
    RETURNING *`,
    [
      companyName, tradingName || null, email, phone || null,
      contactPersonName, contactPersonEmail || null, contactPersonPhone || null,
      businessRegistrationNumber, companyType || null, vatNumber || null, taxNumber || null,
      bankName || null, bankAccountNumber || null, bankBranchCode || null, bankAccountType || null, bankAccountHolder || null,
      physicalAddress || null, city || null, province || null, postalCode || null,
      description || null, JSON.stringify(productCategories || []), JSON.stringify(documents || []),
      agreedToTerms, agreedToSla
    ]
  );

  return res.status(201).json({
    success: true,
    message: 'Your application has been submitted successfully. We will review it and get back to you.',
    application: formatApplication(result.rows[0])
  });
}

async function handleApprove(body, res) {
  const { applicationId, slaTier, reviewedBy } = body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  // Get the application
  const appResult = await query('SELECT * FROM supplier_applications WHERE id = $1', [applicationId]);
  if (appResult.rows.length === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const app = appResult.rows[0];

  // Check not already approved
  if (app.status === 'approved') {
    return res.status(400).json({ error: 'Application is already approved' });
  }

  // Hash a temporary password (first 4 chars of company name + last 4 of CK number)
  const { hashPassword } = require('../../lib/auth');
  const companyShort = (app.company_name || 'Supp').substring(0, 4);
  const ckShort = (app.business_registration_number || '0000').slice(-4);
  const tempPassword = `${companyShort}${ckShort}!`;
  const hashedPassword = await hashPassword(tempPassword);

  // Create the supplier account
  const supplierResult = await query(
    `INSERT INTO suppliers (
      company_name, trading_name, email, phone,
      contact_person_name, contact_person_email, contact_person_phone,
      password, business_registration_number, company_type, vat_number, tax_number,
      bank_name, bank_account_number, bank_branch_code, bank_account_type, bank_account_holder,
      physical_address, city, province, postal_code,
      description, categories,
      sla_tier, status, approved_at, approved_by, active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'approved',NOW(),$25,true)
    RETURNING id, company_name, email`,
    [
      app.company_name, app.trading_name, app.email, app.phone,
      app.contact_person_name, app.contact_person_email, app.contact_person_phone,
      hashedPassword, app.business_registration_number, app.company_type, app.vat_number, app.tax_number,
      app.bank_name, app.bank_account_number, app.bank_branch_code, app.bank_account_type, app.bank_account_holder,
      app.physical_address, app.city, app.province, app.postal_code,
      app.description, JSON.stringify(app.product_categories || []),
      slaTier || 'standard', reviewedBy || 'admin'
    ]
  );

  const supplier = supplierResult.rows[0];

  // Update application status and link to supplier
  await query(
    `UPDATE supplier_applications 
     SET status = 'approved', supplier_id = $1, reviewed_by = $2, reviewed_at = NOW() 
     WHERE id = $3`,
    [supplier.id, reviewedBy || 'admin', applicationId]
  );

  return res.status(200).json({
    success: true,
    message: 'Application approved. Supplier account created.',
    supplier: {
      id: supplier.id,
      companyName: supplier.company_name,
      email: supplier.email,
      tempPassword
    }
  });
}

async function handleReject(body, res) {
  const { applicationId, rejectionReason, adminNotes, reviewedBy } = body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  if (!rejectionReason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  const result = await query(
    `UPDATE supplier_applications 
     SET status = 'rejected', rejection_reason = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW() 
     WHERE id = $4
     RETURNING *`,
    [rejectionReason, adminNotes || null, reviewedBy || 'admin', applicationId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Application rejected.',
    application: formatApplication(result.rows[0])
  });
}

function formatApplication(row) {
  let docs = row.documents || [];
  if (typeof docs === 'string') {
    try { docs = JSON.parse(docs); } catch { docs = []; }
  }
  let cats = row.product_categories || [];
  if (typeof cats === 'string') {
    try { cats = JSON.parse(cats); } catch { cats = []; }
  }

  return {
    id: row.id,
    companyName: row.company_name,
    tradingName: row.trading_name,
    email: row.email,
    phone: row.phone,
    contactPersonName: row.contact_person_name,
    contactPersonEmail: row.contact_person_email,
    contactPersonPhone: row.contact_person_phone,
    businessRegistrationNumber: row.business_registration_number,
    companyType: row.company_type,
    vatNumber: row.vat_number,
    taxNumber: row.tax_number,
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    bankBranchCode: row.bank_branch_code,
    bankAccountType: row.bank_account_type,
    bankAccountHolder: row.bank_account_holder,
    physicalAddress: row.physical_address,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    description: row.description,
    productCategories: cats,
    documents: docs,
    agreedToTerms: row.agreed_to_terms,
    agreedToSla: row.agreed_to_sla,
    status: row.status,
    adminNotes: row.admin_notes,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    supplierId: row.supplier_id,
    createdAt: row.created_at
  };
}
