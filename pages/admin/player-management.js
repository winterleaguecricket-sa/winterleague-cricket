import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminPlayerManagement() {
  const [newPlayers, setNewPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [filter, setFilter] = useState('pending'); // pending, uploaded, all
  const [resyncLoading, setResyncLoading] = useState(false);

  const loadNewPlayers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/new-players');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNewPlayers(data.players || []);
    } catch (error) {
      console.error('Error loading new players:', error);
      setMessage('Failed to load players');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewPlayers();
  }, []);

  const handleResync = async () => {
    setResyncLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/resync-players', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to resync players');
      }
      setMessage(`Resync complete: ${data.playersInserted} team players, ${data.newPlayersAdded} new-player entries.`);
      loadNewPlayers();
      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      console.error('Error resyncing players:', error);
      setMessage('Failed to resync players');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setResyncLoading(false);
    }
  };

  const markAsUploaded = async (playerIds) => {
    try {
      const res = await fetch('/api/new-players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds, status: 'uploaded' })
      });
      
      if (res.ok) {
        setMessage(`${playerIds.length} player(s) marked as uploaded to CricClubs`);
        setSelectedPlayers(new Set());
        loadNewPlayers();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating players:', error);
      setMessage('Failed to update players');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const toggleSelectAll = () => {
    const filtered = filteredPlayers;
    if (selectedPlayers.size === filtered.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(filtered.map(p => p.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPlayers(newSelected);
  };

  const filteredPlayers = newPlayers.filter(p => {
    if (filter === 'pending') return p.uploadedToCricClubs !== true;
    if (filter === 'uploaded') return p.uploadedToCricClubs === true;
    return true;
  });

  const pendingCount = newPlayers.filter(p => p.uploadedToCricClubs !== true).length;
  const uploadedCount = newPlayers.filter(p => p.uploadedToCricClubs === true).length;

  return (
    <>
      <Head>
        <title>Player Management - Admin</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0b0f19' }}>
        <header style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          padding: '0.85rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>👥 Player Management</h1>
            <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={loadNewPlayers}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleResync}
                disabled={resyncLoading}
                style={{
                  padding: '0.5rem 1rem',
                  background: resyncLoading ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: resyncLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {resyncLoading ? '⏳ Resyncing...' : '🧭 Resync Players'}
              </button>
              <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
                ← Back to Admin
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
          {message && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              background: message.includes('Failed') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: message.includes('Failed') ? '#fca5a5' : '#6ee7b7',
              borderRadius: '8px',
              border: message.includes('Failed') ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              fontWeight: '600'
            }}>
              {message}
            </div>
          )}

          {/* Info Card */}
          <div style={{
            background: '#111827',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            border: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: '#f9fafb' }}>
              📋 New Players to Upload to CricClubs
            </h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
              This table shows players who registered without selecting an existing CricClubs profile. 
              These players need to be manually added to the <a href="https://www.cricclubs.com/Winterleaguecricket/searchPlayer.do?clubId=5817" target="_blank" rel="noopener noreferrer" style={{ color: '#f87171' }}>CricClubs player database</a>. 
              Once uploaded, mark them as complete to remove from the pending list.
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(120, 53, 15, 0.35) 100%)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid rgba(245, 158, 11, 0.35)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fde68a' }}>{pendingCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: '600' }}>Pending Upload</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 95, 70, 0.35) 100%)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#6ee7b7' }}>{uploadedCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: '600' }}>Uploaded to CricClubs</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(49, 46, 129, 0.35) 100%)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid rgba(99, 102, 241, 0.35)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#c7d2fe' }}>{newPlayers.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#a5b4fc', fontWeight: '600' }}>Total New Players</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('pending')}
              style={{
                padding: '0.5rem 1rem',
                background: filter === 'pending' ? 'rgba(239, 68, 68, 0.2)' : '#111827',
                color: filter === 'pending' ? '#fee2e2' : '#9ca3af',
                border: filter === 'pending' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('uploaded')}
              style={{
                padding: '0.5rem 1rem',
                background: filter === 'uploaded' ? 'rgba(16, 185, 129, 0.2)' : '#111827',
                color: filter === 'uploaded' ? '#d1fae5' : '#9ca3af',
                border: filter === 'uploaded' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Uploaded ({uploadedCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '0.5rem 1rem',
                background: filter === 'all' ? 'rgba(99, 102, 241, 0.2)' : '#111827',
                color: filter === 'all' ? '#e0e7ff' : '#9ca3af',
                border: filter === 'all' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              All ({newPlayers.length})
            </button>
          </div>

          {/* Action Bar */}
          {selectedPlayers.size > 0 && filter === 'pending' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid rgba(245, 158, 11, 0.4)'
            }}>
              <span style={{ fontWeight: '600', color: '#fde68a' }}>
                {selectedPlayers.size} player(s) selected
              </span>
              <button
                onClick={() => markAsUploaded(Array.from(selectedPlayers))}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✓ Mark as Uploaded to CricClubs
              </button>
            </div>
          )}

          {/* Table */}
          <div style={{
            background: '#111827',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
            border: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                Loading players...
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                {filter === 'pending' 
                  ? '🎉 No pending players to upload! All players have existing CricClubs profiles or have been uploaded.'
                  : filter === 'uploaded'
                  ? 'No players marked as uploaded yet.'
                  : 'No new player registrations found.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    {filter === 'pending' && (
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left', width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={selectedPlayers.size === filteredPlayers.length && filteredPlayers.length > 0}
                          onChange={toggleSelectAll}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </th>
                    )}
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Player Name</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Email</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Team</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Date of Birth</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Registration Date</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Status</th>
                    {filter !== 'pending' && (
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '600', color: '#cbd5f5', fontSize: '0.85rem' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player, idx) => (
                    <tr 
                      key={player.id}
                      style={{ 
                        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                        background: idx % 2 === 0 ? '#111827' : '#0f172a'
                      }}
                    >
                      {filter === 'pending' && (
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedPlayers.has(player.id)}
                            onChange={() => toggleSelect(player.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '0.875rem 1rem', fontWeight: '600', color: '#f9fafb' }}>
                        {player.playerName}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        {player.email || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        {player.team || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        {player.dob || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        {player.registrationDate ? new Date(player.registrationDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        {player.uploadedToCricClubs ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#6ee7b7',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            ✓ Uploaded
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#fde68a',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            Pending
                          </span>
                        )}
                      </td>
                      {filter !== 'pending' && (
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {player.uploadedToCricClubs ? (
                            <button
                              onClick={() => markAsUploaded([player.id])}
                              style={{
                                padding: '0.35rem 0.75rem',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #f59e0b',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              Undo
                            </button>
                          ) : (
                            <button
                              onClick={() => markAsUploaded([player.id])}
                              style={{
                                padding: '0.35rem 0.75rem',
                                background: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              Mark Uploaded
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
