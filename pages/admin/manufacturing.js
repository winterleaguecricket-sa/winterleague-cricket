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

  const downloadExcel = (params) => {
    const qs = new URLSearchParams(params).toString();
    window.open(`/api/manufacturing-export?${qs}`, '_blank');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const statusBadge = (status) => {
    const colors = { created: '#f59e0b', submitted: '#3b82f6', paid: '#10b981' };
    const labels = { created: 'Created', submitted: 'Submitted', paid: 'Paid' };
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
        background: `${colors[status]}20`, color: colors[status], border: `1px solid ${colors[status]}40`
      }}>
        {labels[status] || status}
      </span>
    );
  };

  // Styles
  const containerStyle = { maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
  const headerStyle = { background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)', color: 'white', padding: '0.85rem 1.5rem', marginBottom: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardStyle = { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.2s' };
  const btnPrimary = { padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #000 0%, #dc0000 100%)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' };
  const btnSecondary = { padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' };
  const btnSuccess = { ...btnPrimary, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' };
  const btnWarning = { ...btnPrimary, background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' };
  const btnDanger = { padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' };
  const thStyle = { padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: 700, color: '#374151', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const tdStyle = { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#374151' };

  return (
    <div style={containerStyle}>
      <Head>
        <title>Manufacturing Batches - Admin</title>
      </Head>

      {/* Header */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {view !== 'teams' && (
            <button onClick={goBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              ← Back
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>🏭 Manufacturing Batches</h1>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/orders" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>📦 Orders</Link>
          <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>← Admin</Link>
        </nav>
      </header>

      {/* Message */}
      {message.text && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem',
          background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: message.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {message.text}
        </div>
      )}

      {isLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading...</div>}

      {/* TEAMS LIST VIEW */}
      {!isLoading && view === 'teams' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>Teams Overview</h2>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{teams.length} teams with paid players</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {teams.map(team => (
              <div
                key={team.id}
                onClick={() => selectTeam(team)}
                style={{ ...cardStyle, cursor: 'pointer', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc0000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#111827' }}>{team.team_name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>Paid Players:</span>
                    <strong style={{ marginLeft: '0.3rem', color: '#111827' }}>{team.total_paid_players}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Batched:</span>
                    <strong style={{ marginLeft: '0.3rem', color: '#10b981' }}>{team.batched_players}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Unbatched:</span>
                    <strong style={{ marginLeft: '0.3rem', color: parseInt(team.unbatched_players) > 0 ? '#f59e0b' : '#6b7280' }}>{team.unbatched_players}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Batches:</span>
                    <strong style={{ marginLeft: '0.3rem', color: '#111827' }}>{team.total_batches}</strong>
                  </div>
                </div>
                {parseInt(team.unbatched_players) > 0 && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAM DETAIL VIEW */}
      {!isLoading && view === 'team-detail' && selectedTeam && (
        <div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#111827' }}>{selectedTeam.team_name}</h2>
          <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
            {unbatchedPlayers.length} unbatched players · {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </p>

          {/* Unbatched Players Section */}
          {unbatchedPlayers.length > 0 && (
            <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>
                  ⏳ Unbatched Players ({unbatchedPlayers.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => downloadExcel({ teamId: selectedTeam.id })} style={btnSecondary}>
                    📥 Download Excel (Unbatched)
                  </button>
                  <button onClick={selectAllPlayers} style={btnSecondary}>
                    {selectedPlayerIds.length === unbatchedPlayers.length ? '☐ Deselect All' : '☑ Select All'}
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '40px' }}>
                        <input type="checkbox" checked={selectedPlayerIds.length === unbatchedPlayers.length && unbatchedPlayers.length > 0} onChange={selectAllPlayers} />
                      </th>
                      <th style={thStyle}>Player</th>
                      <th style={thStyle}>Sub-Team</th>
                      <th style={thStyle}>Shirt</th>
                      <th style={thStyle}>Pants</th>
                      <th style={thStyle}>Additional</th>
                      <th style={thStyle}>Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unbatchedPlayers.map(player => (
                      <tr
                        key={player.id}
                        style={{ background: selectedPlayerIds.includes(player.id) ? '#eff6ff' : 'transparent' }}
                        onClick={() => togglePlayerSelection(player.id)}
                      >
                        <td style={tdStyle}>
                          <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => {}} />
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{player.player_name}</td>
                        <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#6b7280' }}>{player.sub_team}</td>
                        <td style={tdStyle}>{player.shirt_size}</td>
                        <td style={tdStyle}>{player.pants_size}</td>
                        <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                          {(player.additional_items || []).map((item, i) => (
                            <div key={i}>{item.name} ({item.size})</div>
                          ))}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                          <div>{player.parent_name}</div>
                          <div style={{ color: '#6b7280' }}>{player.parent_email}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Create Batch Controls */}
              {selectedPlayerIds.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>
                      {selectedPlayerIds.length} player{selectedPlayerIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <input
                      type="text"
                      placeholder="Batch notes (optional)"
                      value={batchNotes}
                      onChange={e => setBatchNotes(e.target.value)}
                      style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                    />
                    <button onClick={createBatch} disabled={actionLoading} style={btnSuccess}>
                      {actionLoading ? 'Creating...' : `🏭 Create Batch (${selectedPlayerIds.length})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {unbatchedPlayers.length === 0 && (
            <div style={{ ...cardStyle, borderLeft: '4px solid #10b981', textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              ✅ All paid players have been batched for manufacturing.
            </div>
          )}

          {/* Existing Batches */}
          {batches.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#111827' }}>📦 Batches ({batches.length})</h3>
              {batches.map(batch => (
                <div key={batch.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '1rem' }}>Batch #{batch.batch_number}</strong>
                      {statusBadge(batch.status)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {batch.player_count} players · Created {formatDate(batch.created_at)}
                      {batch.submitted_at && ` · Submitted ${formatDate(batch.submitted_at)}`}
                      {batch.paid_at && ` · Paid ${formatDate(batch.paid_at)}`}
                    </div>
                    {batch.notes && <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' }}>📝 {batch.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => downloadExcel({ batchId: batch.id })} style={btnSecondary}>📥 Excel</button>
                    <button onClick={() => selectBatch(batch)} style={btnSecondary}>👁 View</button>
                    {batch.status === 'created' && (
                      <>
                        <button onClick={() => markBatchStatus(batch.id, 'mark-submitted')} disabled={actionLoading} style={btnWarning}>📤 Mark Submitted</button>
                        <button onClick={() => markBatchStatus(batch.id, 'mark-paid')} disabled={actionLoading} style={btnSuccess}>💰 Mark Paid</button>
                        <button onClick={() => deleteBatch(batch.id)} disabled={actionLoading} style={btnDanger}>🗑</button>
                      </>
                    )}
                    {batch.status === 'submitted' && (
                      <button onClick={() => markBatchStatus(batch.id, 'mark-paid')} disabled={actionLoading} style={btnSuccess}>💰 Mark Paid</button>
                    )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
                  {selectedBatch.team_name} — Batch #{selectedBatch.batch_number}
                </h2>
                {statusBadge(selectedBatch.status)}
              </div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
                {batchPlayers.length} players · Created {formatDate(selectedBatch.created_at)}
                {selectedBatch.notes && ` · ${selectedBatch.notes}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => downloadExcel({ batchId: selectedBatch.id })} style={btnPrimary}>📥 Download Excel</button>
              {selectedBatch.status === 'created' && (
                <>
                  <button onClick={() => markBatchStatus(selectedBatch.id, 'mark-submitted')} disabled={actionLoading} style={btnWarning}>📤 Submitted</button>
                  <button onClick={() => markBatchStatus(selectedBatch.id, 'mark-paid')} disabled={actionLoading} style={btnSuccess}>💰 Paid</button>
                </>
              )}
              {selectedBatch.status === 'submitted' && (
                <button onClick={() => markBatchStatus(selectedBatch.id, 'mark-paid')} disabled={actionLoading} style={btnSuccess}>💰 Mark Paid</button>
              )}
            </div>
          </div>

          {/* Player table */}
          <div style={{ ...cardStyle, overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Player Name</th>
                  <th style={thStyle}>Sub-Team / Age Group</th>
                  <th style={thStyle}>Shirt Size</th>
                  <th style={thStyle}>Pants Size</th>
                  <th style={thStyle}>Jersey #</th>
                  <th style={thStyle}>Additional Items</th>
                  <th style={thStyle}>Parent Name</th>
                  <th style={thStyle}>Parent Contact</th>
                </tr>
              </thead>
              <tbody>
                {batchPlayers.map((player, idx) => (
                  <tr key={player.id} style={{ background: idx % 2 === 0 ? '#fafafa' : '#fff' }}>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{player.player_name}</td>
                    <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#6b7280' }}>{player.sub_team}</td>
                    <td style={tdStyle}>{player.shirt_size}</td>
                    <td style={tdStyle}>{player.pants_size}</td>
                    <td style={tdStyle}>{player.jersey_number || '-'}</td>
                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                      {(player.additional_items || []).map((item, i) => (
                        <div key={i}>{item.name} ({item.size}) x{item.quantity}</div>
                      ))}
                      {(!player.additional_items || player.additional_items.length === 0) && <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={tdStyle}>{player.parent_name}</td>
                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                      <div>{player.parent_email}</div>
                      <div style={{ color: '#6b7280' }}>{player.parent_phone}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Batch summary */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
            <strong>Summary:</strong> {batchPlayers.length} players ·
            Shirts: {[...new Set(batchPlayers.map(p => p.shirt_size).filter(Boolean))].sort().join(', ') || 'N/A'} ·
            Pants: {[...new Set(batchPlayers.map(p => p.pants_size).filter(Boolean))].sort().join(', ') || 'N/A'}
            {batchPlayers.filter(p => p.additional_items?.length > 0).length > 0 && (
              <> · {batchPlayers.filter(p => p.additional_items?.length > 0).length} with additional items</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
