import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminSuppliers() {
  // ─── STATE ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Application review
  const [reviewingApp, setReviewingApp] = useState(null);
  const [appSlaTier, setAppSlaTier] = useState('standard');
  const [appNotes, setAppNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Product approval
  const [approvingProduct, setApprovingProduct] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [qualityRating, setQualityRating] = useState(3);
  const [productNotes, setProductNotes] = useState('');

  // Payouts
  const [adminPayouts, setAdminPayouts] = useState([]);
  const [adminPayoutStats, setAdminPayoutStats] = useState({ total: 0, pending: 0, processing: 0, paid: 0, failed: 0, totalAmount: 0, pendingAmount: 0, paidAmount: 0 });
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [genPeriodStart, setGenPeriodStart] = useState('');
  const [genPeriodEnd, setGenPeriodEnd] = useState('');
  const [payRefInput, setPayRefInput] = useState('');

  // ─── DATA FETCHING ─────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (activeTab === 'payouts') fetchPayouts(); }, [activeTab]);

  const fetchPayouts = async () => {
    try {
      const r = await fetch('/api/supplier-payouts?action=admin-list');
      const d = await r.json();
      if (d.success) { setAdminPayouts(d.payouts || []); setAdminPayoutStats(d.stats || {}); }
    } catch (e) { console.error('Failed to load payouts:', e); }
  };

  const handleGenerateAll = async () => {
    if (!genPeriodStart || !genPeriodEnd) { setMessage('Select period start and end dates'); return; }
    try {
      const r = await fetch('/api/supplier-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate-all', periodStart: genPeriodStart, periodEnd: genPeriodEnd }) });
      const d = await r.json();
      if (d.success) { setMessage(`Generated ${d.generated} payout(s)`); fetchPayouts(); }
      else setMessage(d.error || 'Failed to generate payouts');
    } catch (e) { setMessage('Error generating payouts'); }
  };

  const handlePayoutAction = async (payoutId, action, extra = {}) => {
    try {
      const r = await fetch('/api/supplier-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payoutId, ...extra }) });
      const d = await r.json();
      if (d.success) { setMessage(`Payout ${action.replace('mark-', '')} successfully`); fetchPayouts(); }
      else setMessage(d.error || 'Action failed');
    } catch (e) { setMessage('Error performing action'); }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchSuppliers(), fetchApplications(), fetchPendingProducts()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/supplier-management?view=stats');
      if (res.ok) { const data = await res.json(); setStats(data); }
    } catch (e) { console.error('Stats error:', e); }
  };

  const fetchSuppliers = async () => {
    try {
      const url = search ? `/api/supplier-management?search=${encodeURIComponent(search)}` : '/api/supplier-management';
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setSuppliers(data.suppliers || []); }
    } catch (e) { console.error('Suppliers error:', e); }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/supplier-applications');
      if (res.ok) { const data = await res.json(); setApplications(data.applications || []); }
    } catch (e) { console.error('Applications error:', e); }
  };

  const fetchPendingProducts = async () => {
    try {
      const res = await fetch('/api/supplier-management?view=pending-products');
      if (res.ok) { const data = await res.json(); setPendingProducts(data.products || []); }
    } catch (e) { console.error('Pending products error:', e); }
  };

  const fetchSupplierDetail = async (id) => {
    try {
      const res = await fetch(`/api/supplier-management?supplierId=${id}`);
      if (res.ok) { const data = await res.json(); setSelectedSupplier(data); setActiveTab('supplier-detail'); }
    } catch (e) { console.error('Supplier detail error:', e); }
  };

  // ─── ACTIONS ───────────────────────────────────────────
  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const handleApproveApp = async (appId) => {
    try {
      const res = await fetch('/api/supplier-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', applicationId: appId, slaTier: appSlaTier, adminNotes: appNotes })
      });
      const data = await res.json();
      if (data.supplier) {
        showMessage(`✅ Approved! Temp password: ${data.tempPassword} — Share this with the supplier.`);
        setReviewingApp(null); setAppNotes(''); setAppSlaTier('standard');
        fetchAll();
      } else {
        showMessage('❌ ' + (data.error || 'Approval failed'));
      }
    } catch (e) { showMessage('❌ Error approving application'); }
  };

  const handleRejectApp = async (appId) => {
    if (!rejectionReason.trim()) { showMessage('❌ Rejection reason required'); return; }
    try {
      const res = await fetch('/api/supplier-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', applicationId: appId, rejectionReason, adminNotes: appNotes })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Application rejected');
        setReviewingApp(null); setRejectionReason(''); setAppNotes('');
        fetchAll();
      } else {
        showMessage('❌ ' + (data.error || 'Rejection failed'));
      }
    } catch (e) { showMessage('❌ Error rejecting application'); }
  };

  const handleApproveProduct = async (productId) => {
    if (!sellPrice || parseFloat(sellPrice) <= 0) { showMessage('❌ Valid sell price required'); return; }
    try {
      const res = await fetch('/api/supplier-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-product', productId, sellPrice: parseFloat(sellPrice), qualityRating, notes: productNotes })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('✅ Product approved and live!');
        setApprovingProduct(null); setSellPrice(''); setQualityRating(3); setProductNotes('');
        fetchPendingProducts();
      } else {
        showMessage('❌ ' + (data.error || 'Approval failed'));
      }
    } catch (e) { showMessage('❌ Error approving product'); }
  };

  const handleRejectProduct = async (productId) => {
    if (!productNotes.trim()) { showMessage('❌ Rejection reason required'); return; }
    try {
      const res = await fetch('/api/supplier-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject-product', productId, notes: productNotes })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Product rejected');
        setApprovingProduct(null); setProductNotes('');
        fetchPendingProducts();
      } else {
        showMessage('❌ ' + (data.error || 'Rejection failed'));
      }
    } catch (e) { showMessage('❌ Error rejecting product'); }
  };

  const handleToggleActive = async (supplierId, currentActive) => {
    try {
      const res = await fetch('/api/supplier-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-active', supplierId, active: !currentActive })
      });
      const data = await res.json();
      if (data.success) { showMessage(data.message); fetchSuppliers(); }
    } catch (e) { showMessage('❌ Error toggling active status'); }
  };

  const handleUpdateTier = async (supplierId, slaTier) => {
    try {
      const res = await fetch('/api/supplier-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-tier', supplierId, slaTier })
      });
      const data = await res.json();
      if (data.success) { showMessage(data.message); fetchSuppliers(); if (selectedSupplier) fetchSupplierDetail(supplierId); }
    } catch (e) { showMessage('❌ Error updating tier'); }
  };

  // ─── STYLES ────────────────────────────────────────────
  const s = {
    container: { minHeight: '100vh', background: '#f3f4f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', padding: '1rem 0', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
    headerContent: { maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: 0 },
    nav: { display: 'flex', gap: '1.5rem' },
    navLink: { color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' },
    main: { maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem' },
    tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' },
    tab: (active) => ({
      padding: '0.75rem 1.25rem', border: 'none', background: active ? '#fff' : 'transparent',
      borderBottom: active ? '2px solid #dc0000' : '2px solid transparent',
      color: active ? '#111827' : '#6b7280', fontSize: '0.9rem', fontWeight: active ? 700 : 500,
      cursor: 'pointer', transition: 'all 0.2s', borderRadius: '6px 6px 0 0', marginBottom: '-2px'
    }),
    card: { background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', marginBottom: '1rem' },
    statCard: (color) => ({
      background: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb', borderLeft: `4px solid ${color}`
    }),
    badge: (bg, color) => ({
      padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-block',
      background: bg, color: color
    }),
    btn: (bg) => ({
      padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
      cursor: 'pointer', background: bg || '#dc0000', color: '#fff', transition: 'opacity 0.2s'
    }),
    btnOutline: { padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151' },
    input: { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' },
    label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' },
    msgBar: { position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000, padding: '0.75rem 1.25rem', borderRadius: '8px', background: '#111827', color: '#fff', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: '500px' },
  };

  const statusBadge = (status) => {
    const m = {
      submitted: { bg: '#fef3c7', color: '#92400e' }, under_review: { bg: '#dbeafe', color: '#1e40af' },
      approved: { bg: '#d1fae5', color: '#065f46' }, rejected: { bg: '#fee2e2', color: '#991b1b' },
      pending: { bg: '#fef3c7', color: '#92400e' }, active: { bg: '#d1fae5', color: '#065f46' }
    };
    const c = m[status] || m.pending;
    return <span style={s.badge(c.bg, c.color)}>{(status || 'unknown').replace('_', ' ').toUpperCase()}</span>;
  };

  const tierBadge = (tier) => {
    const m = { standard: '#6b7280', premium: '#0ea5e9', enterprise: '#8b5cf6' };
    return <span style={{ ...s.badge(m[tier] || m.standard, '#fff'), textTransform: 'capitalize' }}>{tier || 'standard'}</span>;
  };

  // ─── RENDER: DASHBOARD ─────────────────────────────────
  const renderDashboard = () => {
    if (!stats) return <div style={s.card}>Loading stats...</div>;
    const { suppliers: ss, applications: aa, products: pp, orders: oo } = stats;
    const cards = [
      { label: 'Active Suppliers', value: ss.active_suppliers, color: '#10b981' },
      { label: 'Pending Applications', value: aa.pending_apps, color: '#f59e0b' },
      { label: 'Products Awaiting Approval', value: pp.pending_products, color: '#3b82f6' },
      { label: 'Total Supplier Revenue', value: `R ${parseFloat(ss.total_revenue || 0).toFixed(2)}`, color: '#8b5cf6' },
      { label: 'Total Orders', value: oo.total_orders, color: '#06b6d4' },
      { label: 'Admin Margin', value: `R ${parseFloat(oo.total_admin_margin || 0).toFixed(2)}`, color: '#dc0000' },
      { label: 'Team Commissions', value: `R ${parseFloat(oo.total_team_commission || 0).toFixed(2)}`, color: '#f97316' },
      { label: 'SLA Breaches', value: oo.sla_breaches, color: oo.sla_breaches > 0 ? '#ef4444' : '#10b981' },
    ];

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {cards.map((c, i) => (
            <div key={i} style={s.statCard(c.color)}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>{c.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={s.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {parseInt(aa.pending_apps) > 0 && (
              <button onClick={() => setActiveTab('applications')} style={s.btn('#f59e0b')}>
                📋 {aa.pending_apps} Pending Application{aa.pending_apps > 1 ? 's' : ''}
              </button>
            )}
            {parseInt(pp.pending_products) > 0 && (
              <button onClick={() => setActiveTab('products')} style={s.btn('#3b82f6')}>
                📦 {pp.pending_products} Product{pp.pending_products > 1 ? 's' : ''} Awaiting Approval
              </button>
            )}
            <a href="/supplier-portal?admin=true" target="_blank" rel="noopener noreferrer" style={{ ...s.btn('#111827'), textDecoration: 'none' }}>
              🔍 Preview Supplier Portal
            </a>
            <a href="/become-a-supplier" target="_blank" rel="noopener noreferrer" style={{ ...s.btn('#6b7280'), textDecoration: 'none' }}>
              📝 View Registration Form
            </a>
          </div>
        </div>

        {/* Application Pipeline */}
        <div style={s.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Application Pipeline</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Submitted', count: aa.pending_apps, color: '#f59e0b' },
              { label: 'Under Review', count: aa.reviewing_apps, color: '#3b82f6' },
              { label: 'Approved', count: aa.approved_apps, color: '#10b981' },
              { label: 'Rejected', count: aa.rejected_apps, color: '#ef4444' },
            ].map((p, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#f9fafb' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: p.color }}>{p.count}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  // ─── RENDER: APPLICATIONS ──────────────────────────────
  const renderApplications = () => {
    const pending = applications.filter(a => a.status === 'submitted' || a.status === 'under_review');
    const past = applications.filter(a => a.status === 'approved' || a.status === 'rejected');

    return (
      <>
        {pending.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              Pending Applications ({pending.length})
            </h3>
            {pending.map(app => (
              <div key={app.id} style={{ ...s.card, borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{app.companyName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {app.contactPersonName} • {app.email} • {app.phone}
                    </div>
                  </div>
                  {statusBadge(app.status)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#6b7280' }}>CK/Registration:</span> <strong>{app.businessRegistrationNumber}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Company Type:</span> <strong>{app.companyType || 'N/A'}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>VAT:</span> <strong>{app.vatNumber || 'None'}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Applied:</span> <strong>{new Date(app.createdAt).toLocaleDateString()}</strong></div>
                </div>

                {app.productCategories && app.productCategories.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Categories: </span>
                    {app.productCategories.map((c, i) => (
                      <span key={i} style={{ ...s.badge('#fef3c7', '#92400e'), marginRight: '0.25rem' }}>{c}</span>
                    ))}
                  </div>
                )}

                {app.description && (
                  <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                    {app.description}
                  </div>
                )}

                {/* Documents */}
                {app.documents && app.documents.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Documents: </span>
                    {app.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: '#2563eb', marginRight: '0.75rem', textDecoration: 'none' }}>
                        📄 {doc.type || doc.name || `Doc ${i + 1}`}
                      </a>
                    ))}
                  </div>
                )}

                {/* Review Panel */}
                {reviewingApp === app.id ? (
                  <div style={{ padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginTop: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={s.label}>SLA Tier</label>
                        <select value={appSlaTier} onChange={e => setAppSlaTier(e.target.value)} style={s.input}>
                          <option value="standard">Standard (24h response, 3-day dispatch)</option>
                          <option value="premium">Premium (12h response, 2-day dispatch)</option>
                          <option value="enterprise">Enterprise (Custom SLA)</option>
                        </select>
                      </div>
                      <div>
                        <label style={s.label}>Admin Notes (optional)</label>
                        <input value={appNotes} onChange={e => setAppNotes(e.target.value)} placeholder="Internal notes..." style={s.input} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={s.label}>Rejection Reason (required to reject)</label>
                      <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Why is this application being rejected?" rows={2}
                        style={{ ...s.input, resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApproveApp(app.id)} style={s.btn('#10b981')}>✅ Approve</button>
                      <button onClick={() => handleRejectApp(app.id)} style={s.btn('#ef4444')}>❌ Reject</button>
                      <button onClick={() => { setReviewingApp(null); setRejectionReason(''); setAppNotes(''); }} style={s.btnOutline}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setReviewingApp(app.id)} style={s.btn('#3b82f6')}>📝 Review</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {pending.length === 0 && (
          <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ color: '#6b7280' }}>No pending applications to review</div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              Past Applications ({past.length})
            </h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {past.map(app => (
                <div key={app.id} style={{ ...s.card, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{app.companyName}</span>
                    <span style={{ color: '#6b7280', fontSize: '0.8rem', marginLeft: '0.75rem' }}>{app.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(app.createdAt).toLocaleDateString()}</span>
                    {statusBadge(app.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ─── RENDER: SUPPLIERS LIST ────────────────────────────
  const renderSuppliers = () => (
    <>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSuppliers()}
          placeholder="Search suppliers by name, email, contact..." style={{ ...s.input, maxWidth: '400px' }} />
        <button onClick={fetchSuppliers} style={s.btn('#374151')}>Search</button>
        {search && <button onClick={() => { setSearch(''); setTimeout(fetchSuppliers, 0); }} style={s.btnOutline}>Clear</button>}
      </div>

      {suppliers.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
          <div style={{ color: '#6b7280' }}>No suppliers found</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Company', 'Contact', 'SLA Tier', 'Products', 'Orders', 'Revenue', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{sup.companyName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{sup.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#374151' }}>{sup.contactPersonName || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <select value={sup.slaTier || 'standard'} onChange={e => handleUpdateTier(sup.id, e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                    {sup.productCount}
                    {sup.pendingProducts > 0 && (
                      <span style={{ ...s.badge('#fef3c7', '#92400e'), marginLeft: '0.3rem' }}>+{sup.pendingProducts}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', textAlign: 'center' }}>{sup.orderCount}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>R {sup.totalRevenue.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {sup.active ? (
                      <span style={s.badge('#d1fae5', '#065f46')}>ACTIVE</span>
                    ) : (
                      <span style={s.badge('#fee2e2', '#991b1b')}>INACTIVE</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => fetchSupplierDetail(sup.id)} style={{ ...s.btn('#3b82f6'), padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>View</button>
                      <button onClick={() => handleToggleActive(sup.id, sup.active)}
                        style={{ ...s.btn(sup.active ? '#ef4444' : '#10b981'), padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                        {sup.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ─── RENDER: SUPPLIER DETAIL ───────────────────────────
  const renderSupplierDetail = () => {
    if (!selectedSupplier) return null;
    const sup = selectedSupplier.supplier;
    const prods = selectedSupplier.products || [];
    const ords = selectedSupplier.orders || [];

    return (
      <>
        <button onClick={() => { setSelectedSupplier(null); setActiveTab('suppliers'); }} style={{ ...s.btnOutline, marginBottom: '1rem' }}>
          ← Back to Suppliers
        </button>

        {/* Company Info */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>{sup.companyName}</h2>
              {sup.tradingName && <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Trading as: {sup.tradingName}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {tierBadge(sup.slaTier)}
              {sup.active ? <span style={s.badge('#d1fae5', '#065f46')}>ACTIVE</span> : <span style={s.badge('#fee2e2', '#991b1b')}>INACTIVE</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Contact</div>
              <div style={{ fontSize: '0.9rem', color: '#111827' }}>{sup.contactPersonName || '—'}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>{sup.email}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>{sup.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Registration</div>
              <div style={{ fontSize: '0.9rem', color: '#111827' }}>CK: {sup.businessRegistrationNumber || '—'}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>VAT: {sup.vatNumber || 'None'}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>Type: {sup.companyType || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Banking</div>
              <div style={{ fontSize: '0.9rem', color: '#111827' }}>{sup.bankName || '—'}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>Acc: {sup.bankAccountNumber ? '••••' + sup.bankAccountNumber.slice(-4) : '—'}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>Branch: {sup.bankBranchCode || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Performance</div>
              <div style={{ fontSize: '0.9rem', color: '#111827' }}>Rating: {sup.rating > 0 ? `${sup.rating.toFixed(1)} ⭐` : 'No reviews'}</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>SLA Compliance: {sup.slaComplianceRate}%</div>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>Payout: {sup.payoutFrequency}</div>
            </div>
          </div>

          {sup.categories && sup.categories.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Categories: </span>
              {sup.categories.map((c, i) => (
                <span key={i} style={{ ...s.badge('#f0f9ff', '#0369a1'), marginRight: '0.25rem' }}>{c}</span>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
            {[
              { label: 'Products', value: prods.length, color: '#3b82f6' },
              { label: 'Orders', value: ords.length, color: '#10b981' },
              { label: 'Revenue', value: `R ${sup.totalRevenue.toFixed(2)}`, color: '#8b5cf6' },
              { label: 'Total Sales', value: sup.totalSales, color: '#f59e0b' },
            ].map((c, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '8px', background: '#f9fafb' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        {prods.length > 0 && (
          <div style={s.card}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Products ({prods.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Name', 'Category', 'Cost', 'Sell Price', 'Margin', 'Rating', 'Stock', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prods.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '0.5rem', color: '#6b7280' }}>{p.category}</td>
                    <td style={{ padding: '0.5rem' }}>R {p.supplierCost.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>R {p.price.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', color: p.price - p.supplierCost > 0 ? '#10b981' : '#ef4444' }}>
                      R {(p.price - p.supplierCost).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{p.qualityRating ? '⭐'.repeat(p.qualityRating) : '—'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{p.stock}</td>
                    <td style={{ padding: '0.5rem' }}>{statusBadge(p.approvalStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Orders */}
        {ords.length > 0 && (
          <div style={s.card}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Recent Orders ({ords.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Order #', 'Subtotal', 'Supplier Gets', 'Admin Margin', 'Team Comm.', 'Status', 'SLA', 'Date'].map(h => (
                    <th key={h} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ords.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.orderNumber}</td>
                    <td style={{ padding: '0.5rem' }}>R {o.subtotal.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', color: '#10b981', fontWeight: 600 }}>R {o.supplierAmount.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>R {o.adminMargin.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>R {o.teamCommission.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>{statusBadge(o.fulfillmentStatus)}</td>
                    <td style={{ padding: '0.5rem' }}>{o.slaBreached ? <span style={s.badge('#fee2e2', '#991b1b')}>BREACHED</span> : <span style={s.badge('#d1fae5', '#065f46')}>OK</span>}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  // ─── RENDER: PRODUCT APPROVALS ─────────────────────────
  const renderProducts = () => {
    const pending = pendingProducts.filter(p => p.approvalStatus === 'pending');
    const rejected = pendingProducts.filter(p => p.approvalStatus === 'rejected');

    return (
      <>
        {pending.length > 0 ? (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              Awaiting Approval ({pending.length})
            </h3>
            {pending.map(product => (
              <div key={product.id} style={{ ...s.card, borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>{product.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      by {product.supplierName} • {product.category} • SKU: {product.supplierSku || 'N/A'}
                    </div>
                  </div>
                  {statusBadge(product.approvalStatus)}
                </div>

                {product.description && (
                  <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                    {product.description.length > 200 ? product.description.substring(0, 200) + '...' : product.description}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>Supplier Cost: </span>
                    <strong style={{ color: '#111827' }}>R {product.supplierCost.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Suggested Price: </span>
                    <strong style={{ color: '#111827' }}>R {product.price > 0 ? product.price.toFixed(2) : '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Stock: </span>
                    <strong>{product.stock || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Sizes: </span>
                    <strong>{product.sizes?.length || 0} variants</strong>
                  </div>
                </div>

                {/* Product Images */}
                {(product.images?.length > 0 || product.image) && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {(product.images || [product.image]).filter(Boolean).slice(0, 4).map((img, i) => (
                      <img key={i} src={img} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                    ))}
                  </div>
                )}

                {/* Approval Form */}
                {approvingProduct === product.id ? (
                  <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginTop: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={s.label}>Sell Price (R) *</label>
                        <input type="number" step="0.01" min="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                          placeholder={product.supplierCost > 0 ? `Min: R${(product.supplierCost * 1.2).toFixed(2)}` : 'R 0.00'}
                          style={s.input} />
                        {sellPrice && product.supplierCost > 0 && (
                          <div style={{ fontSize: '0.75rem', color: parseFloat(sellPrice) > product.supplierCost ? '#10b981' : '#ef4444', marginTop: '0.25rem' }}>
                            Margin: R {(parseFloat(sellPrice) - product.supplierCost).toFixed(2)} ({((parseFloat(sellPrice) - product.supplierCost) / parseFloat(sellPrice) * 100).toFixed(0)}%)
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={s.label}>Quality Rating *</label>
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                          {[1, 2, 3, 4, 5].map(r => (
                            <button key={r} onClick={() => setQualityRating(r)}
                              style={{
                                width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                background: r <= qualityRating ? '#fbbf24' : '#e5e7eb', fontSize: '1.1rem',
                                transition: 'all 0.15s'
                              }}>⭐</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={s.label}>Notes (optional / rejection reason)</label>
                        <input value={productNotes} onChange={e => setProductNotes(e.target.value)} placeholder="Notes..." style={s.input} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApproveProduct(product.id)} style={s.btn('#10b981')}>✅ Approve & Set Live</button>
                      <button onClick={() => handleRejectProduct(product.id)} style={s.btn('#ef4444')}>❌ Reject</button>
                      <button onClick={() => { setApprovingProduct(null); setSellPrice(''); setProductNotes(''); }} style={s.btnOutline}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setApprovingProduct(product.id); setSellPrice(product.price > 0 ? product.price.toString() : ''); }} style={s.btn('#3b82f6')}>
                    📝 Review & Set Price
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ color: '#6b7280' }}>No products awaiting approval</div>
          </div>
        )}

        {rejected.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>
              Previously Rejected ({rejected.length})
            </h3>
            {rejected.map(p => (
              <div key={p.id} style={{ ...s.card, padding: '1rem', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{p.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem', marginLeft: '0.75rem' }}>by {p.supplierName} • R {p.supplierCost.toFixed(2)}</span>
                  {p.approvalNotes && <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.25rem' }}>Reason: {p.approvalNotes}</div>}
                </div>
                {statusBadge('rejected')}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // ─── PAYOUTS TAB ──────────────────────────────────────
  const renderPayouts = () => {
    const pc = { pending: '#f59e0b', processing: '#3b82f6', paid: '#10b981', failed: '#ef4444' };
    const pb = { pending: '#fef3c7', processing: '#dbeafe', paid: '#d1fae5', failed: '#fee2e2' };
    const filtered = payoutFilter === 'all' ? adminPayouts : adminPayouts.filter(p => p.status === payoutFilter);

    return (
      <>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Payouts', value: adminPayoutStats.total, color: '#374151' },
            { label: 'Pending', value: `${adminPayoutStats.pending} (R ${adminPayoutStats.pendingAmount?.toFixed(2) || '0.00'})`, color: '#f59e0b' },
            { label: 'Paid', value: `${adminPayoutStats.paid} (R ${adminPayoutStats.paidAmount?.toFixed(2) || '0.00'})`, color: '#10b981' },
            { label: 'Failed', value: adminPayoutStats.failed, color: '#ef4444' }
          ].map(st => (
            <div key={st.label} style={s.card}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>{st.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: st.color }}>{st.value}</div>
            </div>
          ))}
        </div>

        {/* Generate Payouts */}
        <div style={{ ...s.card, marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Generate Payouts for Period</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Period Start</label>
              <input type="date" value={genPeriodStart} onChange={e => setGenPeriodStart(e.target.value)} style={s.input} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Period End</label>
              <input type="date" value={genPeriodEnd} onChange={e => setGenPeriodEnd(e.target.value)} style={s.input} />
            </div>
            <button onClick={handleGenerateAll} style={{ ...s.btn('#dc0000'), padding: '0.5rem 1.25rem' }}>Generate All Payouts</button>
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['all', 'pending', 'processing', 'paid', 'failed'].map(f => (
            <button key={f} onClick={() => setPayoutFilter(f)} style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: payoutFilter === f ? '1px solid #dc0000' : '1px solid #e5e7eb', background: payoutFilter === f ? '#fef2f2' : '#fff', color: payoutFilter === f ? '#dc0000' : '#6b7280', fontSize: '0.8rem', cursor: 'pointer', fontWeight: payoutFilter === f ? 600 : 400 }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Payout List */}
        {filtered.length === 0 ? (
          <div style={{ ...s.card, textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸</div>
            <div style={{ color: '#6b7280' }}>No payouts found{payoutFilter !== 'all' ? ` with status "${payoutFilter}"` : ''}.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filtered.map(p => (
              <div key={p.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{p.companyName}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
                      {new Date(p.periodStart).toLocaleDateString()} \u2014 {new Date(p.periodEnd).toLocaleDateString()} · {p.orderCount} orders
                    </div>
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: pb[p.status], color: pc[p.status] }}>
                    {p.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <div>Earnings: <strong>R {p.supplierEarnings.toFixed(2)}</strong></div>
                  {p.slaPenalties > 0 && <div style={{ color: '#ef4444' }}>Penalties: -R {p.slaPenalties.toFixed(2)}</div>}
                  <div>Net: <strong style={{ color: '#10b981' }}>R {p.netPayout.toFixed(2)}</strong></div>
                </div>

                {/* Banking */}
                {p.bankAccountNumber && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                    🏦 {p.bankName} · Acc: {p.bankAccountNumber} · Branch: {p.bankBranchCode} · {p.bankAccountType} · {p.bankAccountHolder}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {p.status === 'pending' && (
                    <>
                      <button onClick={() => handlePayoutAction(p.id, 'mark-processing')} style={{ ...s.btnOutline, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Mark Processing</button>
                      <button onClick={() => handlePayoutAction(p.id, 'mark-failed', { adminNotes: 'Cancelled by admin' })} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#fff', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                    </>
                  )}
                  {p.status === 'processing' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" placeholder="Payment reference" value={payRefInput} onChange={e => setPayRefInput(e.target.value)} style={{ ...s.input, fontSize: '0.8rem', padding: '0.35rem 0.6rem', width: '200px' }} />
                      <button onClick={() => { handlePayoutAction(p.id, 'mark-paid', { paymentReference: payRefInput, paymentMethod: 'eft' }); setPayRefInput(''); }} style={{ ...s.btn('#10b981'), fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Mark Paid</button>
                      <button onClick={() => handlePayoutAction(p.id, 'mark-failed', { adminNotes: 'Payment failed' })} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: '#fff', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}>Failed</button>
                    </div>
                  )}
                  {p.status === 'paid' && p.paymentReference && (
                    <div style={{ fontSize: '0.8rem', color: '#10b981' }}>✅ Ref: {p.paymentReference} · Paid: {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''}</div>
                  )}
                  {p.status === 'failed' && p.adminNotes && (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>❌ {p.adminNotes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // ─── MAIN RENDER ───────────────────────────────────────
  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'applications', label: `📋 Applications${applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length > 0 ? ` (${applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length})` : ''}` },
    { key: 'suppliers', label: `📦 Suppliers (${suppliers.length})` },
    { key: 'products', label: `🏷️ Product Approvals${pendingProducts.filter(p => p.approvalStatus === 'pending').length > 0 ? ` (${pendingProducts.filter(p => p.approvalStatus === 'pending').length})` : ''}` },
    { key: 'payouts', label: `💸 Payouts${adminPayoutStats.pending > 0 ? ` (${adminPayoutStats.pending})` : ''}` },
  ];

  return (
    <>
      <Head><title>Supplier Management - Admin</title></Head>
      <div style={s.container}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerContent}>
            <h1 style={s.logo}>📦 Supplier Management</h1>
            <nav style={s.nav}>
              <Link href="/admin" style={s.navLink}>← Back to Admin</Link>
              <Link href="/supplier-portal?admin=true" style={s.navLink} target="_blank">Preview Portal</Link>
              <Link href="/" style={s.navLink}>View Store</Link>
            </nav>
          </div>
        </header>

        {/* Message Bar */}
        {message && <div style={s.msgBar}>{message}</div>}

        <main style={s.main}>
          {/* Tabs */}
          {activeTab !== 'supplier-detail' && (
            <div style={s.tabs}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={s.tab(activeTab === t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
              <div style={{ color: '#6b7280' }}>Loading supplier data...</div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'applications' && renderApplications()}
              {activeTab === 'suppliers' && renderSuppliers()}
              {activeTab === 'products' && renderProducts()}
              {activeTab === 'payouts' && renderPayouts()}
              {activeTab === 'supplier-detail' && renderSupplierDetail()}
            </>
          )}
        </main>
      </div>
    </>
  );
}
