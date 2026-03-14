import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ManufacturingBatches() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [batches, setBatches] = useState([]);
  const [unbatchedPlayers, setUnbatchedPlayers] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchPlayers, setBatchPlayers] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [batchNotes, setBatchNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [view, setView] = useState('teams'); // teams, team-detail, batch-detail

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Load teams summary
  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/manufacturing-batches?action=teams-summary');
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
    setIsLoading(false);
  }, []);

  // Load team batches + unbatched players
  const loadTeamDetail = useCallback(async (teamId) => {
    setIsLoading(true);
    try {
      const [batchRes, playerRes] = await Promise.all([
        fetch(`/api/manufacturing-batches?action=team-batches&teamId=${teamId}`),
        fetch(`/api/manufacturing-batches?action=unbatched-players&teamId=${teamId}`)
      ]);
      const batchData = await batchRes.json();
      const playerData = await playerRes.json();
      setBatches(batchData.batches || []);
      setUnbatchedPlayers(playerData.players || []);
      setSelectedPlayerIds([]);
    } catch (err) {
      console.error('Error loading team detail:', err);
    }
    setIsLoading(false);
  }, []);

  // Load batch detail
  const loadBatchDetail = useCallback(async (batchId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manufacturing-batches?action=batch-details&batchId=${batchId}`);
      const data = await res.json();
      setSelectedBatch(data.batch || null);
      setBatchPlayers(data.players || []);
    } catch (err) {
      console.error('Error loading batch:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const selectTeam = (team) => {
    setSelectedTeam(team);
    setView('team-detail');
    loadTeamDetail(team.id);
  };

  const selectBatch = (batch) => {
    setView('batch-detail');
    loadBatchDetail(batch.id);
  };

  const goBack = () => {
    if (view === 'batch-detail') {
      setView('team-detail');
      setSelectedBatch(null);
      setBatchPlayers([]);
      if (selectedTeam) loadTeamDetail(selectedTeam.id);
    } else {
      setView('teams');
      setSelectedTeam(null);
      setBatches([]);
      setUnbatchedPlayers([]);
      loadTeams();
    }
  };

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const selectAllPlayers = () => {
    if (selectedPlayerIds.length === unbatchedPlayers.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(unbatchedPlayers.map(p => p.id));
    }
  };

  const createBatch = async () => {
    if (!selectedPlayerIds.length) return showMessage('Select at least one player', 'error');
    setActionLoading(true);
    try {
      const res = await fetch('/api/manufacturing-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-batch', teamId: selectedTeam.id, playerIds: selectedPlayerIds, notes: batchNotes })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message);
        setBatchNotes('');
        loadTeamDetail(selectedTeam.id);
      } else {
        showMessage(data.error || 'Failed to create batch', 'error');
      }
    } catch (err) {
      showMessage('Error creating batch', 'error');
    }
    setActionLoading(false);
  };

  const markBatchStatus = async (batchId, action) => {
    const confirmMsg = action === 'mark-paid'
      ? 'Mark this batch as PAID? This will update all parent orders to "In Production".'
      : 'Mark this batch as submitted to manufacturer?';
    if (!confirm(confirmMsg)) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/manufacturing-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, batchId })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || `Batch ${action === 'mark-paid' ? 'marked as paid' : 'submitted'}`);
        if (view === 'batch-detail') loadBatchDetail(batchId);
        else loadTeamDetail(selectedTeam.id);
      } else {
        showMessage(data.error || 'Action failed', 'error');
      }
    } catch (err) {
      showMessage('Error updating batch', 'error');
    }
    setActionLoading(false);
  };

  const deleteBatch = async (batchId) => {
    if (!confirm('Delete this batch? Players will become unbatched again.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/manufacturing-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-batch', batchId })
      });
      if (res.ok) {
        showMessage('Batch deleted');
        if (view === 'batch-detail') {
          setView('team-detail');
          loadTeamDetail(selectedTeam.id);
        } else {
          loadTeamDetail(selectedTeam.id);
        }
      } else {
        const data = await res.json();
        showMessage(data.error || 'Cannot delete batch', 'error');
      }
    } catch (err) {
      showMessage('Error deleting batch', 'error');
    }
    setActionLoading(false);
  };

  const unbatchBatch = async (batchId, batchNumber, status) => {
    const statusWarning = status === 'paid'
      ? '\n\n⚠️ This batch is PAID — parent orders will be reverted from "In Production" back to "Confirmed".'
      : status === 'submitted'
      ? '\n\n⚠️ This batch has been SUBMITTED to the manufacturer.'
      : '';
    if (!confirm(`Unbatch Batch #${batchNumber}? All players will be returned to the unbatched pool.${statusWarning}`)) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/manufacturing-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unbatch', batchId })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Batch unbatched successfully');
        if (view === 'batch-detail') {
          setView('team-detail');
          loadTeamDetail(selectedTeam.id);
        } else {
          loadTeamDetail(selectedTeam.id);
        }
      } else {
        showMessage(data.error || 'Failed to unbatch', 'error');
      }
    } catch (err) {
      showMessage('Error unbatching', 'error');
    }
    setActionLoading(false);
  };

  const downloadExcel = (params) => {
    const qs = new URLSearchParams(params).toString();
    window.open(`/api/manufacturing-export?${qs}`, '_blank');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const statusBadge = (status) => {
    const colors = { created: '#fbbf24', submitted: '#60a5fa', paid: '#34d399' };
    const bgs = { created: 'rgba(251,191,36,0.12)', submitted: 'rgba(96,165,250,0.12)', paid: 'rgba(52,211,153,0.12)' };
    const borders = { created: 'rgba(251,191,36,0.3)', submitted: 'rgba(96,165,250,0.3)', paid: 'rgba(52,211,153,0.3)' };
    const labels = { created: 'Created', submitted: 'Submitted', paid: 'Paid' };
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
        background: bgs[status] || 'rgba(255,255,255,0.08)', color: colors[status] || '#9ca3af', border: `1px solid ${borders[status] || 'rgba(255,255,255,0.1)'}`
      }}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f9fafb' }}>
      <Head>
        <title>Manufacturing Batches - Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Mobile responsive styles */}
      <style jsx global>{`
        .mfg-header {
          background: #111827;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mfg-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .mfg-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }
        .mfg-summary-banner {
          background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(17,24,39,0.95) 50%, rgba(139,92,246,0.08) 100%);
          border-radius: 16px;
          padding: 1.5rem 2rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(139,92,246,0.2);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .mfg-summary-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .mfg-summary-stats {
          display: flex;
          gap: 1rem;
        }
        .mfg-stat-box {
          text-align: center;
          border-radius: 10px;
          padding: 0.75rem 1.25rem;
        }
        .mfg-teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .mfg-section-card {
          background: #111827;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 1.25rem;
          margin-bottom: 1rem;
          border-left: 4px solid #fbbf24;
        }
        .mfg-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .mfg-section-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mfg-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .mfg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .mfg-table th {
          text-align: left;
          padding: 0.6rem 0.75rem;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .mfg-table td {
          padding: 0.6rem 0.75rem;
        }
        /* Mobile player cards - hidden on desktop, shown on mobile */
        .mfg-mobile-cards { display: none; }
        .mfg-desktop-table { display: block; }

        .mfg-batch-card {
          background: #111827;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .mfg-batch-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .mfg-batch-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mfg-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .mfg-detail-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .mfg-payment-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .mfg-payment-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .mfg-create-batch-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* MOBILE BREAKPOINT */
        @media (max-width: 768px) {
          .mfg-header {
            padding: 0.75rem 1rem;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .mfg-header-left {
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          .mfg-header-left h1 {
            font-size: 1rem !important;
            width: 100%;
          }
          .mfg-main {
            padding: 1rem 0.75rem;
          }
          .mfg-summary-banner {
            padding: 1rem;
            border-radius: 12px;
          }
          .mfg-summary-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-summary-stats {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 0.5rem;
          }
          .mfg-stat-box {
            padding: 0.5rem 0.4rem;
          }
          .mfg-stat-box .stat-num {
            font-size: 1.2rem !important;
          }
          .mfg-stat-box .stat-label {
            font-size: 0.6rem !important;
          }
          .mfg-teams-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .mfg-section-card {
            padding: 0.85rem;
            border-radius: 10px;
          }
          .mfg-section-header {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-section-actions {
            width: 100%;
          }
          .mfg-section-actions button {
            flex: 1;
            min-width: 0;
            font-size: 0.78rem !important;
            padding: 0.45rem 0.6rem !important;
          }
          /* Hide desktop table, show mobile cards */
          .mfg-desktop-table { display: none !important; }
          .mfg-mobile-cards { display: block !important; }

          .mfg-batch-card {
            padding: 1rem;
          }
          .mfg-batch-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-batch-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.4rem;
          }
          .mfg-batch-actions button {
            text-align: center;
            font-size: 0.75rem !important;
            padding: 0.5rem 0.5rem !important;
          }
          .mfg-detail-header {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-detail-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.4rem;
          }
          .mfg-detail-actions button {
            text-align: center;
            font-size: 0.78rem !important;
            padding: 0.5rem 0.5rem !important;
          }
          .mfg-payment-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-payment-right {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-payment-right > div {
            text-align: center !important;
          }
          .mfg-payment-right button {
            width: 100%;
          }
          .mfg-create-batch-row {
            flex-direction: column;
            align-items: stretch;
          }
          .mfg-create-batch-row input {
            min-width: 0 !important;
            width: 100% !important;
          }
          .mfg-create-batch-row button {
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <header className="mfg-header">
        <div className="mfg-header-left">
          {view !== 'teams' && (
            <button onClick={goBack} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              ← Back
            </button>
          )}
          <Link href="/admin" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            ← Back to Admin
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>🏭 Manufacturing Batches</h1>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/orders" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>📦 Orders</Link>
        </nav>
      </header>

      <main className="mfg-main">

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem',
            background: message.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            color: message.type === 'error' ? '#fca5a5' : '#6ee7b7',
            border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
          }}>
            {message.text}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            Loading...
          </div>
        )}

        {/* TEAMS LIST VIEW */}
        {!isLoading && view === 'teams' && (
          <div>
            {/* Summary banner */}
            <div className="mfg-summary-banner">
              <div className="mfg-summary-inner">
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#f9fafb' }}>Teams Overview</h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>{teams.length} teams with paid players</p>
                </div>
                <div className="mfg-summary-stats">
                  <div className="mfg-stat-box" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <div className="stat-num" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{teams.reduce((s, t) => s + parseInt(t.unbatched_players || 0), 0)}</div>
                    <div className="stat-label" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unbatched</div>
                  </div>
                  <div className="mfg-stat-box" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div className="stat-num" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>{teams.reduce((s, t) => s + parseInt(t.batched_players || 0), 0)}</div>
                    <div className="stat-label" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batched</div>
                  </div>
                  <div className="mfg-stat-box" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <div className="stat-num" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#60a5fa' }}>{teams.reduce((s, t) => s + parseInt(t.total_paid_players || 0), 0)}</div>
                    <div className="stat-label" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mfg-teams-grid">
              {teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => selectTeam(team)}
                  style={{
                    background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                    padding: '1.25rem', cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,0,0,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,0,0,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; }}
                >
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>{team.team_name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Paid Players:</span>
                      <strong style={{ marginLeft: '0.3rem', color: '#f1f5f9' }}>{team.total_paid_players}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Batched:</span>
                      <strong style={{ marginLeft: '0.3rem', color: '#34d399' }}>{team.batched_players}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Unbatched:</span>
                      <strong style={{ marginLeft: '0.3rem', color: parseInt(team.unbatched_players) > 0 ? '#fbbf24' : '#4b5563' }}>{team.unbatched_players}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Batches:</span>
                      <strong style={{ marginLeft: '0.3rem', color: '#f1f5f9' }}>{team.total_batches}</strong>
                    </div>
                  </div>
                  {parseInt(team.unbatched_players) > 0 && (
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.5)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM DETAIL VIEW */}
        {!isLoading && view === 'team-detail' && selectedTeam && (
          <div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>{selectedTeam.team_name}</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
              {unbatchedPlayers.length} unbatched players · {batches.length} batch{batches.length !== 1 ? 'es' : ''}
            </p>

            {/* Unbatched Players Section */}
            {unbatchedPlayers.length > 0 && (
              <div className="mfg-section-card">
                <div className="mfg-section-header">
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fcd34d' }}>
                    ⏳ Unbatched Players ({unbatchedPlayers.length})
                  </h3>
                  <div className="mfg-section-actions">
                    <button onClick={() => downloadExcel({ teamId: selectedTeam.id })} style={{
                      padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                      📥 Excel
                    </button>
                    <button onClick={selectAllPlayers} style={{
                      padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                      {selectedPlayerIds.length === unbatchedPlayers.length ? '☐ Deselect All' : '☑ Select All'}
                    </button>
                  </div>
                </div>

                <div className="mfg-desktop-table">
                <div className="mfg-table-wrap">
                  <table className="mfg-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ width: '40px' }}>
                          <input type="checkbox" checked={selectedPlayerIds.length === unbatchedPlayers.length && unbatchedPlayers.length > 0} onChange={selectAllPlayers} style={{ accentColor: '#dc0000' }} />
                        </th>
                        {['Player', 'Sub-Team', 'Shirt', 'Pants', '#', 'Additional', 'Parent'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {unbatchedPlayers.map((player, idx) => (
                        <tr
                          key={player.id}
                          style={{
                            background: selectedPlayerIds.includes(player.id) ? 'rgba(220,0,0,0.08)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                            borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s'
                          }}
                          onClick={() => togglePlayerSelection(player.id)}
                        >
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => {}} style={{ accentColor: '#dc0000' }} />
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#f1f5f9' }}>{player.player_name}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>{player.sub_team}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#d1d5db' }}>{player.shirt_size}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#d1d5db' }}>{player.pants_size}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#d1d5db' }}>{player.shirt_number || player.jersey_number || '—'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            {(player.additional_items || []).map((item, i) => (
                              <div key={i}>{item.name} ({item.size})</div>
                            ))}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem' }}>
                            <div style={{ color: '#d1d5db' }}>{player.parent_name}</div>
                            <div style={{ color: '#6b7280' }}>{player.parent_email}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>

                {/* Mobile card layout for unbatched players */}
                <div className="mfg-mobile-cards">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0' }}>
                    <input type="checkbox" checked={selectedPlayerIds.length === unbatchedPlayers.length && unbatchedPlayers.length > 0} onChange={selectAllPlayers} style={{ accentColor: '#dc0000', width: '18px', height: '18px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Select All</span>
                  </div>
                  {unbatchedPlayers.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => togglePlayerSelection(player.id)}
                      style={{
                        background: selectedPlayerIds.includes(player.id) ? 'rgba(220,0,0,0.1)' : 'rgba(255,255,255,0.03)',
                        border: selectedPlayerIds.includes(player.id) ? '1px solid rgba(220,0,0,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px', padding: '0.85rem', marginBottom: '0.5rem', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => {}} style={{ accentColor: '#dc0000', width: '16px', height: '16px' }} />
                        <strong style={{ fontSize: '0.92rem', color: '#f1f5f9' }}>{player.player_name}</strong>
                        {(player.shirt_number || player.jersey_number) && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>#{player.shirt_number || player.jersey_number}</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem', fontSize: '0.78rem', paddingLeft: '1.6rem' }}>
                        <div><span style={{ color: '#6b7280' }}>Shirt:</span> <span style={{ color: '#d1d5db' }}>{player.shirt_size || '—'}</span></div>
                        <div><span style={{ color: '#6b7280' }}>Pants:</span> <span style={{ color: '#d1d5db' }}>{player.pants_size || '—'}</span></div>
                        {player.sub_team && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Team:</span> <span style={{ color: '#94a3b8' }}>{player.sub_team}</span></div>}
                        {player.parent_name && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Parent:</span> <span style={{ color: '#94a3b8' }}>{player.parent_name}</span></div>}
                        {(player.additional_items || []).length > 0 && (
                          <div style={{ gridColumn: '1 / -1', color: '#94a3b8' }}>
                            <span style={{ color: '#6b7280' }}>Extras:</span> {player.additional_items.map(i => `${i.name} (${i.size})`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create Batch Controls */}
                {selectedPlayerIds.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <div className="mfg-create-batch-row">
                      <span style={{ fontWeight: 700, color: '#6ee7b7' }}>
                        {selectedPlayerIds.length} player{selectedPlayerIds.length !== 1 ? 's' : ''} selected
                      </span>
                      <input
                        type="text"
                        placeholder="Batch notes (optional)"
                        value={batchNotes}
                        onChange={e => setBatchNotes(e.target.value)}
                        style={{
                          flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: '0.85rem'
                        }}
                      />
                      <button onClick={createBatch} disabled={actionLoading} style={{
                        padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                      }}>
                        {actionLoading ? 'Creating...' : `🏭 Create Batch (${selectedPlayerIds.length})`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {unbatchedPlayers.length === 0 && (
              <div style={{
                background: '#111827', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)',
                borderLeft: '4px solid #10b981', textAlign: 'center', padding: '2rem', color: '#6ee7b7'
              }}>
                ✅ All paid players have been batched for manufacturing.
              </div>
            )}

            {/* Existing Batches */}
            {batches.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: '#f9fafb' }}>📦 Batches ({batches.length})</h3>
                {batches.map(batch => (
                  <div key={batch.id} className="mfg-batch-card">
                    <div className="mfg-batch-inner">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#f1f5f9' }}>Batch #{batch.batch_number}</strong>
                        {statusBadge(batch.status)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {batch.player_count} players · R{parseFloat(batch.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} · Created {formatDate(batch.created_at)}
                        {batch.submitted_at && ` · Submitted ${formatDate(batch.submitted_at)}`}
                        {batch.paid_at && ` · Paid ${formatDate(batch.paid_at)}`}
                      </div>
                      {batch.notes && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>📝 {batch.notes}</div>}
                    </div>
                    <div className="mfg-batch-actions">
                      <button onClick={() => downloadExcel({ batchId: batch.id })} style={{
                        padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                      }}>📥 Excel</button>
                      <button onClick={() => selectBatch(batch)} style={{
                        padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                      }}>👁 View</button>
                      {batch.status === 'created' && (
                        <>
                          <button onClick={() => markBatchStatus(batch.id, 'mark-submitted')} disabled={actionLoading} style={{
                            padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none',
                            background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                          }}>📤 Submitted</button>
                          <button onClick={() => markBatchStatus(batch.id, 'mark-paid')} disabled={actionLoading} style={{
                            padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none',
                            background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                          }}>💰 Paid</button>
                          <button onClick={() => unbatchBatch(batch.id, batch.batch_number, batch.status)} disabled={actionLoading} style={{
                            padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.4)',
                            background: 'rgba(251,191,36,0.1)', color: '#fcd34d', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                          }}>↩ Unbatch</button>
                          <button onClick={() => deleteBatch(batch.id)} disabled={actionLoading} style={{
                            padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)',
                            background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                          }}>🗑</button>
                        </>
                      )}
                      {batch.status === 'submitted' && (
                        <>
                          <button onClick={() => markBatchStatus(batch.id, 'mark-paid')} disabled={actionLoading} style={{
                            padding: '0.45rem 0.85rem', borderRadius: '6px', border: 'none',
                            background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                          }}>💰 Mark Paid</button>
                          <button onClick={() => unbatchBatch(batch.id, batch.batch_number, batch.status)} disabled={actionLoading} style={{
                            padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.4)',
                            background: 'rgba(251,191,36,0.1)', color: '#fcd34d', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                          }}>↩ Unbatch</button>
                        </>
                      )}
                      {batch.status === 'paid' && (
                        <button onClick={() => unbatchBatch(batch.id, batch.batch_number, batch.status)} disabled={actionLoading} style={{
                          padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.4)',
                          background: 'rgba(251,191,36,0.1)', color: '#fcd34d', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                        }}>↩ Unbatch</button>
                      )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BATCH DETAIL VIEW */}
        {!isLoading && view === 'batch-detail' && selectedBatch && (
          <div>
            <div className="mfg-detail-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#f9fafb' }}>
                    {selectedBatch.team_name} — Batch #{selectedBatch.batch_number}
                  </h2>
                  {statusBadge(selectedBatch.status)}
                </div>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
                  {batchPlayers.length} players · Created {formatDate(selectedBatch.created_at)}
                  {selectedBatch.notes && ` · ${selectedBatch.notes}`}
                </p>
              </div>
              <div className="mfg-detail-actions">
                <button onClick={() => downloadExcel({ batchId: selectedBatch.id })} style={{
                  padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #000 0%, #dc0000 100%)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220,0,0,0.3)'
                }}>📥 Download Excel</button>
                {selectedBatch.status === 'created' && (
                  <button onClick={() => markBatchStatus(selectedBatch.id, 'mark-submitted')} disabled={actionLoading} style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                  }}>📤 Submitted</button>
                )}
                <button onClick={() => unbatchBatch(selectedBatch.id, selectedBatch.batch_number, selectedBatch.status)} disabled={actionLoading} style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.4)',
                  background: 'rgba(251,191,36,0.1)', color: '#fcd34d', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                }}>↩ Unbatch</button>
              </div>
            </div>

            {/* Player table - Desktop */}
            <div className="mfg-desktop-table">
            <div style={{
              background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
              padding: '1.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['#', 'Player', 'Sub-Team', 'Shirt', 'Pants', '#', 'Additional', 'Parent', 'Contact'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchPlayers.map((player, idx) => (
                    <tr key={player.id} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#f1f5f9' }}>{player.player_name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#94a3b8' }}>{player.sub_team}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#d1d5db' }}>{player.shirt_size}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#d1d5db' }}>{player.pants_size}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#d1d5db' }}>{player.shirt_number || player.jersey_number || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                        {(player.additional_items || []).map((item, i) => (
                          <div key={i}>{item.name} ({item.size}) x{item.quantity}</div>
                        ))}
                        {(!player.additional_items || player.additional_items.length === 0) && <span style={{ color: '#4b5563' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#d1d5db' }}>{player.parent_name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                        <div style={{ color: '#d1d5db' }}>{player.parent_email}</div>
                        <div style={{ color: '#6b7280' }}>{player.parent_phone}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Player cards - Mobile */}
            <div className="mfg-mobile-cards">
              {batchPlayers.map((player, idx) => (
                <div key={player.id} style={{
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : '#111827',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px',
                  padding: '0.85rem', marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 700, minWidth: '1.5rem' }}>{idx + 1}</span>
                    <strong style={{ fontSize: '0.92rem', color: '#f1f5f9' }}>{player.player_name}</strong>
                    {(player.shirt_number || player.jersey_number) && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>#{player.shirt_number || player.jersey_number}</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem', fontSize: '0.78rem', paddingLeft: '2rem' }}>
                    <div><span style={{ color: '#6b7280' }}>Shirt:</span> <span style={{ color: '#d1d5db' }}>{player.shirt_size || '—'}</span></div>
                    <div><span style={{ color: '#6b7280' }}>Pants:</span> <span style={{ color: '#d1d5db' }}>{player.pants_size || '—'}</span></div>
                    {player.sub_team && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Team:</span> <span style={{ color: '#94a3b8' }}>{player.sub_team}</span></div>}
                    {player.parent_name && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Parent:</span> <span style={{ color: '#94a3b8' }}>{player.parent_name}</span></div>}
                    {player.parent_email && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6b7280' }}>Contact:</span> <span style={{ color: '#94a3b8', wordBreak: 'break-all' }}>{player.parent_email}</span></div>}
                    {(player.additional_items || []).length > 0 && (
                      <div style={{ gridColumn: '1 / -1', color: '#94a3b8' }}>
                        <span style={{ color: '#6b7280' }}>Extras:</span> {player.additional_items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Manufacturer Payment Card */}
            {selectedBatch.status !== 'paid' && (
              <div style={{
                marginTop: '1.5rem', padding: '1.5rem', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(17,24,39,0.95) 50%, rgba(251,191,36,0.06) 100%)',
                border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                <div className="mfg-payment-inner">
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 800, color: '#fcd34d' }}>💳 Manufacturer Payment</h3>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.82rem' }}>
                      {batchPlayers.length} basic kits × R433.50 = R{(batchPlayers.length * 433.50).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      {(() => {
                        const additionalCost = parseFloat(selectedBatch.total_cost || 0) - (batchPlayers.length * 433.50);
                        return additionalCost > 0 ? ` + R${additionalCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} additional items` : '';
                      })()}
                    </p>
                  </div>
                  <div className="mfg-payment-right">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Due to Manufacturer</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24' }}>
                        R{parseFloat(selectedBatch.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <button onClick={() => markBatchStatus(selectedBatch.id, 'mark-paid')} disabled={actionLoading} style={{
                      padding: '0.75rem 2rem', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.4)', minWidth: '160px'
                    }}>
                      {actionLoading ? 'Processing...' : '✅ Mark as Paid'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedBatch.status === 'paid' && (
              <div style={{
                marginTop: '1.5rem', padding: '1.25rem', borderRadius: '12px',
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>✅ Batch Paid</span>
                    <span style={{ marginLeft: '0.75rem', color: '#9ca3af', fontSize: '0.85rem' }}>Paid {formatDate(selectedBatch.paid_at)}</span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>
                    R{parseFloat(selectedBatch.total_cost || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Batch summary */}
            <div style={{
              marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px', fontSize: '0.85rem', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <strong style={{ color: '#d1d5db' }}>Summary:</strong> {batchPlayers.length} players ·
              Shirts: {[...new Set(batchPlayers.map(p => p.shirt_size).filter(Boolean))].sort().join(', ') || 'N/A'} ·
              Pants: {[...new Set(batchPlayers.map(p => p.pants_size).filter(Boolean))].sort().join(', ') || 'N/A'}
              {batchPlayers.filter(p => p.additional_items?.length > 0).length > 0 && (
                <> · {batchPlayers.filter(p => p.additional_items?.length > 0).length} with additional items</>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
