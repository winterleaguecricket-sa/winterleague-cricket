import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

export default function SupplierPortal() {
  // ─── AUTH STATE ──────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [supplier, setSupplier] = useState(null);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  // ─── APP STATE ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ products: 0, orders: 0, earnings: 0, pendingPayouts: 0, avgRating: 0, slaTier: 'standard' });
  const [applications, setApplications] = useState([]);

  // ─── PASSWORD CHANGE ─────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState('');

  // ─── AUTH LOGIC ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdminMode(true);
      setSupplier({ id: 'admin', companyName: 'Admin Preview', email: 'admin@winterleaguecricket.co.za', slaTier: 'standard', categories: [] });
      return;
    }
    const savedId = localStorage.getItem('supplierId');
    if (savedId) {
      fetch(`/api/supplier-auth?id=${encodeURIComponent(savedId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.supplier) setSupplier(data.supplier);
          else localStorage.removeItem('supplierId');
        })
        .catch(() => localStorage.removeItem('supplierId'));
    }
  }, []);

  // Fetch data once authenticated
  useEffect(() => {
    if (supplier && !isAdminMode) {
      fetchStats();
    }
    if (isAdminMode) {
      fetchApplications();
    }
  }, [supplier, isAdminMode]);

  const fetchStats = async () => {
    // Stats will be populated when supplier data APIs are built in later phases
    setLoading(false);
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/supplier-applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/supplier-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      if (data.supplier) {
        setSupplier(data.supplier);
        localStorage.setItem('supplierId', data.supplier.id);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setSupplier(null);
    setEmail('');
    setPassword('');
    setActiveTab('dashboard');
    localStorage.removeItem('supplierId');
    if (isAdminMode) setIsAdminMode(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage('');
    if (newPw !== confirmPw) { setPwMessage('Passwords do not match'); return; }
    if (newPw.length < 6) { setPwMessage('Password must be at least 6 characters'); return; }
    try {
      const res = await fetch('/api/supplier-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', supplierId: supplier.id, currentPassword: currentPw, newPassword: newPw })
      });
      const data = await res.json();
      if (data.success) {
        setPwMessage('Password updated successfully!');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } else {
        setPwMessage(data.error || 'Failed to update password');
      }
    } catch (err) {
      setPwMessage('Error updating password');
    }
  };

  // ─── PRODUCTS STATE (must be before conditional return) ──
  const [products, setProducts] = useState([]);
  const [productCounts, setProductCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [productLoading, setProductLoading] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [productFilter, setProductFilter] = useState('all');
  const [productForm, setProductForm] = useState({
    name: '', category: '', supplierCost: '', description: '', stock: '', sizes: '',
    supplierSku: '', lowStockThreshold: '5', images: []
  });
  const [productImagePreviews, setProductImagePreviews] = useState([]);

  const fetchProducts = useCallback(async () => {
    if (!supplier?.id) return;
    setProductLoading(true);
    try {
      const r = await fetch(`/api/supplier-products?supplierId=${supplier.id}`);
      const d = await r.json();
      if (d.success) { setProducts(d.products || []); setProductCounts(d.counts || {}); }
    } catch (e) { console.error('Failed to load products:', e); }
    setProductLoading(false);
  }, [supplier]);

  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch('/api/categories');
      const d = await r.json();
      if (d.success) setCategories(d.categories || []);
    } catch (e) { console.error('Failed to load categories:', e); }
  }, []);

  useEffect(() => {
    if (supplier && activeTab === 'products') {
      fetchProducts();
      if (categories.length === 0) fetchCategories();
    }
  }, [supplier, activeTab, fetchProducts, fetchCategories, categories.length]);

  // ─── ORDERS STATE (must be before conditional return) ───
  const [supplierOrders, setSupplierOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({ total: 0, pending: 0, acknowledged: 0, shipped: 0, delivered: 0, totalEarnings: 0 });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shipForm, setShipForm] = useState({ trackingNumber: '', courier: '' });

  // ─── PAYOUTS STATE (must be before conditional return) ──
  const [supplierPayouts, setSupplierPayouts] = useState([]);
  const [payoutStats, setPayoutStats] = useState({ total: 0, pending: 0, processing: 0, paid: 0, failed: 0, totalEarnings: 0, pendingAmount: 0, paidAmount: 0, unpaidAmount: 0, unpaidOrders: 0 });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [selectedPayout, setSelectedPayout] = useState(null);

  // ─── RETURNS STATE (must be before conditional return) ──
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [returnStats, setReturnStats] = useState({ total: 0, requested: 0, approved: 0, rejected: 0, refunded: 0 });
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnFilter, setReturnFilter] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnResponseText, setReturnResponseText] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnReasonDetail, setReturnReasonDetail] = useState('');

  const fetchPayouts = useCallback(async () => {
    if (!supplier?.id) return;
    setPayoutLoading(true);
    try {
      const r = await fetch(`/api/supplier-payouts?supplierId=${supplier.id}`);
      const d = await r.json();
      if (d.success) { setSupplierPayouts(d.payouts || []); setPayoutStats(d.stats || {}); }
    } catch (e) { console.error('Failed to load payouts:', e); }
    setPayoutLoading(false);
  }, [supplier]);

  useEffect(() => {
    if (supplier && activeTab === 'financials') fetchPayouts();
  }, [supplier, activeTab, fetchPayouts]);

  const fetchReturns = useCallback(async () => {
    if (!supplier?.id) return;
    setReturnLoading(true);
    try {
      const r = await fetch(`/api/supplier-returns?supplierId=${supplier.id}`);
      const d = await r.json();
      if (d.success) { setSupplierReturns(d.returns || []); setReturnStats(d.stats || {}); }
    } catch (e) { console.error('Failed to load returns:', e); }
    setReturnLoading(false);
  }, [supplier]);

  useEffect(() => {
    if (supplier && activeTab === 'returns') fetchReturns();
  }, [supplier, activeTab, fetchReturns]);

  const fetchOrders = useCallback(async () => {
    if (!supplier?.id) return;
    setOrderLoading(true);
    try {
      const r = await fetch(`/api/supplier-orders?supplierId=${supplier.id}`);
      const d = await r.json();
      if (d.success) { setSupplierOrders(d.orders || []); setOrderStats(d.stats || {}); }
    } catch (e) { console.error('Failed to load orders:', e); }
    setOrderLoading(false);
  }, [supplier]);

  useEffect(() => {
    if (supplier && activeTab === 'orders') fetchOrders();
  }, [supplier, activeTab, fetchOrders]);

  // ─── DASHBOARD CARD HOVER ────────────────────────────────
  const applyHover = (e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
    e.currentTarget.style.boxShadow = '0 14px 32px rgba(220,0,0,0.35), 0 0 22px rgba(255,255,255,0.25)';
    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(3,7,18,0.98) 55%, rgba(220,0,0,0.35) 100%)';
  };
  const removeHover = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
    e.currentTarget.style.background = '#111827';
  };

  // ─── LOGIN SCREEN ────────────────────────────────────────
  if (!supplier) {
    return (
      <>
        <Head><title>Supplier Portal - Winter League Cricket</title></Head>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)', padding: '2rem'
        }}>
          <div style={{
            background: 'white', padding: '2.5rem', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)', width: '100%', maxWidth: '450px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2rem', fontWeight: '900',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem'
              }}>📦 Supplier Portal</h1>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Access your supplier dashboard</p>
            </div>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required autoComplete="email"
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', color: '#111827', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password"
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '0.95rem', color: '#111827', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              {error && (
                <div style={{ padding: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>
                  {error}
                </div>
              )}
              <button type="submit" style={{
                width: '100%', padding: '0.875rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '1rem', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.2s'
              }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >Login to Portal</button>
            </form>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.8rem', color: '#6b7280' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>Want to become a supplier?</strong>
              <p style={{ margin: 0 }}>
                <a href="/become-a-supplier" style={{ color: '#dc0000', textDecoration: 'none', fontWeight: 600 }}>Apply here</a> to register as a cricket equipment supplier on Winter League Cricket.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── TABS CONFIG ─────────────────────────────────────────
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'products', label: 'Products', icon: '📦' },
    { key: 'orders', label: 'Orders', icon: '🛒' },
    { key: 'returns', label: 'Returns', icon: '🔄' },
    { key: 'financials', label: 'Financials', icon: '💰' },
    { key: 'reviews', label: 'Reviews', icon: '⭐' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  if (isAdminMode) {
    tabs.push({ key: 'applications', label: 'Applications', icon: '📋' });
  }

  // ─── DASHBOARD TAB ──────────────────────────────────────
  const tierColors = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };
  const tierIcons = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

  const renderDashboard = () => {
    const perfTier = (supplier.performanceTier || 'bronze');
    const cards = [
      { label: 'Active Products', value: stats.products, icon: '📦', color: '#60a5fa' },
      { label: 'Total Orders', value: stats.orders, icon: '🛒', color: '#34d399' },
      { label: 'Total Earnings', value: `R ${stats.earnings.toFixed(2)}`, icon: '💰', color: '#fbbf24' },
      { label: 'Pending Payouts', value: `R ${stats.pendingPayouts.toFixed(2)}`, icon: '🏦', color: '#a78bfa' },
      { label: 'Avg Rating', value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ⭐` : 'No reviews', icon: '⭐', color: '#f472b6' },
      { label: 'SLA Tier', value: (supplier.slaTier || 'standard').charAt(0).toUpperCase() + (supplier.slaTier || 'standard').slice(1), icon: '📋', color: '#38bdf8' },
    ];

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {cards.map((card, i) => (
            <div key={i}
              onMouseEnter={applyHover} onMouseLeave={removeHover}
              style={{
                background: '#111827', borderRadius: '14px', padding: '1.25rem',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.3s ease', cursor: 'default', position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{card.icon}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Performance Tier Card */}
        {!isAdminMode && (
          <div style={{
            background: '#111827', borderRadius: '14px', padding: '1.5rem',
            border: `1px solid ${tierColors[perfTier]}40`, marginBottom: '1.5rem',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
              background: `radial-gradient(circle at top right, ${tierColors[perfTier]}25, transparent 70%)`,
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '2.5rem' }}>{tierIcons[perfTier]}</span>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                  {perfTier.charAt(0).toUpperCase() + perfTier.slice(1)} Tier
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Performance Level</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Rating', value: parseFloat(supplier.rating || 0).toFixed(1), suffix: '/5', color: '#f472b6' },
                { label: 'SLA Compliance', value: parseFloat(supplier.slaComplianceRate || 100).toFixed(0), suffix: '%', color: '#34d399' },
                { label: 'Total Sales', value: supplier.totalSales || 0, suffix: '', color: '#60a5fa' },
                { label: 'Revenue', value: `R ${parseFloat(supplier.totalRevenue || 0).toFixed(0)}`, suffix: '', color: '#fbbf24' },
              ].map((m, i) => (
                <div key={i} style={{
                  padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{m.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: m.color }}>{m.value}{m.suffix}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Tier Progression</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {['bronze', 'silver', 'gold', 'platinum'].map((t) => (
                  <div key={t} style={{
                    flex: 1, height: '6px', borderRadius: '3px',
                    background: ['bronze', 'silver', 'gold', 'platinum'].indexOf(t) <= ['bronze', 'silver', 'gold', 'platinum'].indexOf(perfTier)
                      ? tierColors[t] : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s'
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                {['Bronze', 'Silver', 'Gold', 'Platinum'].map((t) => (
                  <span key={t} style={{ fontSize: '0.6rem', color: '#64748b' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding Checklist */}
        {!isAdminMode && (
          <div style={{
            background: '#111827', borderRadius: '14px', padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem'
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>🚀 Getting Started Checklist</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[
                { label: 'Account Approved', done: true },
                { label: 'Add Your First Product', done: stats.products > 0 },
                { label: 'Receive First Order', done: stats.orders > 0 },
                { label: 'Complete Banking Details', done: false },
                { label: 'First Payout Received', done: false },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  background: item.done ? 'rgba(22,163,74,0.08)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '8px', border: `1px solid ${item.done ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.05)'}`
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.done ? '✅' : '⬜'}</span>
                  <span style={{ color: item.done ? '#4ade80' : '#94a3b8', fontSize: '0.9rem', fontWeight: item.done ? 600 : 400 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLA Status */}
        <div style={{
          background: '#111827', borderRadius: '14px', padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>📋 SLA Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(96,165,250,0.08)', borderRadius: '10px', border: '1px solid rgba(96,165,250,0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Order Response</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#60a5fa' }}>{supplier.slaTier === 'premium' ? '12 hours' : '24 hours'}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(52,211,153,0.08)', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Dispatch Time</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399' }}>{supplier.slaTier === 'premium' ? '2 days' : '3 days'}</div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─── PRODUCTS RENDER HELPERS ────────────────────────────

  const resetProductForm = () => {
    setProductForm({ name: '', category: '', supplierCost: '', description: '', stock: '', sizes: '', supplierSku: '', lowStockThreshold: '5', images: [] });
    setProductImagePreviews([]);
    setEditingProduct(null);
    setShowAddProduct(false);
  };

  const handleProductImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    const previews = [];
    const base64List = [];
    let loaded = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Compress via canvas
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 1200, maxH = 1200;
          let w = img.width, h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio); h = Math.round(h * ratio);
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          base64List.push(dataUrl);
          previews.push(dataUrl);
          loaded++;
          if (loaded === files.length) {
            setProductImagePreviews(previews);
            setProductForm(prev => ({ ...prev, images: base64List }));
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProductSubmit = async () => {
    const { name, category, supplierCost } = productForm;
    if (!name.trim() || !category || !supplierCost) {
      alert('Please fill in name, category, and cost price');
      return;
    }
    setProductLoading(true);
    try {
      const body = {
        action: editingProduct ? 'update' : 'create',
        supplierId: supplier.id,
        name: productForm.name.trim(),
        category: productForm.category,
        supplierCost: parseFloat(productForm.supplierCost),
        description: productForm.description.trim(),
        stock: parseInt(productForm.stock) || 0,
        sizes: productForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
        supplierSku: productForm.supplierSku.trim(),
        lowStockThreshold: parseInt(productForm.lowStockThreshold) || 5,
        images: productForm.images
      };
      if (editingProduct) body.productId = editingProduct.id;

      const r = await fetch('/api/supplier-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) {
        resetProductForm();
        fetchProducts();
      } else { alert(d.error || 'Failed to save product'); }
    } catch (e) { alert('Error saving product'); }
    setProductLoading(false);
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Remove this product?')) return;
    try {
      const r = await fetch('/api/supplier-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', supplierId: supplier.id, productId }) });
      const d = await r.json();
      if (d.success) fetchProducts();
      else alert(d.error || 'Failed to delete');
    } catch (e) { alert('Error deleting product'); }
  };

  const handleResubmitProduct = async (productId) => {
    try {
      const r = await fetch('/api/supplier-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resubmit', supplierId: supplier.id, productId }) });
      const d = await r.json();
      if (d.success) fetchProducts();
      else alert(d.error || 'Failed to resubmit');
    } catch (e) { alert('Error resubmitting product'); }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name, category: product.category, supplierCost: String(product.supplierCost),
      description: product.description, stock: String(product.stock),
      sizes: (product.sizes || []).join(', '), supplierSku: product.supplierSku || '',
      lowStockThreshold: String(product.lowStockThreshold || 5), images: []
    });
    setProductImagePreviews(product.images || []);
    setShowAddProduct(true);
  };

  // ─── PRODUCTS TAB ──────────────────────────────────────
  const statusColors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
  const statusBg = { pending: 'rgba(245,158,11,0.08)', approved: 'rgba(16,185,129,0.08)', rejected: 'rgba(239,68,68,0.08)' };

  const renderProducts = () => {
    const filtered = productFilter === 'all' ? products : products.filter(p => p.approvalStatus === productFilter);

    // Add/Edit form
    if (showAddProduct) {
      return (
        <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>
              {editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}
            </h3>
            <button onClick={resetProductForm}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Product Name *</label>
              <input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                placeholder="e.g. Pro Cricket Bat" />
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Category *</label>
              <select value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem' }}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id || c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Your Cost Price (R) *</label>
              <input type="number" min="0" step="0.01" value={productForm.supplierCost}
                onChange={e => setProductForm(p => ({ ...p, supplierCost: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                placeholder="0.00" />
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                Admin will set the final selling price on approval
              </div>
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Stock Quantity</label>
              <input type="number" min="0" value={productForm.stock}
                onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                placeholder="0" />
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Sizes (comma-separated)</label>
              <input value={productForm.sizes} onChange={e => setProductForm(p => ({ ...p, sizes: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                placeholder="S, M, L, XL, XXL" />
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Your SKU</label>
              <input value={productForm.supplierSku} onChange={e => setProductForm(p => ({ ...p, supplierSku: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                placeholder="Optional internal SKU" />
            </div>

            <div>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Low Stock Alert</label>
              <input type="number" min="0" value={productForm.lowStockThreshold}
                onChange={e => setProductForm(p => ({ ...p, lowStockThreshold: e.target.value }))}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                placeholder="5" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Description</label>
              <textarea value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '0.7rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                placeholder="Product description..." />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>Product Images (up to 5)</label>
              <input type="file" accept="image/*" multiple onChange={handleProductImageChange}
                style={{ color: '#94a3b8', fontSize: '0.85rem' }} />
              {productImagePreviews.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {productImagePreviews.map((src, i) => (
                    <img key={i} src={src} alt={`Preview ${i + 1}`}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {editingProduct && editingProduct.approvalStatus === 'approved' && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>⚠️ Changing the cost price will require re-approval from admin</span>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleProductSubmit} disabled={productLoading}
              style={{ padding: '0.7rem 2rem', background: productLoading ? '#666' : 'linear-gradient(135deg, #dc0000, #ff3333)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: productLoading ? 'not-allowed' : 'pointer' }}>
              {productLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Submit for Approval'}
            </button>
            <button onClick={resetProductForm}
              style={{ padding: '0.7rem 1.5rem', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // Product list view
    return (
      <div>
        {/* Header + Add button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>Your Products</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[{ key: 'all', label: 'All' }, { key: 'pending', label: `Pending (${productCounts.pending || 0})` },
                { key: 'approved', label: `Approved (${productCounts.approved || 0})` }, { key: 'rejected', label: `Rejected (${productCounts.rejected || 0})` }
              ].map(f => (
                <button key={f.key} onClick={() => setProductFilter(f.key)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                    background: productFilter === f.key ? 'rgba(220,0,0,0.15)' : 'rgba(255,255,255,0.05)',
                    color: productFilter === f.key ? '#dc0000' : '#94a3b8', fontWeight: productFilter === f.key ? '600' : '400' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { resetProductForm(); setShowAddProduct(true); }}
            style={{ padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #dc0000, #ff3333)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>
            + Add Product
          </button>
        </div>

        {/* Status summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[{ label: 'Pending Review', count: productCounts.pending || 0, color: '#f59e0b', icon: '⏳' },
            { label: 'Approved & Live', count: productCounts.approved || 0, color: '#10b981', icon: '✅' },
            { label: 'Rejected', count: productCounts.rejected || 0, color: '#ef4444', icon: '❌' }
          ].map(s => (
            <div key={s.label} style={{ padding: '1rem', background: '#111827', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: '1.5rem', fontWeight: '700' }}>{s.count}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Product list */}
        {productLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>
              {products.length === 0 ? 'No Products Yet' : 'No matching products'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {products.length === 0 ? 'Add your first product to get started. Set your cost price and admin will set the selling price on approval.' : 'Try a different filter.'}
            </p>
            {products.length === 0 && (
              <button onClick={() => { resetProductForm(); setShowAddProduct(true); }}
                style={{ padding: '0.7rem 2rem', background: 'linear-gradient(135deg, #dc0000, #ff3333)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' }}>
                + Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map(product => (
              <div key={product.id} style={{ background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                {/* Image */}
                <img src={product.image || '/images/placeholder.svg'} alt={product.name}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0, background: '#1e293b' }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>{product.name}</h4>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{product.category}{product.supplierSku ? ` • SKU: ${product.supplierSku}` : ''}</span>
                    </div>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                      background: statusBg[product.approvalStatus] || statusBg.pending,
                      color: statusColors[product.approvalStatus] || statusColors.pending }}>
                      {product.approvalStatus.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Your Cost: </span><span style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem' }}>R{product.supplierCost.toFixed(2)}</span></div>
                    {product.price > 0 && <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Sell Price: </span><span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.9rem' }}>R{product.price.toFixed(2)}</span></div>}
                    <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Stock: </span><span style={{ color: product.stock <= (product.lowStockThreshold || 5) ? '#f59e0b' : '#fff', fontWeight: '600', fontSize: '0.9rem' }}>{product.stock}</span></div>
                    <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Sold: </span><span style={{ color: '#60a5fa', fontWeight: '600', fontSize: '0.9rem' }}>{product.totalSold}</span></div>
                    {product.qualityRating && <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Rating: </span><span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>{'★'.repeat(product.qualityRating)}{'☆'.repeat(5 - product.qualityRating)}</span></div>}
                  </div>

                  {product.approvalStatus === 'rejected' && product.approvalNotes && (
                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Rejection reason: {product.approvalNotes}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button onClick={() => startEditProduct(product)}
                      style={{ padding: '0.3rem 0.75rem', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Edit
                    </button>
                    {product.approvalStatus === 'rejected' && (
                      <button onClick={() => handleResubmitProduct(product.id)}
                        style={{ padding: '0.3rem 0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        Resubmit
                      </button>
                    )}
                    <button onClick={() => handleDeleteProduct(product.id)}
                      style={{ padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── ORDERS RENDER HELPERS ─────────────────────────────

  const handleOrderAction = async (orderId, action, extra = {}) => {
    try {
      const r = await fetch('/api/supplier-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, supplierId: supplier.id, orderId, ...extra })
      });
      const d = await r.json();
      if (d.success) { fetchOrders(); setSelectedOrder(null); setShipForm({ trackingNumber: '', courier: '' }); }
      else alert(d.error || 'Action failed');
    } catch (e) { alert('Error performing action'); }
  };

  const handleReturnAction = async (action, payload = {}) => {
    try {
      const r = await fetch('/api/supplier-returns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, supplierId: supplier.id, ...payload })
      });
      const d = await r.json();
      if (d.success) {
        fetchReturns();
        setSelectedReturn(null);
        setReturnResponseText('');
        setShowReturnForm(false);
        setReturnReason('');
        setReturnReasonDetail('');
        alert(d.message || 'Action completed');
      } else {
        alert(d.error || 'Action failed');
      }
    } catch (e) { alert('Error performing action'); }
  };

  const fulfillmentColors = { pending: '#f59e0b', acknowledged: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981' };
  const fulfillmentBg = { pending: 'rgba(245,158,11,0.08)', acknowledged: 'rgba(59,130,246,0.08)', shipped: 'rgba(139,92,246,0.08)', delivered: 'rgba(16,185,129,0.08)' };

  // ─── ORDERS TAB ──────────────────────────────────────────
  const renderOrders = () => {
    const filtered = orderFilter === 'all' ? supplierOrders : supplierOrders.filter(o => o.fulfillmentStatus === orderFilter);

    // Order detail view
    if (selectedOrder) {
      const o = selectedOrder;
      const isOverdueAck = o.fulfillmentStatus === 'pending' && o.slaAckDeadline && new Date(o.slaAckDeadline) < new Date();
      const isOverdueShip = ['pending', 'acknowledged'].includes(o.fulfillmentStatus) && o.slaShipDeadline && new Date(o.slaShipDeadline) < new Date();
      return (
        <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Order {o.orderNumber}</h3>
            <button onClick={() => setSelectedOrder(null)}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              ← Back
            </button>
          </div>

          {/* Order info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Customer</div>
              <div style={{ color: '#fff', fontWeight: '600' }}>{o.customerName}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{o.customerEmail}</div>
            </div>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Status</div>
              <span style={{ padding: '0.25rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                background: fulfillmentBg[o.fulfillmentStatus], color: fulfillmentColors[o.fulfillmentStatus] }}>
                {o.fulfillmentStatus.toUpperCase()}
              </span>
              {o.slaBreached && <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.8rem' }}>⚠️ SLA Breached</span>}
            </div>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Your Earnings</div>
              <div style={{ color: '#10b981', fontWeight: '700', fontSize: '1.2rem' }}>R{o.supplierAmount.toFixed(2)}</div>
            </div>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Order Date</div>
              <div style={{ color: '#fff' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* SLA warnings */}
          {(isOverdueAck || isOverdueShip) && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '1rem' }}>
              <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                ⚠️ {isOverdueAck ? 'Acknowledge deadline overdue!' : 'Shipping deadline overdue!'} — Please take action to avoid SLA breach.
              </span>
            </div>
          )}

          {/* Items */}
          <h4 style={{ color: '#fff', margin: '0 0 0.75rem', fontSize: '1rem' }}>Items</h4>
          <div style={{ marginBottom: '1.5rem' }}>
            {(o.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#1e293b', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: '500' }}>{item.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Qty: {item.quantity}{item.selectedSize ? ` • Size: ${item.selectedSize}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#10b981', fontWeight: '600' }}>R{(item.supplierTotal || item.costPrice * item.quantity).toFixed(2)}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>you earn</div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {o.fulfillmentStatus === 'pending' && (
              <button onClick={() => handleOrderAction(o.id, 'acknowledge')}
                style={{ padding: '0.7rem 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                ✓ Acknowledge Order
              </button>
            )}
            {['pending', 'acknowledged'].includes(o.fulfillmentStatus) && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input placeholder="Tracking number" value={shipForm.trackingNumber} onChange={e => setShipForm(p => ({ ...p, trackingNumber: e.target.value }))}
                  style={{ padding: '0.6rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.85rem', width: '160px' }} />
                <input placeholder="Courier" value={shipForm.courier} onChange={e => setShipForm(p => ({ ...p, courier: e.target.value }))}
                  style={{ padding: '0.6rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.85rem', width: '120px' }} />
                <button onClick={() => handleOrderAction(o.id, 'ship', shipForm)}
                  style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  📦 Mark Shipped
                </button>
              </div>
            )}
            {o.fulfillmentStatus === 'shipped' && (
              <button onClick={() => handleOrderAction(o.id, 'deliver')}
                style={{ padding: '0.7rem 1.5rem', background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                ✓ Mark Delivered
              </button>
            )}
          </div>

          {o.trackingNumber && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Tracking: </span>
              <span style={{ color: '#fff' }}>{o.trackingNumber}</span>
              {o.courier && <><span style={{ color: '#64748b', fontSize: '0.8rem' }}> via </span><span style={{ color: '#fff' }}>{o.courier}</span></>}
            </div>
          )}

          {/* Request Return Section — for delivered/shipped orders */}
          {['shipped', 'delivered'].includes(o.fulfillmentStatus) && !isAdminMode && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              {!showReturnForm ? (
                <button onClick={() => setShowReturnForm(true)}
                  style={{ padding: '0.6rem 1.2rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                  🔄 Request Return
                </button>
              ) : (
                <div style={{ background: '#1e293b', borderRadius: '10px', padding: '1.25rem' }}>
                  <h4 style={{ color: '#fff', margin: '0 0 1rem', fontSize: '0.95rem' }}>🔄 Request Return</h4>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Reason</label>
                    <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <option value="">Select a reason...</option>
                      <option value="defective">Defective product</option>
                      <option value="wrong_item">Wrong item received</option>
                      <option value="not_as_described">Not as described</option>
                      <option value="damaged_in_transit">Damaged in transit</option>
                      <option value="size_issue">Size issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Details (optional)</label>
                    <textarea value={returnReasonDetail} onChange={e => setReturnReasonDetail(e.target.value)}
                      placeholder="Describe the issue..."
                      style={{ width: '100%', padding: '0.6rem', background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { if (!returnReason) { alert('Please select a reason'); return; } handleReturnAction('request-return', { supplierOrderId: o.id, reason: returnReason, reasonDetail: returnReasonDetail }); }}
                      style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #ef4444, #f87171)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Submit Return Request
                    </button>
                    <button onClick={() => { setShowReturnForm(false); setReturnReason(''); setReturnReasonDetail(''); }}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Order list view
    return (
      <div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[{ label: 'New', count: orderStats.pending || 0, color: '#f59e0b', icon: '🔔' },
            { label: 'Acknowledged', count: orderStats.acknowledged || 0, color: '#3b82f6', icon: '👁️' },
            { label: 'Shipped', count: orderStats.shipped || 0, color: '#8b5cf6', icon: '📦' },
            { label: 'Delivered', count: orderStats.delivered || 0, color: '#10b981', icon: '✅' },
            { label: 'Total', count: orderStats.total || 0, color: '#fff', icon: '📊' }
          ].map(s => (
            <div key={s.label} style={{ padding: '0.75rem', background: '#111827', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: '1.3rem', fontWeight: '700' }}>{s.count}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All Orders' }, { key: 'pending', label: 'New' }, { key: 'acknowledged', label: 'Acknowledged' },
            { key: 'shipped', label: 'Shipped' }, { key: 'delivered', label: 'Delivered' }
          ].map(f => (
            <button key={f.key} onClick={() => setOrderFilter(f.key)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                background: orderFilter === f.key ? 'rgba(220,0,0,0.15)' : 'rgba(255,255,255,0.05)',
                color: orderFilter === f.key ? '#dc0000' : '#94a3b8', fontWeight: orderFilter === f.key ? '600' : '400' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Order list */}
        {orderLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>{supplierOrders.length === 0 ? 'No Orders Yet' : 'No matching orders'}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {supplierOrders.length === 0 ? 'When customers purchase your products, orders will appear here.' : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filtered.map(o => {
              const isOverdue = o.fulfillmentStatus === 'pending' && o.slaAckDeadline && new Date(o.slaAckDeadline) < new Date();
              return (
                <div key={o.id} onClick={() => setSelectedOrder(o)}
                  style={{ background: '#111827', borderRadius: '12px', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`, padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: '600' }}>{o.orderNumber}</span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.75rem' }}>{o.customerName}</span>
                      {isOverdue && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.5rem' }}>⚠️ OVERDUE</span>}
                    </div>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                      background: fulfillmentBg[o.fulfillmentStatus], color: fulfillmentColors[o.fulfillmentStatus] }}>
                      {o.fulfillmentStatus.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: '#64748b' }}>Items: </span><span style={{ color: '#fff' }}>{(o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0)}</span></div>
                    <div><span style={{ color: '#64748b' }}>Earnings: </span><span style={{ color: '#10b981', fontWeight: '600' }}>R{o.supplierAmount.toFixed(2)}</span></div>
                    <div><span style={{ color: '#64748b' }}>Date: </span><span style={{ color: '#94a3b8' }}>{new Date(o.createdAt).toLocaleDateString()}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── FINANCIALS TAB ──────────────────────────────────────
  const renderFinancials = () => {
    const payoutColors = { pending: '#f59e0b', processing: '#3b82f6', paid: '#10b981', failed: '#ef4444' };
    const payoutBg = { pending: 'rgba(245,158,11,0.1)', processing: 'rgba(59,130,246,0.1)', paid: 'rgba(16,185,129,0.1)', failed: 'rgba(239,68,68,0.1)' };

    if (payoutLoading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading financial data...</div>;

    // Detail view
    if (selectedPayout) {
      const p = selectedPayout;
      return (
        <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Payout — {new Date(p.periodStart).toLocaleDateString()} to {new Date(p.periodEnd).toLocaleDateString()}</h3>
            <button onClick={() => setSelectedPayout(null)}
              style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
              ← Back to Payouts
            </button>
          </div>

          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: payoutBg[p.status], color: payoutColors[p.status] }}>
            {p.status.toUpperCase()}
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
            {[
              { label: 'Gross Sales', value: `R ${p.grossSales.toFixed(2)}`, color: '#fff' },
              { label: 'Your Earnings', value: `R ${p.supplierEarnings.toFixed(2)}`, color: '#10b981' },
              { label: 'SLA Penalties', value: `- R ${p.slaPenalties.toFixed(2)}`, color: p.slaPenalties > 0 ? '#ef4444' : '#94a3b8' },
              { label: 'Adjustments', value: `R ${p.adjustments.toFixed(2)}`, color: '#94a3b8' },
              { label: 'Net Payout', value: `R ${p.netPayout.toFixed(2)}`, color: '#10b981' },
              { label: 'Orders', value: p.orderCount, color: '#3b82f6' }
            ].map(s => (
              <div key={s.label} style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: '700', fontSize: '1.1rem' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {p.paymentReference && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', marginBottom: '1rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Payment Ref: </span>
              <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>{p.paymentReference}</span>
              {p.paidAt && <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '1rem' }}>Paid: {new Date(p.paidAt).toLocaleDateString()}</span>}
            </div>
          )}

          {p.orders && p.orders.length > 0 && (
            <>
              <h4 style={{ color: '#fff', margin: '1.5rem 0 0.75rem', fontSize: '1rem' }}>Orders in this Payout</h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {p.orders.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#1e293b', borderRadius: '8px', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>{o.orderNumber}</span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.75rem' }}>{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>R {o.supplierAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    // List view
    const filtered = payoutFilter === 'all' ? supplierPayouts : supplierPayouts.filter(p => p.status === payoutFilter);

    return (
      <div>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Earned', value: `R ${payoutStats.totalEarnings?.toFixed(2) || '0.00'}`, icon: '💰', color: '#10b981' },
            { label: 'Paid Out', value: `R ${payoutStats.paidAmount?.toFixed(2) || '0.00'}`, icon: '✅', color: '#3b82f6' },
            { label: 'Pending Payout', value: `R ${payoutStats.pendingAmount?.toFixed(2) || '0.00'}`, icon: '⏳', color: '#f59e0b' },
            { label: 'Unpaid Orders', value: `${payoutStats.unpaidOrders || 0} (R ${payoutStats.unpaidAmount?.toFixed(2) || '0.00'})`, icon: '📦', color: '#a78bfa' }
          ].map(s => (
            <div key={s.label} style={{ padding: '0.75rem', background: '#111827', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: '1.1rem', fontWeight: '700', margin: '0.25rem 0' }}>{s.value}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Payouts' },
            { key: 'pending', label: 'Pending' },
            { key: 'processing', label: 'Processing' },
            { key: 'paid', label: 'Paid' },
            { key: 'failed', label: 'Failed' }
          ].map(f => (
            <button key={f.key} onClick={() => setPayoutFilter(f.key)}
              style={{
                padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                background: payoutFilter === f.key ? 'rgba(220,0,0,0.15)' : 'rgba(255,255,255,0.05)',
                color: payoutFilter === f.key ? '#dc0000' : '#94a3b8',
                fontWeight: payoutFilter === f.key ? '600' : '400'
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Payout List */}
        {filtered.length === 0 ? (
          <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💰</div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Payouts Yet</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Payouts are generated automatically based on your delivered orders and payout frequency.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => {
                  fetch(`/api/supplier-payouts?payoutId=${p.id}`)
                    .then(r => r.json())
                    .then(d => { if (d.success) setSelectedPayout(d.payout); else setSelectedPayout(p); })
                    .catch(() => setSelectedPayout(p));
                }}
                style={{
                  background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                  padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,0,0,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem' }}>
                      {new Date(p.periodStart).toLocaleDateString()} — {new Date(p.periodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', background: payoutBg[p.status], color: payoutColors[p.status] }}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: '#64748b' }}>Net Payout: </span><span style={{ color: '#10b981', fontWeight: '600' }}>R {p.netPayout.toFixed(2)}</span></div>
                  <div><span style={{ color: '#64748b' }}>Orders: </span><span style={{ color: '#fff' }}>{p.orderCount}</span></div>
                  <div><span style={{ color: '#64748b' }}>Earnings: </span><span style={{ color: '#94a3b8' }}>R {p.supplierEarnings.toFixed(2)}</span></div>
                  {p.slaPenalties > 0 && <div><span style={{ color: '#64748b' }}>Penalties: </span><span style={{ color: '#ef4444' }}>-R {p.slaPenalties.toFixed(2)}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── RETURNS TAB ──────────────────────────────────────────
  const returnStatusColors = { requested: '#f59e0b', approved: '#3b82f6', rejected: '#ef4444', refunded: '#10b981', replaced: '#8b5cf6', closed: '#64748b' };
  const returnStatusBg = { requested: 'rgba(245,158,11,0.08)', approved: 'rgba(59,130,246,0.08)', rejected: 'rgba(239,68,68,0.08)', refunded: 'rgba(16,185,129,0.08)', replaced: 'rgba(139,92,246,0.08)', closed: 'rgba(100,116,139,0.08)' };
  const reasonLabels = { defective: 'Defective', wrong_item: 'Wrong Item', not_as_described: 'Not As Described', damaged_in_transit: 'Damaged in Transit', size_issue: 'Size Issue', other: 'Other' };

  const renderReturns = () => {
    const filtered = returnFilter === 'all' ? supplierReturns : supplierReturns.filter(r => r.returnStatus === returnFilter);

    // Detail view
    if (selectedReturn) {
      const r = selectedReturn;
      const isOverdue = r.returnStatus === 'requested' && r.slaDeadline && new Date(r.slaDeadline) < new Date();
      return (
        <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Return — Order {r.orderNumber}</h3>
            <button onClick={() => { setSelectedReturn(null); setReturnResponseText(''); }}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              ← Back
            </button>
          </div>

          {isOverdue && (
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '1rem' }}>
              <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ Response deadline overdue! Please respond to avoid SLA penalties.</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Customer</div>
              <div style={{ color: '#fff', fontWeight: '600' }}>{r.customerName}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{r.customerEmail}</div>
            </div>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Status</div>
              <span style={{ padding: '0.25rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                background: returnStatusBg[r.returnStatus], color: returnStatusColors[r.returnStatus] }}>
                {r.returnStatus.toUpperCase()}
              </span>
              {r.disputeStatus === 'open' && <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>DISPUTED</span>}
            </div>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Reason</div>
              <div style={{ color: '#fff', fontWeight: '600' }}>{reasonLabels[r.reason] || r.reason}</div>
              {r.reasonDetail && <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>{r.reasonDetail}</div>}
            </div>
            <div style={{ padding: '1rem', background: '#1e293b', borderRadius: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Refund Amount</div>
              <div style={{ color: '#f59e0b', fontWeight: '700', fontSize: '1.2rem' }}>R{r.refundAmount.toFixed(2)}</div>
            </div>
          </div>

          {r.slaDeadline && (
            <div style={{ padding: '0.75rem', background: '#1e293b', borderRadius: '8px', marginBottom: '1rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Response Deadline: </span>
              <span style={{ color: isOverdue ? '#ef4444' : '#fff', fontWeight: '600' }}>{new Date(r.slaDeadline).toLocaleString()}</span>
            </div>
          )}

          {/* Items */}
          {r.items && r.items.length > 0 && (
            <>
              <h4 style={{ color: '#fff', margin: '0 0 0.75rem', fontSize: '1rem' }}>Items</h4>
              <div style={{ marginBottom: '1.5rem' }}>
                {r.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#1e293b', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: '500' }}>{item.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Qty: {item.quantity}{item.selectedSize ? ` • Size: ${item.selectedSize}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Supplier response */}
          {r.supplierResponse && (
            <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1rem' }}>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Your Response</div>
              <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{r.supplierResponse}</div>
              {r.supplierRespondedAt && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>{new Date(r.supplierRespondedAt).toLocaleString()}</div>}
            </div>
          )}

          {/* Admin resolution */}
          {r.resolution && (
            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', marginBottom: '1rem' }}>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Admin Resolution</div>
              <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{r.resolution.replace(/_/g, ' ').toUpperCase()}</div>
              {r.adminNotes && <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>{r.adminNotes}</div>}
            </div>
          )}

          {/* Action buttons — supplier can approve or reject pending returns */}
          {r.returnStatus === 'requested' && !isAdminMode && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Response Note</label>
                <textarea value={returnResponseText} onChange={e => setReturnResponseText(e.target.value)}
                  placeholder="Add a note about your decision..."
                  style={{ width: '100%', padding: '0.6rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => handleReturnAction('approve-return', { returnId: r.id, supplierResponse: returnResponseText })}
                  style={{ padding: '0.7rem 1.5rem', background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  ✓ Approve Return
                </button>
                <button onClick={() => { if (!returnResponseText.trim()) { alert('Please provide a rejection reason'); return; } handleReturnAction('reject-return', { returnId: r.id, supplierResponse: returnResponseText }); }}
                  style={{ padding: '0.7rem 1.5rem', background: 'linear-gradient(135deg, #ef4444, #f87171)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  ✗ Reject Return
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // List view
    return (
      <div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[{ label: 'Pending', count: returnStats.requested || 0, color: '#f59e0b', icon: '🔔' },
            { label: 'Approved', count: returnStats.approved || 0, color: '#3b82f6', icon: '✓' },
            { label: 'Rejected', count: returnStats.rejected || 0, color: '#ef4444', icon: '✗' },
            { label: 'Refunded', count: returnStats.refunded || 0, color: '#10b981', icon: '💰' },
            { label: 'Total', count: returnStats.total || 0, color: '#fff', icon: '🔄' }
          ].map(s => (
            <div key={s.label} style={{ padding: '0.75rem', background: '#111827', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: '1.3rem', fontWeight: '700' }}>{s.count}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All Returns' }, { key: 'requested', label: 'Pending' }, { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' }, { key: 'refunded', label: 'Refunded' }
          ].map(f => (
            <button key={f.key} onClick={() => setReturnFilter(f.key)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                background: returnFilter === f.key ? 'rgba(220,0,0,0.15)' : 'rgba(255,255,255,0.05)',
                color: returnFilter === f.key ? '#dc0000' : '#94a3b8', fontWeight: returnFilter === f.key ? '600' : '400' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Return list */}
        {returnLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading returns...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>{supplierReturns.length === 0 ? 'No Returns Yet' : 'No matching returns'}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {supplierReturns.length === 0 ? 'Return requests from customers will appear here.' : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filtered.map(r => {
              const isOverdue = r.returnStatus === 'requested' && r.slaDeadline && new Date(r.slaDeadline) < new Date();
              return (
                <div key={r.id} onClick={() => setSelectedReturn(r)}
                  style={{ background: '#111827', borderRadius: '12px', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`, padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: '600' }}>Order {r.orderNumber}</span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.75rem' }}>{r.customerName}</span>
                      {isOverdue && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.5rem' }}>⚠️ OVERDUE</span>}
                      {r.disputeStatus === 'open' && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.5rem' }}>⚡ DISPUTED</span>}
                    </div>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                      background: returnStatusBg[r.returnStatus], color: returnStatusColors[r.returnStatus] }}>
                      {r.returnStatus.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: '#64748b' }}>Reason: </span><span style={{ color: '#fff' }}>{reasonLabels[r.reason] || r.reason}</span></div>
                    <div><span style={{ color: '#64748b' }}>Amount: </span><span style={{ color: '#f59e0b', fontWeight: '600' }}>R{r.refundAmount.toFixed(2)}</span></div>
                    <div><span style={{ color: '#64748b' }}>Date: </span><span style={{ color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── REVIEWS TAB (placeholder) ───────────────────────────
  const renderReviews = () => (
    <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
      <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Customer Reviews</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
        View and respond to customer reviews and ratings for your products.
      </p>
      <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', maxWidth: '400px', margin: '0 auto' }}>
        <span style={{ color: '#60a5fa', fontSize: '0.85rem' }}>🔧 Review features will be available in the next update.</span>
      </div>
    </div>
  );

  // ─── MESSAGES TAB (placeholder) ──────────────────────────
  const renderMessages = () => (
    <div style={{ background: '#111827', borderRadius: '14px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
      <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Messages</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
        Communicate with the Winter League Cricket admin team about orders, products, and SLA matters.
      </p>
      <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', maxWidth: '400px', margin: '0 auto' }}>
        <span style={{ color: '#60a5fa', fontSize: '0.85rem' }}>🔧 Messaging features will be available in the next update.</span>
      </div>
    </div>
  );

  // ─── SETTINGS TAB ────────────────────────────────────────
  const renderSettings = () => (
    <div>
      <div style={{ background: '#111827', borderRadius: '14px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>Company Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Company Name</div>
            <div style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{supplier.companyName}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email</div>
            <div style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{supplier.email}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Contact Person</div>
            <div style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{supplier.contactPersonName || 'Not set'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>SLA Tier</div>
            <div style={{ color: '#e2e8f0', fontSize: '0.95rem', textTransform: 'capitalize' }}>{supplier.slaTier || 'Standard'}</div>
          </div>
        </div>
        {supplier.categories && supplier.categories.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Product Categories</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {supplier.categories.map((c, i) => (
                <span key={i} style={{ padding: '0.25rem 0.75rem', borderRadius: '16px', background: 'rgba(220,0,0,0.1)', color: '#f87171', fontSize: '0.8rem', border: '1px solid rgba(220,0,0,0.2)' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      {!isAdminMode && (
        <div style={{ background: '#111827', borderRadius: '14px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>🔒 Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Current Password</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={6}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={6}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            </div>
            {pwMessage && (
              <div style={{ padding: '0.6rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', background: pwMessage.includes('success') ? 'rgba(22,163,74,0.1)' : 'rgba(220,0,0,0.1)', color: pwMessage.includes('success') ? '#4ade80' : '#f87171', border: `1px solid ${pwMessage.includes('success') ? 'rgba(22,163,74,0.2)' : 'rgba(220,0,0,0.2)'}` }}>
                {pwMessage}
              </div>
            )}
            <button type="submit" style={{
              padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #000 0%, #dc0000 100%)',
              color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer'
            }}>
              Update Password
            </button>
          </form>
        </div>
      )}
    </div>
  );

  // ─── APPLICATIONS TAB (admin only) ───────────────────────
  const renderApplications = () => {
    const statusColors = {
      submitted: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Submitted' },
      under_review: { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', label: 'Under Review' },
      approved: { bg: 'rgba(52,211,153,0.1)', color: '#34d399', label: 'Approved' },
      rejected: { bg: 'rgba(248,113,113,0.1)', color: '#f87171', label: 'Rejected' }
    };

    return (
      <div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['All', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map(f => {
            const key = f === 'All' ? 'all' : f.toLowerCase().replace(' ', '_');
            const count = key === 'all' ? applications.length : applications.filter(a => a.status === key).length;
            return (
              <span key={f} style={{
                padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)'
              }}>
                {f} ({count})
              </span>
            );
          })}
        </div>

        {applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p>No supplier applications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {applications.map(app => {
              const sc = statusColors[app.status] || statusColors.submitted;
              return (
                <div key={app.id} style={{
                  background: '#111827', borderRadius: '12px', padding: '1.25rem',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: '1rem', fontWeight: '700' }}>{app.companyName}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{app.email} • {app.contactPersonName}</div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
                      background: sc.bg, color: sc.color
                    }}>
                      {sc.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>CK: {app.businessRegistrationNumber}</span>
                    <span>Type: {app.companyType || 'N/A'}</span>
                    <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                  {app.productCategories && app.productCategories.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {app.productCategories.map((c, i) => (
                        <span key={i} style={{ padding: '0.15rem 0.5rem', borderRadius: '8px', background: 'rgba(220,0,0,0.08)', color: '#f87171', fontSize: '0.7rem' }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─── TAB CONTENT ROUTER ──────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'products': return renderProducts();
      case 'orders': return renderOrders();
      case 'returns': return renderReturns();
      case 'financials': return renderFinancials();
      case 'reviews': return renderReviews();
      case 'messages': return renderMessages();
      case 'settings': return renderSettings();
      case 'applications': return isAdminMode ? renderApplications() : null;
      default: return renderDashboard();
    }
  };

  // ─── MAIN RENDER ─────────────────────────────────────────
  return (
    <>
      <Head><title>Supplier Portal - Winter League Cricket</title></Head>
      <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem' }}>
                {supplier.companyName}
                {isAdminMode && <span style={{ marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#dc0000', color: '#fff', fontSize: '0.65rem', fontWeight: 700, verticalAlign: 'middle' }}>ADMIN VIEW</span>}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Supplier Portal</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem', background: 'rgba(220,0,0,0.1)', color: '#f87171',
              border: '1px solid rgba(220,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.target.style.background = '#dc0000'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(220,0,0,0.1)'; e.target.style.color = '#f87171'; }}
          >
            {isAdminMode ? '← Exit Preview' : 'Logout'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0 1.5rem', display: 'flex', overflowX: 'auto', gap: '0.25rem'
        }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #dc0000' : '2px solid transparent',
                color: activeTab === tab.key ? '#fff' : '#64748b',
                fontSize: '0.85rem', fontWeight: activeTab === tab.key ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <span style={{ fontSize: '0.95rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
          {renderTabContent()}
        </div>
      </div>
    </>
  );
}
