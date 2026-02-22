import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const STATUS_COLORS = {
  pass:  { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', text: '#6ee7b7', badge: '#059669' },
  fail:  { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', text: '#fca5a5', badge: '#dc2626' },
  error: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', text: '#fde68a', badge: '#d97706' },
};

export default function AgeVerification() {
  const [players, setPlayers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, errors: 0 });
  const [cutoffs, setCutoffs] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, fail, error, pass
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/age-verification');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPlayers(data.players || []);
      setSummary(data.summary || { total: 0, passed: 0, failed: 0, errors: 0 });
      setCutoffs(data.cutoffs || {});
    } catch (err) {
      console.error('Failed to load age verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = players.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    const matchesSearch = !searchTerm || 
      p.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Head><title>Age Verification - Admin</title></Head>

      <div style={{ minHeight: '100vh', background: '#0b0f19' }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          padding: '0.85rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>🛡️ Player Age Verification</h1>
            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button onClick={loadData} style={{
                padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
              }}>🔄 Refresh</button>
              <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>← Back to Admin</Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <SummaryCard label="Total Players" value={summary.total} gradient="rgba(99, 102, 241, 0.2)" borderColor="rgba(99, 102, 241, 0.35)" textColor="#a5b4fc" />
            <SummaryCard label="Passed" value={summary.passed} gradient="rgba(16, 185, 129, 0.2)" borderColor="rgba(16, 185, 129, 0.35)" textColor="#6ee7b7" />
            <SummaryCard label="Failed (Too Old)" value={summary.failed} gradient="rgba(239, 68, 68, 0.2)" borderColor="rgba(239, 68, 68, 0.35)" textColor="#fca5a5" />
            <SummaryCard label="Data Errors" value={summary.errors} gradient="rgba(245, 158, 11, 0.2)" borderColor="rgba(245, 158, 11, 0.35)" textColor="#fde68a" />
          </div>

          {/* Cutoff Reference */}
          <div style={{
            background: '#111827', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.2)', boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
          }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#f9fafb' }}>📏 Age Group Cutoffs</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {Object.entries(cutoffs).map(([group, year]) => (
                <span key={group} style={{
                  padding: '0.35rem 0.75rem', background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px',
                  color: '#c7d2fe', fontSize: '0.85rem', fontWeight: '600'
                }}>
                  {group}: Born {year}+
                </span>
              ))}
              <span style={{
                padding: '0.35rem 0.75rem', background: 'rgba(148, 163, 184, 0.1)',
                border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px',
                color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600'
              }}>
                Senior: No restriction
              </span>
            </div>
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { key: 'all', label: 'All', count: summary.total },
                { key: 'fail', label: 'Failed', count: summary.failed },
                { key: 'error', label: 'Errors', count: summary.errors },
                { key: 'pass', label: 'Passed', count: summary.passed },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s',
                  background: filter === f.key ? 'rgba(99, 102, 241, 0.3)' : 'rgba(148, 163, 184, 0.1)',
                  color: filter === f.key ? '#c7d2fe' : '#94a3b8',
                  borderBottom: filter === f.key ? '2px solid #6366f1' : '2px solid transparent'
                }}>
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search player, team, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)',
                background: '#1e293b', color: '#e2e8f0', fontSize: '0.85rem', minWidth: '240px', outline: 'none'
              }}
            />
          </div>

          {/* Results */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              Loading verification data...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              {filter === 'all' ? 'No player registrations found' : `No ${filter === 'fail' ? 'failed' : filter === 'error' ? 'error' : 'passed'} players`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(player => {
                const colors = STATUS_COLORS[player.status] || STATUS_COLORS.error;
                return (
                  <div key={player.id} style={{
                    background: colors.bg, borderRadius: '12px', padding: '1rem 1.25rem',
                    border: `1px solid ${colors.border}`,
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'start'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f9fafb' }}>{player.playerName}</span>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700',
                          background: colors.badge, color: '#fff', textTransform: 'uppercase'
                        }}>
                          {player.status === 'pass' ? '✓ PASS' : player.status === 'fail' ? '✗ FAIL' : '⚠ ERROR'}
                        </span>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                          background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc'
                        }}>{player.ageGroup}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <span>🏏 {player.teamName}</span>
                        <span>📅 DOB: {player.dob || '—'}</span>
                        {player.birthYear && <span>Born: {player.birthYear}</span>}
                        {player.parentName && <span>👤 {player.parentName}</span>}
                        <span>✉️ {player.email}</span>
                      </div>
                      {player.reason && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: colors.text, fontWeight: '600' }}>
                          {player.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatDate(player.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function SummaryCard({ label, value, gradient, borderColor, textColor }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${gradient} 0%, rgba(0,0,0,0.3) 100%)`,
      borderRadius: '12px', padding: '1.25rem', border: `1px solid ${borderColor}`
    }}>
      <div style={{ fontSize: '2rem', fontWeight: '800', color: textColor }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: textColor, fontWeight: '600', opacity: 0.85 }}>{label}</div>
    </div>
  );
}
