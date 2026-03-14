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

  // Performance
  const [perfOverview, setPerfOverview] = useState(null);

  // Returns & Disputes
  const [adminReturns, setAdminReturns] = useState([]);
  const [adminReturnStats, setAdminReturnStats] = useState({ total: 0, requested: 0, approved: 0, rejected: 0, refunded: 0, openDisputes: 0 });
  const [adminReturnFilter, setAdminReturnFilter] = useState('all');
  const [selectedAdminReturn, setSelectedAdminReturn] = useState(null);
  const [adminResolution, setAdminResolution] = useState('');
  const [adminReturnNotes, setAdminReturnNotes] = useState('');
  const [adminRefundAmount, setAdminRefundAmount] = useState('');

  // Analytics (Phase 10)
  const [analyticsData, setAnalyticsData] = useState({ trends: null, topSuppliers: null, categories: null, returnAnalysis: null, activityFeed: null, alerts: null, summary: null });

  // Audit Log (Phase 10)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('all');

  // Bulk operations (Phase 10)
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [bulkSellPrice, setBulkSellPrice] = useState('');
  const [selectedPayouts, setSelectedPayouts] = useState(new Set());

  // ─── DATA FETCHING ─────────────────────────────────────
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (activeTab === 'payouts') fetchPayouts(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'performance') fetchPerfOverview(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'returns') fetchAdminReturns(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'dashboard') fetchAnalytics(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'audit-log') fetchAuditLogs(); }, [activeTab]);

  const fetchAdminReturns = async () => {
    try {
      const r = await fetch('/api/supplier-returns?view=admin-list');
      const d = await r.json();
      if (d.success) { setAdminReturns(d.returns || []); setAdminReturnStats(d.stats || {}); }
    } catch (e) { console.error('Failed to load returns:', e); }
  };

  const handleAdminResolve = async (returnId, resolution, extra = {}) => {
    try {
      const r = await fetch('/api/supplier-returns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-resolve', returnId, resolution, adminNotes: extra.adminNotes || '', refundAmount: extra.refundAmount || 0 })
      });
      const d = await r.json();
      if (d.success) {
        showMessage('✅ ' + d.message);
        logAudit('resolve-return', 'return', returnId, '', { resolution, ...extra });
        fetchAdminReturns();
        setSelectedAdminReturn(null);
        setAdminResolution('');
        setAdminReturnNotes('');
        setAdminRefundAmount('');
      } else showMessage('❌ ' + (d.error || 'Action failed'));
    } catch (e) { showMessage('❌ Error resolving return'); }
  };

  const fetchAnalytics = async () => {
    try {
      const [trends, top, cats, returns, feed, alerts, summary] = await Promise.all([
        fetch('/api/supplier-analytics?view=revenue-trends').then(r => r.json()),
        fetch('/api/supplier-analytics?view=top-suppliers').then(r => r.json()),
        fetch('/api/supplier-analytics?view=category-performance').then(r => r.json()),
        fetch('/api/supplier-analytics?view=return-analysis').then(r => r.json()),
        fetch('/api/supplier-analytics?view=activity-feed').then(r => r.json()),
        fetch('/api/supplier-analytics?view=alerts').then(r => r.json()),
        fetch('/api/supplier-analytics?view=summary').then(r => r.json()),
      ]);
      setAnalyticsData({
        trends: trends.success ? trends.trends : [],
        topSuppliers: top.success ? top.topSuppliers : [],
        categories: cats.success ? cats.categories : [],
        returnAnalysis: returns.success ? returns : null,
        activityFeed: feed.success ? feed.activities : [],
        alerts: alerts.success ? alerts.alerts : [],
        summary: summary.success ? summary : null,
      });
    } catch (e) { console.error('Analytics fetch error:', e); }
  };

  const fetchAuditLogs = async () => {
    try {
      const r = await fetch('/api/supplier-audit-log?limit=200');
      const d = await r.json();
      if (d.success) setAuditLogs(d.logs || []);
    } catch (e) { console.error('Audit log fetch error:', e); }
  };

  const logAudit = async (action, entityType, entityId, entityLabel, details) => {
    try {
      await fetch('/api/supplier-audit-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entityType, entityId, entityLabel, details })
      });
    } catch { /* non-blocking */ }
  };

  const handleCsvExport = (type) => {
    window.open(`/api/supplier-analytics?view=export&type=${encodeURIComponent(type)}`, '_blank');
  };

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
      if (d.success) { setMessage(`Payout ${action.replace('mark-', '')} successfully`); logAudit(action, 'payout', payoutId, '', extra); fetchPayouts(); }
      else setMessage(d.error || 'Action failed');
    } catch (e) { setMessage('Error performing action'); }
  };

  const fetchPerfOverview = async () => {
    try {
      const r = await fetch('/api/supplier-management?view=performance-overview');
      const d = await r.json();
      if (r.ok) setPerfOverview(d);
    } catch (e) { console.error('Performance overview error:', e); }
  };

  const handleOverridePerformanceTier = async (supplierId, performanceTier) => {
    try {
      const r = await fetch('/api/supplier-management', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'override-performance-tier', supplierId, performanceTier })
      });
      const d = await r.json();
      if (d.success) { showMessage(d.message); logAudit('override-performance-tier', 'supplier', supplierId, '', { performanceTier }); fetchSuppliers(); fetchPerfOverview(); if (selectedSupplier) fetchSupplierDetail(supplierId); }
      else showMessage('❌ ' + (d.error || 'Failed'));
    } catch (e) { showMessage('❌ Error overriding tier'); }
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
        logAudit('approve-application', 'application', appId, data.supplier.companyName || '', { slaTier: appSlaTier });
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
        logAudit('reject-application', 'application', appId, '', { reason: rejectionReason });
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
        logAudit('approve-product', 'product', productId, '', { sellPrice: parseFloat(sellPrice), qualityRating });
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
        logAudit('reject-product', 'product', productId, '', { notes: productNotes });
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
      if (data.success) { showMessage(data.message); logAudit('toggle-active', 'supplier', supplierId, '', { newActive: !currentActive }); fetchSuppliers(); }
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
    container: {
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, rgba(220,0,0,0.18), transparent 28%), radial-gradient(circle at top right, rgba(96,165,250,0.12), transparent 24%), linear-gradient(180deg, #030712 0%, #08111f 48%, #020617 100%)',
      color: '#e5eefb',
      fontFamily: '"Manrope", "Segoe UI", sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, rgba(8,15,30,0.92) 0%, rgba(13,23,42,0.92) 48%, rgba(127,29,29,0.88) 100%)',
      padding: '1.1rem 0',
      borderBottom: '1px solid rgba(148,163,184,0.16)',
      boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(14px)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    },
    headerContent: { maxWidth: '1440px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { color: '#f8fafc', fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.04em', margin: 0 },
    nav: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
    navLink: {
      color: '#cbd5e1', textDecoration: 'none', fontSize: '0.83rem', fontWeight: '700', letterSpacing: '0.02em',
      padding: '0.65rem 0.95rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.16)',
      background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s ease'
    },
    main: { maxWidth: '1440px', margin: '0 auto', padding: '1.75rem 2rem 2.5rem' },
    tabs: {
      display: 'flex', gap: '0.55rem', marginBottom: '1.5rem', padding: '0.45rem',
      background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.14)',
      borderRadius: '18px', backdropFilter: 'blur(16px)', overflowX: 'auto'
    },
    tab: (active) => ({
      padding: '0.8rem 1.15rem', border: '1px solid transparent',
      background: active ? 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(127,29,29,0.92) 100%)' : 'transparent',
      color: active ? '#f8fafc' : '#94a3b8', fontSize: '0.82rem', fontWeight: active ? 800 : 600,
      cursor: 'pointer', transition: 'all 0.2s ease', borderRadius: '14px', whiteSpace: 'nowrap',
      boxShadow: active ? '0 12px 28px rgba(127,29,29,0.22)' : 'none'
    }),
    card: {
      background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.96) 100%)',
      borderRadius: '22px', padding: '1.5rem', boxShadow: '0 20px 45px rgba(0,0,0,0.22)',
      border: '1px solid rgba(148,163,184,0.14)', marginBottom: '1rem', backdropFilter: 'blur(14px)'
    },
    statCard: (color) => ({
      background: `linear-gradient(160deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.98) 72%, ${color}22 100%)`,
      borderRadius: '20px', padding: '1.25rem', boxShadow: '0 18px 34px rgba(0,0,0,0.18)',
      border: '1px solid rgba(148,163,184,0.12)', borderLeft: `3px solid ${color}`
    }),
    badge: (bg, color) => ({
      padding: '0.28rem 0.68rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-block',
      background: bg, color, letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.06)'
    }),
    btn: (bg, textColor) => ({
      padding: '0.62rem 1rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800,
      cursor: 'pointer', background: bg || 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', color: textColor || '#fff',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease', boxShadow: '0 10px 20px rgba(0,0,0,0.16)'
    }),
    btnOutline: {
      padding: '0.62rem 1rem', border: '1px solid rgba(148,163,184,0.22)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700,
      cursor: 'pointer', background: 'rgba(255,255,255,0.03)', color: '#dbe6f5', backdropFilter: 'blur(10px)'
    },
    input: {
      width: '100%', padding: '0.72rem 0.85rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.18)',
      fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(15,23,42,0.74)', color: '#f8fafc', outline: 'none'
    },
    label: { display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.42rem', letterSpacing: '0.05em', textTransform: 'uppercase' },
    msgBar: {
      position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000, padding: '0.9rem 1.3rem', borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(127,29,29,0.96) 100%)', color: '#fff',
      fontSize: '0.88rem', fontWeight: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: '520px',
      border: '1px solid rgba(248,250,252,0.08)', backdropFilter: 'blur(14px)'
    },
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

  const perfTierBadge = (tier) => {
    const m = { bronze: { bg: '#fef3c7', color: '#92400e', icon: '🥉' }, silver: { bg: '#f3f4f6', color: '#374151', icon: '🥈' }, gold: { bg: '#fef9c3', color: '#854d0e', icon: '🥇' }, platinum: { bg: '#ede9fe', color: '#5b21b6', icon: '💎' } };
    const c = m[tier] || m.bronze;
    return <span style={{ ...s.badge(c.bg, c.color) }}>{c.icon} {(tier || 'bronze').toUpperCase()}</span>;
  };

  // ─── RENDER: DASHBOARD ─────────────────────────────────
  const renderDashboard = () => {
    if (!stats) return <div style={s.card}>Loading stats...</div>;
    const { suppliers: ss, applications: aa, products: pp, orders: oo, performanceTiers: pt } = stats;
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
    const ad = analyticsData;

    return (
      <>
        {/* Alerts Banner */}
        {ad.alerts && ad.alerts.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {ad.alerts.map((a, i) => (
              <div key={i} style={{
                padding: '0.85rem 1rem', borderRadius: '16px', marginBottom: '0.55rem', fontSize: '0.82rem', fontWeight: 700,
                background: a.type === 'danger' ? 'rgba(239,68,68,0.12)' : a.type === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                color: a.type === 'danger' ? '#fecaca' : a.type === 'warning' ? '#fde68a' : '#bfdbfe',
                border: `1px solid ${a.type === 'danger' ? 'rgba(248,113,113,0.25)' : a.type === 'warning' ? 'rgba(245,158,11,0.28)' : 'rgba(96,165,250,0.28)'}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                {a.icon} {a.text}
              </div>
            ))}
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {cards.map((c, i) => (
            <div key={i} style={s.statCard(c.color)}>
              <div style={{ fontSize: '0.72rem', color: '#8ca0b9', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem', letterSpacing: '0.08em' }}>{c.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Quick Summary + Quick Actions row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Quick Summary */}
          {ad.summary && (
            <div style={s.card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Performance Snapshot</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.85rem', background: 'rgba(16,185,129,0.1)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.14)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>R {ad.summary.revenue30d.toFixed(0)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>30-Day Revenue</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.85rem', background: 'rgba(59,130,246,0.1)', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.14)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>R {ad.summary.revenue7d.toFixed(0)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>7-Day Revenue</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.85rem', background: 'rgba(245,158,11,0.1)', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.14)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{ad.summary.ordersToday}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Orders Today</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={s.card}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {parseInt(aa.pending_apps) > 0 && (
                <button onClick={() => setActiveTab('applications')} style={s.btn('linear-gradient(135deg, #92400e 0%, #f59e0b 100%)')}>
                  Applications · {aa.pending_apps}
                </button>
              )}
              {parseInt(pp.pending_products) > 0 && (
                <button onClick={() => setActiveTab('products')} style={s.btn('linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)')}>
                  Product Queue · {pp.pending_products}
                </button>
              )}
              <a href="/supplier-portal?admin=true" target="_blank" rel="noopener noreferrer" style={{ ...s.btn('rgba(255,255,255,0.06)'), textDecoration: 'none' }}>
                Portal Preview
              </a>
              <a href="/become-a-supplier" target="_blank" rel="noopener noreferrer" style={{ ...s.btn('linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(236,72,153,0.9) 100%)'), textDecoration: 'none' }}>
                Registration Form
              </a>
            </div>
          </div>
        </div>

        {/* Revenue Trend (30-day bar chart) */}
        {ad.trends && ad.trends.length > 0 && (
          <div style={s.card}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Revenue Curve</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px', padding: '0 0.25rem' }}>
              {(() => {
                const maxVal = Math.max(...ad.trends.map(t => parseFloat(t.gross_revenue || 0)), 1);
                return ad.trends.map((t, i) => {
                  const h = Math.max((parseFloat(t.gross_revenue || 0) / maxVal) * 100, 2);
                  return (
                    <div key={i} title={`${new Date(t.day).toLocaleDateString()}: R${parseFloat(t.gross_revenue || 0).toFixed(0)} (${t.order_count} orders)`}
                      style={{ flex: 1, minWidth: '4px', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg, #fb7185 0%, #dc2626 48%, #7f1d1d 100%)', height: `${h}%`, cursor: 'pointer', transition: 'opacity 0.2s, transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'} />
                  );
                });
              })()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
              <span>{ad.trends.length > 0 ? new Date(ad.trends[0].day).toLocaleDateString() : ''}</span>
              <span>{ad.trends.length > 0 ? new Date(ad.trends[ad.trends.length - 1].day).toLocaleDateString() : ''}</span>
            </div>
          </div>
        )}

        {/* Top Suppliers + Category Performance row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Top Suppliers */}
          {ad.topSuppliers && ad.topSuppliers.length > 0 && (
            <div style={s.card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Top Suppliers</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                      <th style={{ padding: '0.4rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>#</th>
                      <th style={{ padding: '0.4rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Supplier</th>
                      <th style={{ padding: '0.4rem', textAlign: 'right', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Revenue</th>
                      <th style={{ padding: '0.4rem', textAlign: 'right', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.topSuppliers.slice(0, 5).map((sup, i) => (
                      <tr key={sup.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                        <td style={{ padding: '0.4rem', fontWeight: 800, color: i < 3 ? '#fda4af' : '#8ca0b9' }}>{i + 1}</td>
                        <td style={{ padding: '0.4rem', color: '#f8fafc' }}>
                        {sup.company_name}
                        {sup.performance_tier && sup.performance_tier !== 'bronze' && (
                          <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem' }}>
                            {({ silver: '🥈', gold: '🥇', platinum: '💎' })[sup.performance_tier] || ''}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>R{parseFloat(sup.recent_revenue || 0).toFixed(0)}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', color: '#dbe6f5' }}>{sup.recent_orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Category Performance */}
          {ad.categories && ad.categories.length > 0 && (
            <div style={s.card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Category Performance</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                      <th style={{ padding: '0.4rem', textAlign: 'left', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ padding: '0.4rem', textAlign: 'right', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Products</th>
                      <th style={{ padding: '0.4rem', textAlign: 'right', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Orders</th>
                      <th style={{ padding: '0.4rem', textAlign: 'right', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.categories.map((cat, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                        <td style={{ padding: '0.4rem', fontWeight: 700, color: '#f8fafc' }}>{cat.category || 'Uncategorized'}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'right', color: '#dbe6f5' }}>{cat.product_count}</td>
                        <td style={{ padding: '0.4rem', textAlign: 'right', color: '#dbe6f5' }}>{cat.order_count}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>R{parseFloat(cat.gross_revenue || 0).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Feed + Return Analysis row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Activity Feed */}
          {ad.activityFeed && ad.activityFeed.length > 0 && (
            <div style={s.card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Activity Feed</h3>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {ad.activityFeed.slice(0, 12).map((a, i) => {
                  const typeIcon = { order: '🛒', application: '📋', return: '🔄' }[a.type] || '📌';
                  const typeColor = { order: '#3b82f6', application: '#f59e0b', return: '#ef4444' }[a.type] || '#6b7280';
                  return (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', padding: '0.65rem 0', borderBottom: '1px solid rgba(148,163,184,0.08)', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.9rem', marginTop: '0.1rem' }}>{typeIcon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: '#e5eefb' }}>{a.text}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.1rem' }}>{new Date(a.time).toLocaleString()}</div>
                      </div>
                      <span style={{ ...s.badge(typeColor + '15', typeColor), fontSize: '0.65rem' }}>{a.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Return Analysis */}
          {ad.returnAnalysis && (
            <div style={s.card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Return Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.7rem', background: 'rgba(239,68,68,0.1)', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.16)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{ad.returnAnalysis.returnRate}%</div>
                  <div style={{ fontSize: '0.7rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Return Rate</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.7rem', background: 'rgba(245,158,11,0.1)', borderRadius: '14px', border: '1px solid rgba(245,158,11,0.16)' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{ad.returnAnalysis.totals?.pending_count || 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending</div>
                </div>
              </div>
              {ad.returnAnalysis.byReason && ad.returnAnalysis.byReason.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8ca0b9', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Returns by Reason</div>
                  {ad.returnAnalysis.byReason.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.8rem', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                      <span style={{ color: '#e5eefb' }}>{({ defective: 'Defective', wrong_item: 'Wrong Item', not_as_described: 'Not As Described', damaged_in_transit: 'Damaged', size_issue: 'Size Issue', other: 'Other' })[r.reason] || r.reason}</span>
                      <span style={{ fontWeight: 700, color: '#8ca0b9' }}>{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pipeline + Tiers + CSV Export row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Application Pipeline */}
          <div style={s.card}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Application Pipeline</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Submitted', count: aa.pending_apps, color: '#f59e0b' },
                { label: 'Reviewing', count: aa.reviewing_apps, color: '#3b82f6' },
                { label: 'Approved', count: aa.approved_apps, color: '#10b981' },
                { label: 'Rejected', count: aa.rejected_apps, color: '#ef4444' },
              ].map((p, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '0.85rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: p.color }}>{p.count}</div>
                  <div style={{ fontSize: '0.7rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Tier Distribution */}
          {pt && (
            <div style={s.card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Performance Tiers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {[
                  { label: 'Bronze', count: pt.bronze || 0, color: '#cd7f32', icon: '🥉' },
                  { label: 'Silver', count: pt.silver || 0, color: '#9ca3af', icon: '🥈' },
                  { label: 'Gold', count: pt.gold || 0, color: '#eab308', icon: '🥇' },
                  { label: 'Platinum', count: pt.platinum || 0, color: '#8b5cf6', icon: '💎' },
                ].map((p, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '0.85rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
                    <div style={{ fontSize: '1.2rem' }}>{p.icon}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: p.color }}>{p.count}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8ca0b9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CSV Export Panel */}
        <div style={s.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem', color: '#f8fafc', letterSpacing: '-0.03em' }}>Export Center</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { type: 'orders', label: 'Orders', color: 'linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)' },
              { type: 'suppliers', label: 'Suppliers', color: 'linear-gradient(135deg, #047857 0%, #10b981 100%)' },
              { type: 'products', label: 'Products', color: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)' },
              { type: 'payouts', label: 'Payouts', color: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)' },
              { type: 'returns', label: 'Returns', color: 'linear-gradient(135deg, #b91c1c 0%, #f87171 100%)' },
            ].map(exp => (
              <button key={exp.type} onClick={() => handleCsvExport(exp.type)}
                style={{ ...s.btn(exp.color), fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
                {exp.label}
              </button>
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
                {['Company', 'Contact', 'SLA Tier', 'Perf. Tier', 'Products', 'Orders', 'Revenue', 'Status', 'Actions'].map(h => (
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
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {perfTierBadge(sup.performanceTier)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#374151' }}>Tier:</span>
                {perfTierBadge(sup.performanceTier)}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <select value={sup.performanceTier || 'bronze'} onChange={e => handleOverridePerformanceTier(sup.id, e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: '0.4rem' }}>Override</span>
              </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Awaiting Approval ({pending.length})
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={pending.length > 0 && pending.every(p => selectedProducts.has(p.id))}
                  onChange={e => {
                    const next = new Set(selectedProducts);
                    if (e.target.checked) pending.forEach(p => next.add(p.id));
                    else pending.forEach(p => next.delete(p.id));
                    setSelectedProducts(next);
                  }} />
                Select All
              </label>
            </div>

            {/* Bulk Approve Bar */}
            {selectedProducts.size > 0 && (
              <div style={{ ...s.card, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
                  {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>Sell Price (R):</label>
                  <input type="number" step="0.01" min="0.01" value={bulkSellPrice} onChange={e => setBulkSellPrice(e.target.value)}
                    placeholder="e.g. 299.00" style={{ ...s.input, width: '120px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} />
                </div>
                <button onClick={async () => {
                  if (!bulkSellPrice || parseFloat(bulkSellPrice) <= 0) { setMessage('Please set a sell price for bulk approve'); return; }
                  const ids = [...selectedProducts];
                  let ok = 0, fail = 0;
                  for (const pid of ids) {
                    try {
                      const res = await fetch('/api/supplier-management', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'approve-product', productId: pid, sellPrice: parseFloat(bulkSellPrice), qualityRating: 3 }),
                      });
                      if (res.ok) { ok++; logAudit('bulk-approve-product', 'product', pid, `Product #${pid}`, { sellPrice: bulkSellPrice }); }
                      else fail++;
                    } catch { fail++; }
                  }
                  setMessage(`Bulk approved: ${ok} succeeded, ${fail} failed`);
                  setSelectedProducts(new Set());
                  setBulkSellPrice('');
                  const r = await fetch('/api/supplier-management?view=pending-products');
                  if (r.ok) { const d = await r.json(); setPendingProducts(d.products || []); }
                }} style={{ ...s.btn('#10b981'), fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  ✅ Bulk Approve ({selectedProducts.size})
                </button>
                <button onClick={() => setSelectedProducts(new Set())} style={{ ...s.btnOutline, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Clear</button>
              </div>
            )}

            {pending.map(product => (
              <div key={product.id} style={{ ...s.card, borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={selectedProducts.has(product.id)}
                      onChange={e => {
                        const next = new Set(selectedProducts);
                        e.target.checked ? next.add(product.id) : next.delete(product.id);
                        setSelectedProducts(next);
                      }}
                      style={{ marginTop: '0.2rem' }} />
                    <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>{product.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      by {product.supplierName} • {product.category} • SKU: {product.supplierSku || 'N/A'}
                    </div>
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
        {/* Bulk Payout Actions */}
        {selectedPayouts.size > 0 && (
          <div style={{ ...s.card, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
              {selectedPayouts.size} payout{selectedPayouts.size > 1 ? 's' : ''} selected
            </span>
            <button onClick={async () => {
              const ids = [...selectedPayouts];
              let ok = 0, fail = 0;
              for (const pid of ids) {
                try {
                  const res = await fetch('/api/supplier-payouts', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark-processing', payoutId: pid }),
                  });
                  if (res.ok) { ok++; logAudit('bulk-mark-processing', 'payout', pid, `Payout #${pid}`, {}); }
                  else fail++;
                } catch { fail++; }
              }
              setMessage(`Bulk processing: ${ok} succeeded, ${fail} failed`);
              setSelectedPayouts(new Set());
              const r = await fetch('/api/supplier-payouts?action=admin-list');
              if (r.ok) { const d = await r.json(); setAdminPayouts(d.payouts || []); setAdminPayoutStats(d.stats || {}); }
            }} style={{ ...s.btn('#3b82f6'), fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              📋 Mark All Processing
            </button>
            <button onClick={async () => {
              const ids = [...selectedPayouts];
              let ok = 0, fail = 0;
              for (const pid of ids) {
                try {
                  const res = await fetch('/api/supplier-payouts', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark-paid', payoutId: pid, paymentMethod: 'eft', paymentReference: `BULK-${Date.now()}` }),
                  });
                  if (res.ok) { ok++; logAudit('bulk-mark-paid', 'payout', pid, `Payout #${pid}`, {}); }
                  else fail++;
                } catch { fail++; }
              }
              setMessage(`Bulk paid: ${ok} succeeded, ${fail} failed`);
              setSelectedPayouts(new Set());
              const r = await fetch('/api/supplier-payouts?action=admin-list');
              if (r.ok) { const d = await r.json(); setAdminPayouts(d.payouts || []); setAdminPayoutStats(d.stats || {}); }
            }} style={{ ...s.btn('#10b981'), fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              ✅ Mark All Paid
            </button>
            <button onClick={() => setSelectedPayouts(new Set())} style={{ ...s.btnOutline, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Clear</button>
          </div>
        )}

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
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    {(p.status === 'pending' || p.status === 'processing') && (
                      <input type="checkbox" checked={selectedPayouts.has(p.id)}
                        onChange={e => {
                          const next = new Set(selectedPayouts);
                          e.target.checked ? next.add(p.id) : next.delete(p.id);
                          setSelectedPayouts(next);
                        }}
                        style={{ marginTop: '0.2rem' }} />
                    )}
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{p.companyName}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
                        {new Date(p.periodStart).toLocaleDateString()} \u2014 {new Date(p.periodEnd).toLocaleDateString()} · {p.orderCount} orders
                      </div>
                    </div>
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: pb[p.status], color: pc[p.status] }}>
                    {p.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <div>Earnings: <strong>R {parseFloat(p.supplierEarnings || 0).toFixed(2)}</strong></div>
                  {p.slaPenalties > 0 && <div style={{ color: '#ef4444' }}>Penalties: -R {parseFloat(p.slaPenalties || 0).toFixed(2)}</div>}
                  <div>Net: <strong style={{ color: '#10b981' }}>R {parseFloat(p.netPayout || 0).toFixed(2)}</strong></div>
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

  // ─── RENDER: PERFORMANCE ────────────────────────────────
  const renderPerformance = () => {
    if (!perfOverview) return <div style={s.card}>Loading performance data...</div>;
    const { rankings, recentChanges } = perfOverview;

    const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    const sorted = [...rankings].sort((a, b) => (tierOrder[a.performanceTier] || 3) - (tierOrder[b.performanceTier] || 3) || b.rating - a.rating);

    return (
      <>
        {/* Rankings Table */}
        <div style={s.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Supplier Performance Rankings</h3>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No active suppliers to rank</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    {['#', 'Supplier', 'Tier', 'Rating', 'SLA Compliance', 'Sales', 'Revenue', 'Prod. Quality', 'Featured', 'Override'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#9ca3af' }}>{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <button onClick={() => fetchSupplierDetail(r.id)} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}>
                          {r.companyName}
                        </button>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{perfTierBadge(r.performanceTier)}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.rating > 0 ? `${r.rating.toFixed(1)} ⭐` : '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ fontWeight: 600, color: r.slaComplianceRate >= 95 ? '#10b981' : r.slaComplianceRate >= 85 ? '#f59e0b' : '#ef4444' }}>
                          {r.slaComplianceRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{r.totalSales}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>R {r.totalRevenue.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{r.avgProductQuality > 0 ? `${r.avgProductQuality.toFixed(1)}/5` : '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{r.featured ? <span style={s.badge('#d1fae5', '#065f46')}>YES</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <select value={r.performanceTier || 'bronze'} onChange={e => handleOverridePerformanceTier(r.id, e.target.value)}
                          style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <option value="bronze">Bronze</option>
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                          <option value="platinum">Platinum</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Tier Changes */}
        <div style={s.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Recent Tier Changes</h3>
          {recentChanges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No tier changes yet — performance evaluation runs daily</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {recentChanges.map(c => {
                const isUp = ['silver', 'gold', 'platinum'].indexOf(c.newTier) > ['silver', 'gold', 'platinum'].indexOf(c.oldTier);
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', border: `1px solid ${isUp ? '#d1fae5' : '#fee2e2'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isUp ? '📈' : '📉'}</span>
                      <div>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{c.companyName}</span>
                        <span style={{ margin: '0 0.5rem', color: '#9ca3af' }}>
                          {(c.oldTier || 'bronze').toUpperCase()} → {(c.newTier || 'bronze').toUpperCase()}
                        </span>
                        {c.reason === 'admin_override' && <span style={s.badge('#dbeafe', '#1e40af')}>MANUAL</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
                      {c.score > 0 && <span>Score: {c.score.toFixed(1)}</span>}
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tier Thresholds Reference */}
        <div style={s.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: '#111827' }}>Tier Qualification Criteria</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Tier', 'Min Score', 'Min Rating', 'Min SLA Compliance', 'Min Sales', 'Auto-Featured'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { tier: 'Platinum', icon: '💎', score: 90, rating: 4.5, compliance: '97%', sales: 100, featured: 'Yes' },
                { tier: 'Gold', icon: '🥇', score: 75, rating: 4.0, compliance: '92%', sales: 50, featured: 'Yes' },
                { tier: 'Silver', icon: '🥈', score: 55, rating: 3.5, compliance: '85%', sales: 10, featured: 'No' },
                { tier: 'Bronze', icon: '🥉', score: 0, rating: '—', compliance: '—', sales: '—', featured: 'No' },
              ].map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{t.icon} {t.tier}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{t.score}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{t.rating}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{t.compliance}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{t.sales}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{t.featured === 'Yes' ? <span style={s.badge('#d1fae5', '#065f46')}>YES</span> : <span style={{ color: '#9ca3af' }}>No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
            Score = Rating (30%) + SLA Compliance (35%) + Sales Volume (20%) + Product Quality (15%). Suppliers must meet <strong>all</strong> criteria to qualify for a tier. Evaluation runs daily.
          </div>
        </div>
      </>
    );
  };

  // ─── RETURNS & DISPUTES TAB ─────────────────────────────
  const returnStatusColors = { requested: '#f59e0b', approved: '#3b82f6', rejected: '#ef4444', refunded: '#22c55e', replaced: '#8b5cf6', closed: '#6b7280', pending: '#9ca3af' };
  const returnReasonLabels = { defective: 'Defective', wrong_item: 'Wrong Item', not_as_described: 'Not As Described', damaged_in_transit: 'Damaged in Transit', size_issue: 'Size Issue', other: 'Other' };

  const renderReturns = () => {
    const filtered = adminReturnFilter === 'all' ? adminReturns
      : adminReturnFilter === 'disputes' ? adminReturns.filter(r => r.disputeStatus === 'open')
      : adminReturns.filter(r => r.returnStatus === adminReturnFilter);

    // Detail view
    if (selectedAdminReturn) {
      const r = selectedAdminReturn;
      const isOverdue = r.returnStatus === 'requested' && r.slaDeadline && new Date(r.slaDeadline) < new Date();
      return (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Return — Order {r.orderNumber}</h2>
            <button onClick={() => { setSelectedAdminReturn(null); setAdminResolution(''); setAdminReturnNotes(''); setAdminRefundAmount(''); }} style={s.btn('#e5e7eb', '#374151')}>← Back</button>
          </div>
          <div style={s.card}>
            {r.disputeStatus === 'open' && (
              <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '1rem' }}>
                <strong style={{ color: '#991b1b' }}>⚡ DISPUTE OPEN</strong>
                {r.disputeReason && <span style={{ color: '#7f1d1d', marginLeft: '0.5rem', fontSize: '0.85rem' }}>— {r.disputeReason}</span>}
              </div>
            )}
            {isOverdue && (
              <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '1rem' }}>
                <strong style={{ color: '#92400e' }}>⚠️ Supplier response overdue</strong>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Customer</div>
                <div style={{ fontWeight: 600 }}>{r.customerName}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{r.customerEmail}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Supplier</div>
                <div style={{ fontWeight: 600 }}>{r.supplierName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Status</div>
                <span style={s.badge((returnStatusColors[r.returnStatus] || '#6b7280') + '20', returnStatusColors[r.returnStatus] || '#6b7280')}>{(r.returnStatus || 'unknown').toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Reason</div>
                <div style={{ fontWeight: 600 }}>{returnReasonLabels[r.reason] || r.reason}</div>
                {r.reasonDetail && <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.2rem' }}>{r.reasonDetail}</div>}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Refund Amount</div>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>R{parseFloat(r.refundAmount || 0).toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Requested</div>
                <div>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {r.supplierResponse && (
              <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Supplier Response</div>
                <div>{r.supplierResponse}</div>
                {r.supplierRespondedAt && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{new Date(r.supplierRespondedAt).toLocaleString()}</div>}
              </div>
            )}

            {r.resolution && (
              <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Admin Resolution</div>
                <div style={{ fontWeight: 600 }}>{r.resolution.replace(/_/g, ' ').toUpperCase()}</div>
                {r.adminNotes && <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>{r.adminNotes}</div>}
              </div>
            )}

            {/* Items */}
            {r.items && r.items.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Items</div>
                {r.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '6px', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                    <span>{item.name} × {item.quantity}{item.selectedSize ? ` (${item.selectedSize})` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Admin resolution form */}
            {!r.resolution && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Resolve This Return</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.3rem' }}>Resolution</label>
                    <select value={adminResolution} onChange={e => setAdminResolution(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <option value="">Select resolution...</option>
                      <option value="refund_full">Full Refund</option>
                      <option value="refund_partial">Partial Refund</option>
                      <option value="replace">Replace Item</option>
                      <option value="reject">Reject Return</option>
                    </select>
                  </div>
                  {adminResolution === 'refund_partial' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.3rem' }}>Refund Amount (R)</label>
                      <input type="number" step="0.01" min="0" value={adminRefundAmount} onChange={e => setAdminRefundAmount(e.target.value)}
                        placeholder="0.00" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.3rem' }}>Admin Notes</label>
                  <textarea value={adminReturnNotes} onChange={e => setAdminReturnNotes(e.target.value)}
                    placeholder="Add notes about this resolution..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button
                  onClick={() => { if (!adminResolution) { showMessage('Select a resolution'); return; } handleAdminResolve(r.id, adminResolution, { adminNotes: adminReturnNotes, refundAmount: adminRefundAmount }); }}
                  style={s.btn('#dc2626', '#fff')}>
                  Resolve Return
                </button>
              </div>
            )}
          </div>
        </>
      );
    }

    // List view
    return (
      <>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>🔄 Returns & Disputes</h2>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', count: adminReturnStats.total || 0, color: '#111827' },
            { label: 'Pending', count: adminReturnStats.requested || 0, color: '#f59e0b' },
            { label: 'Approved', count: adminReturnStats.approved || 0, color: '#3b82f6' },
            { label: 'Rejected', count: adminReturnStats.rejected || 0, color: '#ef4444' },
            { label: 'Refunded', count: adminReturnStats.refunded || 0, color: '#22c55e' },
            { label: 'Disputes', count: adminReturnStats.openDisputes || 0, color: '#dc2626' },
          ].map(st => (
            <div key={st.label} style={s.card}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>{st.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: st.color }}>{st.count}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All' }, { key: 'disputes', label: '⚡ Disputes' }, { key: 'requested', label: 'Pending' },
            { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' }, { key: 'refunded', label: 'Refunded' }
          ].map(f => (
            <button key={f.key} onClick={() => setAdminReturnFilter(f.key)}
              style={{
                padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                border: adminReturnFilter === f.key ? '2px solid #dc2626' : '1px solid #d1d5db',
                background: adminReturnFilter === f.key ? '#fef2f2' : '#fff',
                color: adminReturnFilter === f.key ? '#dc2626' : '#6b7280',
                fontWeight: adminReturnFilter === f.key ? 600 : 400
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Returns list */}
        {filtered.length === 0 ? (
          <div style={{ ...s.card, textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
            <div style={{ color: '#6b7280' }}>{adminReturns.length === 0 ? 'No returns have been submitted yet.' : 'No returns match this filter.'}</div>
          </div>
        ) : (
          <div style={s.card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {['Order', 'Customer', 'Supplier', 'Reason', 'Amount', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isOverdue = r.returnStatus === 'requested' && r.slaDeadline && new Date(r.slaDeadline) < new Date();
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>
                        {r.orderNumber}
                        {isOverdue && <span style={{ color: '#ef4444', marginLeft: '0.3rem', fontSize: '0.75rem' }}>⚠️</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{r.customerName}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{r.supplierName}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{returnReasonLabels[r.reason] || r.reason}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#f59e0b' }}>R{parseFloat(r.refundAmount || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={s.badge((returnStatusColors[r.returnStatus] || '#6b7280') + '20', returnStatusColors[r.returnStatus] || '#6b7280')}>
                          {(r.returnStatus || 'unknown').toUpperCase()}
                        </span>
                        {r.disputeStatus === 'open' && <span style={{ ...s.badge('#fef2f220', '#dc2626'), marginLeft: '0.3rem' }}>DISPUTED</span>}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#6b7280' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <button onClick={() => setSelectedAdminReturn(r)} style={{ ...s.btn('#eff6ff', '#2563eb'), padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  // ─── RENDER: AUDIT LOG ──────────────────────────────────
  const renderAuditLog = () => {
    const entityTypes = ['all', 'application', 'supplier', 'product', 'order', 'payout', 'return'];
    const filtered = auditFilter === 'all' ? auditLogs : auditLogs.filter(l => l.entity_type === auditFilter);

    return (
      <>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {entityTypes.map(t => (
            <button key={t} onClick={() => { setAuditFilter(t); }}
              style={{ ...s.tab(auditFilter === t), fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              {t === 'all' ? '📋 All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button onClick={fetchAuditLogs} style={{ ...s.btn('#374151'), fontSize: '0.75rem', padding: '0.4rem 0.75rem', marginLeft: 'auto' }}>
            🔄 Refresh
          </button>
        </div>

        <div style={s.card}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No audit log entries found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Time</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Entity</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const actionColors = {
                    'approve-application': '#10b981', 'reject-application': '#ef4444',
                    'approve-product': '#10b981', 'reject-product': '#ef4444',
                    'toggle-active': '#3b82f6', 'override-performance-tier': '#8b5cf6',
                    'mark-payout-processing': '#f59e0b', 'mark-payout-paid': '#10b981',
                    'reject-payout': '#ef4444', 'resolve-return': '#3b82f6',
                  };
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap', color: '#6b7280' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={s.badge((actionColors[log.admin_action] || '#6b7280') + '20', actionColors[log.admin_action] || '#6b7280')}>
                          {log.admin_action}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ color: '#374151', fontWeight: 600 }}>{log.entity_type}</span>
                        {log.entity_label && <span style={{ color: '#9ca3af', marginLeft: '0.3rem' }}>({log.entity_label})</span>}
                      </td>
                      <td style={{ padding: '0.5rem', color: '#6b7280', fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  // ─── MAIN RENDER ───────────────────────────────────────
  const tabs = [
    { key: 'dashboard', label: 'Overview' },
    { key: 'applications', label: `Applications${applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length > 0 ? ` (${applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length})` : ''}` },
    { key: 'suppliers', label: `Suppliers (${suppliers.length})` },
    { key: 'products', label: `Product Queue${pendingProducts.filter(p => p.approvalStatus === 'pending').length > 0 ? ` (${pendingProducts.filter(p => p.approvalStatus === 'pending').length})` : ''}` },
    { key: 'payouts', label: `Payouts${adminPayoutStats.pending > 0 ? ` (${adminPayoutStats.pending})` : ''}` },
    { key: 'returns', label: `Returns${adminReturnStats.openDisputes > 0 ? ` (${adminReturnStats.openDisputes} disputes)` : adminReturnStats.requested > 0 ? ` (${adminReturnStats.requested})` : ''}` },
    { key: 'performance', label: 'Performance' },
    { key: 'audit-log', label: 'Audit Trail' },
  ];

  return (
    <>
      <Head>
        <title>Supplier Management - Admin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div style={s.container} className="supplier-admin-theme">
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerContent}>
            <h1 style={s.logo}>Supplier Management</h1>
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
              {activeTab === 'returns' && renderReturns()}
              {activeTab === 'performance' && renderPerformance()}
              {activeTab === 'audit-log' && renderAuditLog()}
              {activeTab === 'supplier-detail' && renderSupplierDetail()}
            </>
          )}
        </main>
      </div>
      <style jsx global>{`
        .supplier-admin-theme {
          color-scheme: dark;
        }
        .supplier-admin-theme * {
          scrollbar-width: thin;
          scrollbar-color: rgba(248,250,252,0.18) transparent;
        }
        .supplier-admin-theme ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .supplier-admin-theme ::-webkit-scrollbar-track {
          background: transparent;
        }
        .supplier-admin-theme ::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.22);
          border-radius: 999px;
        }
        .supplier-admin-theme button:hover,
        .supplier-admin-theme a:hover {
          transform: translateY(-1px);
        }
        .supplier-admin-theme input,
        .supplier-admin-theme select,
        .supplier-admin-theme textarea {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
        }
        .supplier-admin-theme input:focus,
        .supplier-admin-theme select:focus,
        .supplier-admin-theme textarea:focus {
          border-color: rgba(248,113,113,0.45) !important;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.18);
        }
        .supplier-admin-theme table {
          color: #e5eefb;
        }
      `}</style>
    </>
  );
}
