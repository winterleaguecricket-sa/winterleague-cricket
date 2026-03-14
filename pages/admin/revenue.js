import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const ADMIN_KIT_MARGIN = 116.50; // Admin makes R116.50 per basic kit sold

export default function AdminRevenue() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamsData, setTeamsData] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalBasicKitsSold, setTotalBasicKitsSold] = useState(0);
  const [apparelRevenue, setApparelRevenue] = useState({ total: 0, items: [] });
  const [coachApparelRevenue, setCoachApparelRevenue] = useState({ total: 0, items: [] });
  const [yocoGrossTotal, setYocoGrossTotal] = useState(0);
  const [yocoPaidOrders, setYocoPaidOrders] = useState(0);
  const [refundTotal, setRefundTotal] = useState(0);
  const [refundCount, setRefundCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('adminAuth');
      if (auth === 'true') {
        setIsAuthenticated(true);
      } else {
        window.location.href = '/admin';
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/manufacturer-data');
        if (!res.ok) throw new Error('Failed to load revenue data');
        const data = await res.json();
        setTeamsData(data.teams || []);
        setTotalPlayers(data.totalPlayers || 0);
        setTotalBasicKitsSold(data.totalBasicKitsSold || 0);
        setApparelRevenue(data.apparelRevenue || { total: 0, items: [] });
        setCoachApparelRevenue(data.coachApparelRevenue || { total: 0, items: [] });
        setYocoGrossTotal(data.yocoGrossTotal || 0);
        setYocoPaidOrders(data.yocoPaidOrders || 0);
        setRefundTotal(data.refundTotal || 0);
        setRefundCount(data.refundCount || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const fmtR = (v) => `R${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  // Admin revenue calculations — use basic kit count from orders (not team_players)
  const kitRevenue = totalBasicKitsSold * ADMIN_KIT_MARGIN;
  const apparelItems = (apparelRevenue.items || []).map(item => {
    const profitPerUnit = (parseFloat(item.salePrice) || 0) - (parseFloat(item.unitCost) || 0);
    const totalProfit = profitPerUnit * (item.qtySold || 0);
    return { ...item, profitPerUnit, totalProfit };
  });
  const apparelProfit = apparelItems.reduce((sum, item) => sum + item.totalProfit, 0);
  const coachApparelItems = (coachApparelRevenue.items || []).map(item => {
    const profitPerUnit = (parseFloat(item.salePrice) || 0) - (parseFloat(item.unitCost) || 0);
    const totalProfit = profitPerUnit * (item.qtySold || 0);
    return { ...item, profitPerUnit, totalProfit };
  });
  const coachApparelProfit = coachApparelItems.reduce((sum, item) => sum + item.totalProfit, 0);
  const totalRevenue = kitRevenue + apparelProfit + coachApparelProfit;

  // Yoco gateway fee calculation (2.93% of gross transaction total)
  const YOCO_FEE_RATE = 0.0293;
  const yocoFees = yocoGrossTotal * YOCO_FEE_RATE;
  const netRevenue = totalRevenue - yocoFees;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f9fafb' }}>
      <Head>
        <title>Admin Revenue - Winter League Cricket</title>
      </Head>

      {/* Header */}
      <header style={{
        background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            ← Back to Admin
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>
            💰 Admin Revenue (Accounting)
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            Loading revenue data...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            {error}
          </div>
        ) : (
          <>
            {/* ── Revenue Summary Banner ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(17,24,39,0.95) 50%, rgba(16,185,129,0.08) 100%)',
              borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem',
              border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: '2px solid rgba(16,185,129,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
                }}>💰</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#f9fafb' }}>Admin Revenue Overview</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '0.9rem' }}>
                    Admin margin on basic kits (R{ADMIN_KIT_MARGIN.toFixed(2)}/kit) + profit on additional apparel (sell price − cost price)
                  </p>
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {/* Total Admin Revenue */}
                <div style={{
                  background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.35)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Total Admin Revenue</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399' }}>
                    {fmtR(totalRevenue)}
                  </div>
                </div>
                {/* Kit Revenue */}
                <div style={{
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Kit Margin Revenue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#60a5fa' }}>
                    {fmtR(kitRevenue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {totalBasicKitsSold} kits sold × R{ADMIN_KIT_MARGIN.toFixed(2)}
                  </div>
                </div>
                {/* Apparel Profit */}
                <div style={{
                  background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Apparel Profit</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa' }}>
                    {fmtR(apparelProfit)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {apparelItems.filter(i => i.totalProfit > 0).reduce((s, i) => s + i.qtySold, 0)} items sold
                  </div>
                </div>
                {/* Coach Apparel Profit */}
                <div style={{
                  background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f9a8d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Coach Apparel Profit</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ec4899' }}>
                    {fmtR(coachApparelProfit)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {coachApparelItems.filter(i => i.totalProfit > 0).reduce((s, i) => s + i.qtySold, 0)} items sold
                  </div>
                </div>
                {/* Paid Players */}
                <div style={{
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Basic Kits Sold</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24' }}>{totalBasicKitsSold}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {totalPlayers} in team roster
                  </div>
                </div>
              </div>
            </div>

            {/* ── Yoco Gateway Fees ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(17,24,39,0.95) 50%, rgba(239,68,68,0.05) 100%)',
              borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem',
              border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  border: '2px solid rgba(239,68,68,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
                }}>💳</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f9fafb' }}>Yoco Gateway Fees (2.93%)</h3>
                  <p style={{ margin: '0.15rem 0 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                    Fee charged on all {yocoPaidOrders} paid transactions totalling {fmtR(yocoGrossTotal)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {/* Gross Transactions */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Gross Yoco Transactions</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f9fafb' }}>{fmtR(yocoGrossTotal)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.25rem' }}>{yocoPaidOrders} paid orders (excl. refunds)</div>
                </div>
                {/* Yoco Fees */}
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Yoco Fees (2.93%)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444' }}>-{fmtR(yocoFees)}</div>
                </div>
                {/* Refunds */}
                {refundCount > 0 && (
                <div style={{
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Refunded Orders</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24' }}>{fmtR(refundTotal)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.25rem' }}>{refundCount} order{refundCount !== 1 ? 's' : ''} refunded</div>
                </div>
                )}
                {/* Net Admin Revenue */}
                <div style={{
                  background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
                  borderRadius: '12px', padding: '1.25rem', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Net Admin Revenue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399' }}>{fmtR(netRevenue)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.25rem' }}>After Yoco fees deducted</div>
                </div>
              </div>
            </div>

            {/* ── Kit Revenue by Team ── */}
            <div style={{
              background: '#111827', borderRadius: '12px', padding: '1.5rem',
              border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#f9fafb' }}>
                Kit Margin Revenue by Team
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid Players</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamsData
                      .filter(t => t.playerCount > 0)
                      .sort((a, b) => b.playerCount - a.playerCount)
                      .map((team, idx) => (
                        <tr key={team.id} style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                        }}>
                          <td style={{ padding: '0.75rem 1rem', color: '#f1f5f9', fontWeight: 600 }}>
                            {team.teamName}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                              padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem'
                            }}>{team.playerCount}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                            {fmtR(team.playerCount * ADMIN_KIT_MARGIN)}
                          </td>
                        </tr>
                      ))}
                    {/* Totals row */}
                    <tr style={{ borderTop: '2px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', color: '#f9fafb', fontWeight: 800, fontSize: '0.92rem' }}>
                        TOTAL (in roster)
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#f9fafb', fontWeight: 800 }}>
                        {totalPlayers}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#34d399', fontWeight: 900, fontSize: '1.05rem' }}>
                        {fmtR(totalPlayers * ADMIN_KIT_MARGIN)}
                      </td>
                    </tr>
                    {totalBasicKitsSold !== totalPlayers && (
                    <tr style={{ background: 'rgba(251,191,36,0.05)' }}>
                      <td style={{ padding: '0.65rem 1rem', color: '#fcd34d', fontWeight: 700, fontSize: '0.82rem' }}>
                        + Kits sold without roster entry
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#fcd34d', fontWeight: 700, fontSize: '0.82rem' }}>
                        {totalBasicKitsSold - totalPlayers}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: '#fcd34d', fontWeight: 700, fontSize: '0.82rem' }}>
                        {fmtR((totalBasicKitsSold - totalPlayers) * ADMIN_KIT_MARGIN)}
                      </td>
                    </tr>
                    )}
                    <tr style={{ borderTop: '2px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.08)' }}>
                      <td style={{ padding: '0.85rem 1rem', color: '#6ee7b7', fontWeight: 900, fontSize: '0.92rem' }}>
                        TOTAL KITS SOLD
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#6ee7b7', fontWeight: 900 }}>
                        {totalBasicKitsSold}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#34d399', fontWeight: 900, fontSize: '1.05rem' }}>
                        {fmtR(kitRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Additional Apparel Profit Breakdown ── */}
            {apparelItems.filter(i => i.qtySold > 0).length > 0 && (
              <div style={{
                background: '#111827', borderRadius: '12px', padding: '1.5rem',
                border: '1px solid rgba(168,85,247,0.15)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#f9fafb' }}>
                  Additional Apparel Profit
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty Sold</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sell Price</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Price</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit / Unit</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apparelItems
                        .filter(item => item.qtySold > 0)
                        .sort((a, b) => b.totalProfit - a.totalProfit)
                        .map((item, idx) => (
                          <tr key={item.itemId} style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                          }}>
                            <td style={{ padding: '0.75rem 1rem', color: '#f1f5f9', fontWeight: 600 }}>
                              {item.itemName}
                              {(item.itemId || '').startsWith('supporter_') && (
                                <span style={{ fontSize: '0.7rem', color: '#a78bfa', marginLeft: '0.5rem', background: 'rgba(168,85,247,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Supporter</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <span style={{
                                background: 'rgba(168,85,247,0.12)', color: '#c4b5fd',
                                padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem'
                              }}>{item.qtySold}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>
                              {fmtR(item.salePrice)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>
                              {fmtR(item.unitCost)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#60a5fa', fontWeight: 700 }}>
                              {fmtR(item.profitPerUnit)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#a78bfa', fontWeight: 700 }}>
                              {fmtR(item.totalProfit)}
                            </td>
                          </tr>
                        ))}
                      {/* Totals row */}
                      <tr style={{ borderTop: '2px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem', color: '#f9fafb', fontWeight: 800, fontSize: '0.92rem' }}>
                          TOTAL APPAREL PROFIT
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#f9fafb', fontWeight: 800 }}>
                          {apparelItems.filter(i => i.qtySold > 0).reduce((s, i) => s + i.qtySold, 0)}
                        </td>
                        <td colSpan="3" style={{ padding: '0.85rem 1rem' }}></td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#a78bfa', fontWeight: 900, fontSize: '1.05rem' }}>
                          {fmtR(apparelProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Coach Apparel Profit Breakdown ── */}
            {coachApparelItems.filter(i => i.qtySold > 0).length > 0 && (
              <div style={{
                background: '#111827', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem',
                border: '1px solid rgba(236,72,153,0.15)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#f9fafb' }}>
                  Coach Apparel Profit
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty Sold</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sell Price</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Price</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit / Unit</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachApparelItems
                        .filter(item => item.qtySold > 0)
                        .sort((a, b) => b.totalProfit - a.totalProfit)
                        .map((item, idx) => (
                          <tr key={item.itemId} style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                          }}>
                            <td style={{ padding: '0.75rem 1rem', color: '#f1f5f9', fontWeight: 600 }}>
                              {item.itemName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <span style={{
                                background: 'rgba(236,72,153,0.12)', color: '#f9a8d4',
                                padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem'
                              }}>{item.qtySold}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>
                              {fmtR(item.salePrice)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: 600 }}>
                              {fmtR(item.unitCost)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#60a5fa', fontWeight: 700 }}>
                              {fmtR(item.profitPerUnit)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#ec4899', fontWeight: 700 }}>
                              {fmtR(item.totalProfit)}
                            </td>
                          </tr>
                        ))}
                      {/* Totals row */}
                      <tr style={{ borderTop: '2px solid rgba(236,72,153,0.3)', background: 'rgba(236,72,153,0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem', color: '#f9fafb', fontWeight: 800, fontSize: '0.92rem' }}>
                          TOTAL COACH APPAREL PROFIT
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#f9fafb', fontWeight: 800 }}>
                          {coachApparelItems.filter(i => i.qtySold > 0).reduce((s, i) => s + i.qtySold, 0)}
                        </td>
                        <td colSpan="3" style={{ padding: '0.85rem 1rem' }}></td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#ec4899', fontWeight: 900, fontSize: '1.05rem' }}>
                          {fmtR(coachApparelProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Revenue Composition Summary ── */}
            <div style={{
              background: '#111827', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem',
              border: '1px solid rgba(16,185,129,0.15)'
            }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#f9fafb' }}>
                Revenue Composition
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {/* Kit bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd' }}>Basic Kit Margin ({totalBasicKitsSold} × R{ADMIN_KIT_MARGIN.toFixed(2)})</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60a5fa' }}>{fmtR(kitRevenue)}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                      width: totalRevenue > 0 ? `${(kitRevenue / totalRevenue * 100).toFixed(1)}%` : '0%'
                    }}></div>
                  </div>
                </div>
                {/* Apparel bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c4b5fd' }}>Additional Apparel Profit</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa' }}>{fmtR(apparelProfit)}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px',
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                      width: totalRevenue > 0 ? `${(apparelProfit / totalRevenue * 100).toFixed(1)}%` : '0%'
                    }}></div>
                  </div>
                </div>
                {/* Coach Apparel bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f9a8d4' }}>Coach Apparel Profit</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ec4899' }}>{fmtR(coachApparelProfit)}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px',
                      background: 'linear-gradient(90deg, #db2777, #ec4899)',
                      width: totalRevenue > 0 ? `${(coachApparelProfit / totalRevenue * 100).toFixed(1)}%` : '0%'
                    }}></div>
                  </div>
                </div>
                {/* Grand total */}
                <div style={{
                  marginTop: '0.5rem', paddingTop: '1rem',
                  borderTop: '2px solid rgba(16,185,129,0.2)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: '#f9fafb' }}>TOTAL ADMIN REVENUE</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>{fmtR(totalRevenue)}</span>
                </div>
                {/* Yoco fee deduction */}
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fca5a5' }}>Less: Yoco Gateway Fees (2.93% of {fmtR(yocoGrossTotal)})</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>-{fmtR(yocoFees)}</span>
                </div>
                {/* Refunds line */}
                {refundCount > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fcd34d' }}>Refunds ({refundCount} order{refundCount !== 1 ? 's' : ''})</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>-{fmtR(refundTotal)}</span>
                </div>
                )}
                {/* Net revenue */}
                <div style={{
                  marginTop: '0.75rem', paddingTop: '0.75rem',
                  borderTop: '2px solid rgba(16,185,129,0.4)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#6ee7b7' }}>NET ADMIN REVENUE</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>{fmtR(netRevenue)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
