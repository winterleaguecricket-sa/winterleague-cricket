import { useState, useRef } from 'react';
import Head from 'next/head';

const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
];

const COMPANY_TYPES = [
  'Sole Proprietor', 'Partnership', 'Private Company (Pty) Ltd',
  'Close Corporation (CC)', 'Non-Profit Organisation', 'Other'
];

const PRODUCT_CATEGORIES = [
  'Cricket Bats', 'Cricket Balls', 'Protective Gear', 'Clothing & Apparel',
  'Footwear', 'Bags & Storage', 'Training Equipment', 'Accessories',
  'Team Kits', 'Custom Merchandise', 'Nutrition & Supplements', 'Other'
];

const BANK_ACCOUNT_TYPES = ['Cheque/Current', 'Savings', 'Transmission'];

const STEPS = [
  { label: 'Company Info', icon: '01' },
  { label: 'Contact Details', icon: '02' },
  { label: 'Banking', icon: '03' },
  { label: 'Product Categories', icon: '04' },
  { label: 'Documents', icon: '05' },
  { label: 'Agreements', icon: '06' },
  { label: 'Review & Submit', icon: '07' }
];

const DOC_TYPES = [
  { key: 'ck_document', label: 'CK / CIPC Registration Document', required: true },
  { key: 'id_copy', label: 'ID Copy of Director / Owner', required: true },
  { key: 'vat_certificate', label: 'VAT Registration Certificate', required: false },
  { key: 'bee_certificate', label: 'BEE Certificate', required: false },
  { key: 'product_catalog', label: 'Product Catalog / Brochure', required: false },
  { key: 'bank_confirmation', label: 'Bank Confirmation Letter', required: false }
];

export default function BecomeASupplier() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    companyName: '', tradingName: '', businessRegistrationNumber: '',
    companyType: '', vatNumber: '', taxNumber: '', description: '',
    physicalAddress: '', city: '', province: '', postalCode: '',
    contactPersonName: '', contactPersonEmail: '', contactPersonPhone: '',
    email: '', phone: '',
    bankName: '', bankAccountNumber: '', bankBranchCode: '',
    bankAccountType: '', bankAccountHolder: '',
    productCategories: [],
    documents: [],
    agreedToTerms: false, agreedToSla: false
  });

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const toggleCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      productCategories: prev.productCategories.includes(cat)
        ? prev.productCategories.filter(c => c !== cat)
        : [...prev.productCategories, cat]
    }));
  };

  // Upload a document
  const [uploading, setUploading] = useState(null);
  const uploadDoc = async (file, docType) => {
    setUploading(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`/api/supplier-upload?docType=${encodeURIComponent(docType)}`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setForm(prev => ({
        ...prev,
        documents: [
          ...prev.documents.filter(d => d.docType !== docType),
          { docType, url: data.url, fileName: file.name, size: data.size, type: data.type }
        ]
      }));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const removeDoc = (docType) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.docType !== docType)
    }));
  };

  // Validation per step
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.companyName.trim()) e.companyName = 'Company name is required';
      if (!form.businessRegistrationNumber.trim()) e.businessRegistrationNumber = 'CK/CIPC number is required';
      if (!form.companyType) e.companyType = 'Select company type';
    }
    if (s === 1) {
      if (!form.contactPersonName.trim()) e.contactPersonName = 'Contact person name is required';
      if (!form.email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    }
    if (s === 3) {
      if (form.productCategories.length === 0) e.productCategories = 'Select at least one category';
    }
    if (s === 4) {
      const requiredDocs = DOC_TYPES.filter(d => d.required);
      for (const doc of requiredDocs) {
        if (!form.documents.find(d => d.docType === doc.key)) {
          e[doc.key] = `${doc.label} is required`;
        }
      }
    }
    if (s === 5) {
      if (!form.agreedToTerms) e.agreedToTerms = 'You must agree to the Terms & Conditions';
      if (!form.agreedToSla) e.agreedToSla = 'You must agree to the SLA';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const prev = () => {
    setStep(prev => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const submit = async () => {
    if (!validateStep(5)) { setStep(5); return; }
    setSubmitting(true);
    try {
      const resp = await fetch('/api/supplier-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setResult({ success: true, message: data.message, id: data.application?.id });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── STYLES ─────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(220,0,0,0.18), transparent 24%), radial-gradient(circle at top right, rgba(96,165,250,0.14), transparent 22%), linear-gradient(180deg, #030712 0%, #08111f 46%, #020617 100%)',
      color: '#e2e8f0',
      fontFamily: '"Manrope", "Segoe UI", sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, rgba(8,15,30,0.92) 0%, rgba(15,23,42,0.92) 52%, rgba(127,29,29,0.84) 100%)',
      borderBottom: '1px solid rgba(148,163,184,0.16)', padding: '26px 0', textAlign: 'center',
      boxShadow: '0 18px 40px rgba(0,0,0,0.24)', backdropFilter: 'blur(12px)'
    },
    logo: { fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.04em' },
    subtitle: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' },
    container: { maxWidth: 780, margin: '0 auto', padding: '36px 20px 44px' },
    card: {
      background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.96) 100%)', borderRadius: 26, border: '1px solid rgba(148,163,184,0.14)',
      padding: '34px', marginBottom: 24, boxShadow: '0 28px 56px rgba(0,0,0,0.26)', backdropFilter: 'blur(14px)'
    },
    stepBar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 32, overflowX: 'auto', gap: 8, padding: '10px', borderRadius: 22,
      background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.12)'
    },
    stepDot: (active, done) => ({
      width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, flexShrink: 0, letterSpacing: '0.12em',
      background: active ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' : done ? 'linear-gradient(135deg, #047857 0%, #10b981 100%)' : 'rgba(51,65,85,0.92)',
      color: '#fff', fontWeight: 800, transition: 'all 0.3s', boxShadow: active ? '0 14px 24px rgba(127,29,29,0.28)' : 'none', border: '1px solid rgba(255,255,255,0.08)'
    }),
    stepLine: (done) => ({
      flex: 1, height: 3, margin: '0 4px',
      background: done ? 'linear-gradient(90deg, #047857 0%, #10b981 100%)' : 'rgba(51,65,85,0.92)', transition: 'all 0.3s', borderRadius: 999
    }),
    stepLabel: (active) => ({
      fontSize: 10, textAlign: 'center', marginTop: 6,
      color: active ? '#f8fafc' : '#64748b', fontWeight: active ? 700 : 500, letterSpacing: '0.04em', textTransform: 'uppercase'
    }),
    label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
    required: { color: '#fb7185', marginLeft: 2 },
    input: {
      width: '100%', padding: '12px 14px', borderRadius: 14,
      border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.74)', color: '#e2e8f0',
      fontSize: 14, outline: 'none', boxSizing: 'border-box'
    },
    inputError: { borderColor: '#fb7185' },
    errorText: { color: '#fda4af', fontSize: 12, marginTop: 5 },
    select: {
      width: '100%', padding: '12px 14px', borderRadius: 14,
      border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.74)', color: '#e2e8f0',
      fontSize: 14, outline: 'none', boxSizing: 'border-box', cursor: 'pointer'
    },
    textarea: {
      width: '100%', padding: '12px 14px', borderRadius: 14,
      border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.74)', color: '#e2e8f0',
      fontSize: 14, outline: 'none', minHeight: 96, resize: 'vertical', boxSizing: 'border-box'
    },
    row: { marginBottom: 18 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    sectionTitle: { fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.03em' },
    sectionDesc: { fontSize: 13, color: '#8ca0b9', marginBottom: 22, lineHeight: 1.6 },
    catGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12
    },
    catChip: (selected) => ({
      padding: '12px 16px', borderRadius: 16, cursor: 'pointer', fontSize: 13,
      border: selected ? '1px solid rgba(248,113,113,0.28)' : '1px solid rgba(148,163,184,0.16)',
      background: selected ? 'linear-gradient(135deg, rgba(127,29,29,0.7) 0%, rgba(30,41,59,0.96) 100%)' : 'rgba(15,23,42,0.72)',
      color: selected ? '#fff' : '#cbd5e1', fontWeight: selected ? 700 : 500,
      textAlign: 'center', transition: 'all 0.2s', boxShadow: selected ? '0 14px 26px rgba(127,29,29,0.18)' : 'none'
    }),
    docRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(148,163,184,0.14)',
      marginBottom: 12, background: 'rgba(15,23,42,0.68)', flexWrap: 'wrap', gap: 8
    },
    docLabel: { fontSize: 13, color: '#e2e8f0', flex: 1, minWidth: 200, fontWeight: 600 },
    uploadBtn: {
      padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.16)',
      background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 12, cursor: 'pointer', fontWeight: 700
    },
    uploadedBadge: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 999, background: 'rgba(16,185,129,0.12)',
      color: '#6ee7b7', fontSize: 12, border: '1px solid rgba(16,185,129,0.18)', fontWeight: 700
    },
    removeBtn: {
      background: 'none', border: 'none', color: '#fda4af',
      cursor: 'pointer', fontSize: 14, marginLeft: 4
    },
    checkbox: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18, cursor: 'pointer' },
    checkboxInput: { marginTop: 3, width: 18, height: 18, accentColor: '#dc2626', cursor: 'pointer' },
    checkboxLabel: { fontSize: 14, color: '#cbd5e1', cursor: 'pointer', lineHeight: 1.6 },
    btnRow: { display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 },
    btnPrimary: {
      padding: '13px 32px', borderRadius: 14, border: '1px solid rgba(248,250,252,0.08)',
      background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 52%, #fb7185 100%)', color: '#fff', fontSize: 15, fontWeight: 800,
      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 18px 30px rgba(127,29,29,0.24)'
    },
    btnSecondary: {
      padding: '13px 24px', borderRadius: 14, border: '1px solid rgba(148,163,184,0.18)',
      background: 'rgba(255,255,255,0.03)', color: '#dbe6f5', fontSize: 14,
      cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700
    },
    btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
    reviewSection: {
      padding: '18px', borderRadius: 18, border: '1px solid rgba(148,163,184,0.14)',
      background: 'rgba(15,23,42,0.68)', marginBottom: 12
    },
    reviewLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.08em' },
    reviewValue: { fontSize: 14, color: '#e2e8f0' },
    successCard: {
      background: 'linear-gradient(180deg, rgba(6,78,59,0.42) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(16,185,129,0.28)',
      borderRadius: 24, padding: 36, textAlign: 'center', boxShadow: '0 28px 56px rgba(0,0,0,0.24)'
    },
    errorCard: {
      background: 'linear-gradient(180deg, rgba(127,29,29,0.38) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(248,113,113,0.28)',
      borderRadius: 24, padding: 36, textAlign: 'center', boxShadow: '0 28px 56px rgba(0,0,0,0.24)'
    }
  };

  // ─── RESULT PAGE ─────────────────────
  if (result) {
    return (
      <div style={s.page} className="supplier-registration-theme">
        <Head>
          <title>{result.success ? 'Application Submitted' : 'Error'} | Winter League Cricket</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </Head>
        <div style={s.header}>
          <div style={s.logo}>Winter League Cricket</div>
          <div style={s.subtitle}>Supplier Application</div>
        </div>
        <div style={s.container}>
          <div style={result.success ? s.successCard : s.errorCard}>
            <div style={{ fontSize: 18, marginBottom: 18, color: result.success ? '#6ee7b7' : '#fecaca', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{result.success ? 'Application received' : 'Submission error'}</div>
            <h2 style={{ color: '#fff', fontSize: 22, marginBottom: 12 }}>
              {result.success ? 'Application Submitted Successfully!' : 'Submission Failed'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
              {result.success
                ? 'Thank you for your interest in supplying to Winter League Cricket. Our team will review your application and get back to you within 3-5 business days.'
                : result.message}
            </p>
            {result.id && (
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 16 }}>
                Application Reference: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{result.id.split('-')[0]}</span>
              </p>
            )}
            <div style={{ marginTop: 24 }}>
              <a href="/" style={{ ...s.btnPrimary, textDecoration: 'none', display: 'inline-block' }}>
                Return Home
              </a>
            </div>
          </div>
        </div>
        <style jsx global>{`
          .supplier-registration-theme {
            color-scheme: dark;
          }
          .supplier-registration-theme * {
            scrollbar-width: thin;
            scrollbar-color: rgba(148,163,184,0.22) transparent;
          }
          .supplier-registration-theme ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .supplier-registration-theme ::-webkit-scrollbar-thumb {
            background: rgba(148,163,184,0.22);
            border-radius: 999px;
          }
          .supplier-registration-theme input:focus,
          .supplier-registration-theme select:focus,
          .supplier-registration-theme textarea:focus {
            border-color: rgba(248,113,113,0.45) !important;
            box-shadow: 0 0 0 3px rgba(220,38,38,0.18);
          }
          .supplier-registration-theme button:hover,
          .supplier-registration-theme a:hover {
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    );
  }

  // ─── STEP CONTENT ─────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: return renderCompanyInfo();
      case 1: return renderContactDetails();
      case 2: return renderBanking();
      case 3: return renderCategories();
      case 4: return renderDocuments();
      case 5: return renderAgreements();
      case 6: return renderReview();
      default: return null;
    }
  };

  const Field = ({ label, field, required: req, type = 'text', placeholder, ...props }) => (
    <div style={s.row}>
      <label style={s.label}>
        {label}{req && <span style={s.required}>*</span>}
      </label>
      <input
        type={type}
        value={form[field] || ''}
        onChange={e => update(field, e.target.value)}
        placeholder={placeholder}
        style={{ ...s.input, ...(errors[field] ? s.inputError : {}) }}
        {...props}
      />
      {errors[field] && <div style={s.errorText}>{errors[field]}</div>}
    </div>
  );

  // Step 0: Company Info
  const renderCompanyInfo = () => (
    <>
      <h3 style={s.sectionTitle}>Company Information</h3>
      <p style={s.sectionDesc}>Tell us about your company. Fields marked with * are required.</p>
      <Field label="Company Name" field="companyName" required placeholder="e.g. ABC Cricket Supplies (Pty) Ltd" />
      <Field label="Trading Name" field="tradingName" placeholder="If different from company name" />
      <div style={s.grid2}>
        <div style={s.row}>
          <label style={s.label}>CK / CIPC Registration No.<span style={s.required}>*</span></label>
          <input
            value={form.businessRegistrationNumber}
            onChange={e => update('businessRegistrationNumber', e.target.value)}
            placeholder="e.g. 2024/123456/07"
            style={{ ...s.input, ...(errors.businessRegistrationNumber ? s.inputError : {}) }}
          />
          {errors.businessRegistrationNumber && <div style={s.errorText}>{errors.businessRegistrationNumber}</div>}
        </div>
        <div style={s.row}>
          <label style={s.label}>Company Type<span style={s.required}>*</span></label>
          <select
            value={form.companyType}
            onChange={e => update('companyType', e.target.value)}
            style={{ ...s.select, ...(errors.companyType ? s.inputError : {}) }}
          >
            <option value="">Select type...</option>
            {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.companyType && <div style={s.errorText}>{errors.companyType}</div>}
        </div>
      </div>
      <div style={s.grid2}>
        <Field label="VAT Number" field="vatNumber" placeholder="e.g. 4123456789" />
        <Field label="Tax Number" field="taxNumber" placeholder="e.g. 9123456789" />
      </div>
      <div style={s.row}>
        <label style={s.label}>Company Description</label>
        <textarea
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Brief description of your company and the cricket products you supply..."
          style={s.textarea}
        />
      </div>
      <Field label="Physical Address" field="physicalAddress" placeholder="Street address" />
      <div style={s.grid2}>
        <Field label="City / Town" field="city" placeholder="e.g. Johannesburg" />
        <div style={s.row}>
          <label style={s.label}>Province</label>
          <select value={form.province} onChange={e => update('province', e.target.value)} style={s.select}>
            <option value="">Select province...</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <Field label="Postal Code" field="postalCode" placeholder="e.g. 2000" />
    </>
  );

  // Step 1: Contact Details
  const renderContactDetails = () => (
    <>
      <h3 style={s.sectionTitle}>Contact Details</h3>
      <p style={s.sectionDesc}>Provide the primary contact for this supplier account.</p>
      <Field label="Contact Person Full Name" field="contactPersonName" required placeholder="e.g. John Smith" />
      <div style={s.grid2}>
        <Field label="Primary Email" field="email" required type="email" placeholder="company@email.co.za" />
        <Field label="Primary Phone" field="phone" type="tel" placeholder="e.g. 011 123 4567" />
      </div>
      <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, marginTop: 8, border: '1px solid #334155' }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Additional Contact (Optional)</div>
        <div style={s.grid2}>
          <Field label="Alt. Email" field="contactPersonEmail" type="email" placeholder="Optional alt email" />
          <Field label="Alt. Phone" field="contactPersonPhone" type="tel" placeholder="Optional alt phone" />
        </div>
      </div>
    </>
  );

  // Step 2: Banking
  const renderBanking = () => (
    <>
      <h3 style={s.sectionTitle}>Banking Details</h3>
      <p style={s.sectionDesc}>
        For receiving payouts. Banking details are encrypted and stored securely.
        You can update these later from your supplier portal.
      </p>
      <Field label="Bank Name" field="bankName" placeholder="e.g. FNB, Standard Bank, Nedbank, ABSA" />
      <div style={s.grid2}>
        <Field label="Account Number" field="bankAccountNumber" placeholder="Account number" />
        <Field label="Branch Code" field="bankBranchCode" placeholder="e.g. 250655" />
      </div>
      <div style={s.grid2}>
        <div style={s.row}>
          <label style={s.label}>Account Type</label>
          <select value={form.bankAccountType} onChange={e => update('bankAccountType', e.target.value)} style={s.select}>
            <option value="">Select type...</option>
            {BANK_ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Field label="Account Holder Name" field="bankAccountHolder" placeholder="Name on account" />
      </div>
      <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginTop: 8 }}>
        <span style={{ color: '#60a5fa', fontSize: 13 }}>ℹ️ Banking details are optional at this stage. You can provide or update them once your application is approved.</span>
      </div>
    </>
  );

  // Step 3: Product Categories
  const renderCategories = () => (
    <>
      <h3 style={s.sectionTitle}>Product Categories</h3>
      <p style={s.sectionDesc}>
        Select the categories of products you plan to supply. You must select at least one.
      </p>
      <div style={s.catGrid}>
        {PRODUCT_CATEGORIES.map(cat => (
          <div
            key={cat}
            style={s.catChip(form.productCategories.includes(cat))}
            onClick={() => toggleCategory(cat)}
          >
            {form.productCategories.includes(cat) ? '✓ ' : ''}{cat}
          </div>
        ))}
      </div>
      {errors.productCategories && <div style={{ ...s.errorText, marginTop: 12 }}>{errors.productCategories}</div>}
      {form.productCategories.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
          {form.productCategories.length} categor{form.productCategories.length === 1 ? 'y' : 'ies'} selected
        </div>
      )}
    </>
  );

  // Step 4: Documents
  const renderDocuments = () => (
    <>
      <h3 style={s.sectionTitle}>Supporting Documents</h3>
      <p style={s.sectionDesc}>
        Upload your company documents. Accepted formats: PDF, JPG, PNG, DOC. Max 10MB per file.
      </p>
      {DOC_TYPES.map(doc => {
        const uploaded = form.documents.find(d => d.docType === doc.key);
        return (
          <div key={doc.key} style={s.docRow}>
            <span style={s.docLabel}>
              {doc.label}
              {doc.required && <span style={s.required}>*</span>}
            </span>
            {uploaded ? (
              <span style={s.uploadedBadge}>
                ✓ {uploaded.fileName}
                <button style={s.removeBtn} onClick={() => removeDoc(doc.key)}>✕</button>
              </span>
            ) : (
              <>
                <label style={{ ...s.uploadBtn, position: 'relative', overflow: 'hidden' }}>
                  {uploading === doc.key ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    disabled={uploading === doc.key}
                    onChange={e => {
                      if (e.target.files[0]) uploadDoc(e.target.files[0], doc.key);
                    }}
                  />
                </label>
              </>
            )}
            {errors[doc.key] && <div style={{ ...s.errorText, width: '100%' }}>{errors[doc.key]}</div>}
          </div>
        );
      })}
    </>
  );

  // Step 5: Agreements
  const renderAgreements = () => (
    <>
      <h3 style={s.sectionTitle}>Terms & Agreements</h3>
      <p style={s.sectionDesc}>Please read and agree to the following before submitting.</p>

      <div style={{ background: '#0f172a', borderRadius: 8, padding: 20, border: '1px solid #334155', marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
        <h4 style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 8 }}>Supplier Terms & Conditions</h4>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
          <p>By registering as a supplier on Winter League Cricket, you agree to:</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Provide accurate and truthful company information</li>
            <li>Supply products that meet the quality standards of Winter League Cricket</li>
            <li>Set your cost prices honestly; Winter League Cricket admin will set the final sell prices</li>
            <li>Fulfill orders within the agreed SLA timeframes</li>
            <li>Maintain adequate stock levels and update inventory promptly</li>
            <li>Accept the commission structure (10% team commission on team-referred purchases)</li>
            <li>Provide valid tax invoices for all transactions</li>
            <li>Comply with all applicable South African laws and regulations</li>
            <li>Accept that product listings require admin approval before going live</li>
            <li>Accept that Winter League Cricket may revoke supplier status for SLA breaches</li>
          </ul>
        </div>
      </div>
      <div
        style={s.checkbox}
        onClick={() => update('agreedToTerms', !form.agreedToTerms)}
      >
        <input
          type="checkbox"
          checked={form.agreedToTerms}
          onChange={() => {}}
          style={s.checkboxInput}
        />
        <span style={s.checkboxLabel}>
          I have read and agree to the <strong>Supplier Terms & Conditions</strong>
        </span>
      </div>
      {errors.agreedToTerms && <div style={s.errorText}>{errors.agreedToTerms}</div>}

      <div style={{ background: '#0f172a', borderRadius: 8, padding: 20, border: '1px solid #334155', marginBottom: 16, maxHeight: 200, overflowY: 'auto', marginTop: 16 }}>
        <h4 style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 8 }}>Service Level Agreement (SLA)</h4>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
          <p>As a Winter League Cricket supplier, you commit to the following service levels:</p>
          <p><strong>Standard Tier:</strong></p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Response to new orders: within 24 hours</li>
            <li>Order dispatch: within 3 business days of order confirmation</li>
            <li>Customer query response: within 24 hours</li>
          </ul>
          <p><strong>Premium Tier (by invitation):</strong></p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Response to new orders: within 12 hours</li>
            <li>Order dispatch: within 2 business days of order confirmation</li>
            <li>Customer query response: within 12 hours</li>
          </ul>
          <p><strong>Breach Policy:</strong> Consistent failure to meet SLA targets will result in warnings, followed by potential suspension or removal from the platform.</p>
        </div>
      </div>
      <div
        style={s.checkbox}
        onClick={() => update('agreedToSla', !form.agreedToSla)}
      >
        <input
          type="checkbox"
          checked={form.agreedToSla}
          onChange={() => {}}
          style={s.checkboxInput}
        />
        <span style={s.checkboxLabel}>
          I have read and agree to the <strong>Service Level Agreement (SLA)</strong>
        </span>
      </div>
      {errors.agreedToSla && <div style={s.errorText}>{errors.agreedToSla}</div>}
    </>
  );

  // Step 6: Review
  const ReviewField = ({ label, value }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={s.reviewLabel}>{label}</div>
      <div style={s.reviewValue}>{value || <span style={{ color: '#475569' }}>Not provided</span>}</div>
    </div>
  );

  const renderReview = () => (
    <>
      <h3 style={s.sectionTitle}>Review Your Application</h3>
      <p style={s.sectionDesc}>Please review all details before submitting. Click on any section heading to go back and edit.</p>

      <div style={s.reviewSection}>
        <h4 style={{ color: '#dc0000', fontSize: 13, marginBottom: 12, cursor: 'pointer' }} onClick={() => setStep(0)}>
          🏢 Company Info ✏️
        </h4>
        <div style={s.grid2}>
          <ReviewField label="Company Name" value={form.companyName} />
          <ReviewField label="Trading Name" value={form.tradingName} />
        </div>
        <div style={s.grid2}>
          <ReviewField label="CK/CIPC No." value={form.businessRegistrationNumber} />
          <ReviewField label="Company Type" value={form.companyType} />
        </div>
        <div style={s.grid2}>
          <ReviewField label="VAT Number" value={form.vatNumber} />
          <ReviewField label="Tax Number" value={form.taxNumber} />
        </div>
        <ReviewField label="Address" value={[form.physicalAddress, form.city, form.province, form.postalCode].filter(Boolean).join(', ')} />
      </div>

      <div style={s.reviewSection}>
        <h4 style={{ color: '#dc0000', fontSize: 13, marginBottom: 12, cursor: 'pointer' }} onClick={() => setStep(1)}>
          👤 Contact Details ✏️
        </h4>
        <div style={s.grid2}>
          <ReviewField label="Contact Person" value={form.contactPersonName} />
          <ReviewField label="Email" value={form.email} />
        </div>
        <div style={s.grid2}>
          <ReviewField label="Phone" value={form.phone} />
          <ReviewField label="Alt. Email" value={form.contactPersonEmail} />
        </div>
      </div>

      <div style={s.reviewSection}>
        <h4 style={{ color: '#dc0000', fontSize: 13, marginBottom: 12, cursor: 'pointer' }} onClick={() => setStep(2)}>
          🏦 Banking Details ✏️
        </h4>
        <div style={s.grid2}>
          <ReviewField label="Bank" value={form.bankName} />
          <ReviewField label="Account Number" value={form.bankAccountNumber ? '••••' + form.bankAccountNumber.slice(-4) : ''} />
        </div>
        <div style={s.grid2}>
          <ReviewField label="Branch Code" value={form.bankBranchCode} />
          <ReviewField label="Account Type" value={form.bankAccountType} />
        </div>
      </div>

      <div style={s.reviewSection}>
        <h4 style={{ color: '#dc0000', fontSize: 13, marginBottom: 12, cursor: 'pointer' }} onClick={() => setStep(3)}>
          📦 Product Categories ✏️
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {form.productCategories.map(c => (
            <span key={c} style={{ padding: '4px 12px', borderRadius: 16, background: 'rgba(220,0,0,0.15)', color: '#f87171', fontSize: 12 }}>{c}</span>
          ))}
        </div>
      </div>

      <div style={s.reviewSection}>
        <h4 style={{ color: '#dc0000', fontSize: 13, marginBottom: 12, cursor: 'pointer' }} onClick={() => setStep(4)}>
          📄 Documents ✏️
        </h4>
        {form.documents.length > 0 ? (
          form.documents.map(d => (
            <div key={d.docType} style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
              ✓ {DOC_TYPES.find(dt => dt.key === d.docType)?.label}: <span style={{ color: '#16a34a' }}>{d.fileName}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 13, color: '#64748b' }}>No documents uploaded</div>
        )}
      </div>

      <div style={s.reviewSection}>
        <h4 style={{ color: '#dc0000', fontSize: 13, marginBottom: 12 }}>✅ Agreements</h4>
        <div style={{ fontSize: 13, color: form.agreedToTerms ? '#16a34a' : '#dc0000', marginBottom: 4 }}>
          {form.agreedToTerms ? '✓' : '✕'} Terms & Conditions
        </div>
        <div style={{ fontSize: 13, color: form.agreedToSla ? '#16a34a' : '#dc0000' }}>
          {form.agreedToSla ? '✓' : '✕'} Service Level Agreement
        </div>
      </div>
    </>
  );

  // ─── RENDER ─────────────────────────
  return (
    <div style={s.page} className="supplier-registration-theme">
      <Head>
        <title>Become a Supplier | Winter League Cricket</title>
        <meta name="description" content="Apply to become a cricket equipment supplier on Winter League Cricket. Sell your products to cricket teams and players across South Africa." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.header}>
        <div style={s.logo}>Winter League Cricket</div>
        <div style={s.subtitle}>Supplier Application</div>
      </div>

      <div style={s.container}>
        {/* Step Progress Bar */}
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <div style={s.stepBar}>
            {STEPS.map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={s.stepDot(i === step, i < step)}>{i < step ? 'OK' : st.icon}</div>
                  <div style={s.stepLabel(i === step)}>{st.label}</div>
                </div>
                {i < STEPS.length - 1 && <div style={s.stepLine(i < step)} />}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={s.card}>
          {renderStep()}

          <div style={s.btnRow}>
            {step > 0 ? (
              <button style={s.btnSecondary} onClick={prev}>Back</button>
            ) : (
              <a href="/" style={{ ...s.btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Home</a>
            )}
            {step < STEPS.length - 1 ? (
              <button style={s.btnPrimary} onClick={next}>Continue</button>
            ) : (
              <button
                style={{ ...s.btnPrimary, ...(submitting ? s.btnDisabled : {}) }}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        {/* Info footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: '#64748b' }}>
          Need help? Contact us at <a href="mailto:info@winterleaguecricket.co.za" style={{ color: '#fda4af', fontWeight: 700 }}>info@winterleaguecricket.co.za</a>
        </div>
      </div>
      <style jsx global>{`
        .supplier-registration-theme {
          color-scheme: dark;
        }
        .supplier-registration-theme * {
          scrollbar-width: thin;
          scrollbar-color: rgba(148,163,184,0.22) transparent;
        }
        .supplier-registration-theme ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .supplier-registration-theme ::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.22);
          border-radius: 999px;
        }
        .supplier-registration-theme input:focus,
        .supplier-registration-theme select:focus,
        .supplier-registration-theme textarea:focus {
          border-color: rgba(248,113,113,0.45) !important;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.18);
        }
        .supplier-registration-theme button:hover,
        .supplier-registration-theme a:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
