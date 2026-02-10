import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminPlayerRemovals() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [actionType, setActionType] = useState('');
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/player-removal-requests?all=true');
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading removal requests:', error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminMessage('');
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;
    try {
      const res = await fetch('/api/player-removal-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedRequest.id, status: actionType, adminMessage })
      });

      if (res.ok) {
        setMessage(`Request ${actionType} successfully.`);
        setSelectedRequest(null);
        loadRequests();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update request.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating request:', error);
      setMessage('Failed to update request.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <>
      <Head>
        <title>Player Removal Requests - Admin</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <header style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          padding: '0.85rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>🧾 Player Removal Requests</h1>
            <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={loadRequests}
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
              background: '#e0f2fe',
              border: '1px solid #7dd3fc',
              borderRadius: '8px',
              color: '#0c4a6e'
            }}>
              {message}
            </div>
          )}

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Team</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Player</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Sub-team</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Requested</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>
                      No removal requests yet.
                    </td>
                  </tr>
                )}
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#111827' }}>{req.teamName || '—'}</td>
                    <td style={{ padding: '0.75rem', color: '#374151' }}>{req.playerName || '—'}</td>
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{req.subTeam || '—'}</td>
                    <td style={{ padding: '0.75rem', textTransform: 'capitalize', fontWeight: '700', color: req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>
                      {req.status}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{req.createdAt ? new Date(req.createdAt).toLocaleString() : '—'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => openModal(req, 'approved')}
                        disabled={req.status !== 'pending'}
                        style={{
                          padding: '0.4rem 0.75rem',
                          marginRight: '0.5rem',
                          background: req.status !== 'pending' ? '#d1d5db' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: req.status !== 'pending' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(req, 'rejected')}
                        disabled={req.status !== 'pending'}
                        style={{
                          padding: '0.4rem 0.75rem',
                          background: req.status !== 'pending' ? '#d1d5db' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: req.status !== 'pending' ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {selectedRequest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              width: '90%',
              maxWidth: '520px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{actionType === 'approved' ? 'Approve removal' : 'Reject removal'}</h3>
            <p style={{ color: '#6b7280' }}>
              Player: <strong>{selectedRequest.playerName || 'Player'}</strong>
            </p>
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Optional note to team"
              rows={4}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: actionType === 'approved' ? '#10b981' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
