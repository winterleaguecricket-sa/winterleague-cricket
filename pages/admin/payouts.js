import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminPayouts() {
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, paid, rejected
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState(''); // approve, reject
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPayoutRequests();
  }, []);

  const loadPayoutRequests = async () => {
    try {
      const res = await fetch('/api/team-finance?action=allPayouts');
      const data = await res.json();
      const requests = data.requests || [];
      console.log('Loading payout requests:', requests);
      console.log('Total requests:', requests.length);
      setPayoutRequests(requests);
    } catch (err) {
      console.error('Error loading payouts:', err);
    }
  };

  const filteredRequests = payoutRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const handleOpenModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setNotes('');
    setShowModal(true);
  };

  const handleProcessPayout = async () => {
    if (!selectedRequest) return;

    try {
      const res = await fetch('/api/team-finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processPayout', payoutId: selectedRequest.id, notes })
      });
      
      if (res.ok) {
        setMessage(`Payout #${selectedRequest.id} processed successfully!`);
        await loadPayoutRequests();
        setShowModal(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Failed to process payout #${selectedRequest.id}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage(`Failed to process payout #${selectedRequest.id}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedRequest) return;

    try {
      const res = await fetch('/api/team-finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rejectPayout', payoutId: selectedRequest.id, notes })
      });
      
      if (res.ok) {
        setMessage(`Payout #${selectedRequest.id} rejected`);
        await loadPayoutRequests();
        setShowModal(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Failed to reject payout #${selectedRequest.id}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage(`Failed to reject payout #${selectedRequest.id}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const pendingCount = payoutRequests.filter(r => r.status === 'pending').length;
  const totalPendingAmount = payoutRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <Head>
        <title>Payout Management - Admin Panel</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <header style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          padding: '0.85rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>💰 Payout Management</h1>
            <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={loadPayoutRequests}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                🔄 Refresh
              </button>
              <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>← Back to Admin</Link>
              <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>View Store</Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
          {message && (
            <div style={{
              padding: '1rem',
              background: message.includes('success') ? '#d1fae5' : '#fee2e2',
              border: message.includes('success') ? '2px solid #86efac' : '2px solid #fca5a5',
              borderRadius: '8px',
              color: message.includes('success') ? '#065f46' : '#991b1b',
              marginBottom: '1.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              {message}
            </div>
          )}

          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '600' }}>
                Pending Requests
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                {pendingCount}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #dc0000 0%, #b91c1c 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 12px rgba(220, 0, 0, 0.3)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '600' }}>
                Pending Amount
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                R{totalPendingAmount.toFixed(2)}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '600' }}>
                Total Requests
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                {payoutRequests.length}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem'
          }}>
            {[
              { key: 'all', label: 'All Requests' },
              { key: 'pending', label: 'Pending' },
              { key: 'paid', label: 'Paid' },
              { key: 'rejected', label: 'Rejected' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: filter === tab.key 
                    ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                    : '#f3f4f6',
                  color: filter === tab.key ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
                {tab.key === 'pending' && pendingCount > 0 && (
                  <span style={{
                    marginLeft: '0.5rem',
                    background: filter === tab.key ? 'rgba(255,255,255,0.3)' : '#dc0000',
                    color: 'white',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: '900'
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Payout Requests List */}
          {filteredRequests.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredRequests.map(request => (
                <div
                  key={request.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: request.status === 'pending' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                    padding: '1.5rem',
                    boxShadow: request.status === 'pending' ? '0 4px 12px rgba(245, 158, 11, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                          {request.teamName}
                        </h3>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: request.status === 'pending' ? '#fef3c7' :
                                     request.status === 'paid' ? '#d1fae5' :
                                     request.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                          color: request.status === 'pending' ? '#92400e' :
                                request.status === 'paid' ? '#065f46' :
                                request.status === 'rejected' ? '#991b1b' : '#374151'
                        }}>
                          {request.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        <strong>Coach:</strong> {request.coachName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        <strong>Email:</strong> {request.email} • <strong>Phone:</strong> {request.phone}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        <strong>Request ID:</strong> #{request.id} • <strong>Requested:</strong> {new Date(request.requestedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: '#dc0000', marginBottom: '0.25rem' }}>
                        R{request.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                        Player Registration Markup
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#059669' }}>
                        R{request.breakdown.markup.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '600' }}>
                        Product Commission (10%)
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2563eb' }}>
                        R{request.breakdown.commission.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Banking Details */}
                  {request.bankingDetails ? (
                    <div style={{
                      padding: '1rem',
                      background: '#dbeafe',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏦 Banking Details
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#6b7280', fontWeight: '600' }}>Account Holder:</span>
                          <div style={{ color: '#111827', fontWeight: '700' }}>{request.bankingDetails.accountHolder}</div>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontWeight: '600' }}>Bank:</span>
                          <div style={{ color: '#111827', fontWeight: '700' }}>{request.bankingDetails.bankName}</div>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontWeight: '600' }}>Account Number:</span>
                          <div style={{ color: '#111827', fontWeight: '700', fontFamily: 'monospace' }}>{request.bankingDetails.accountNumber}</div>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontWeight: '600' }}>Branch Code:</span>
                          <div style={{ color: '#111827', fontWeight: '700', fontFamily: 'monospace' }}>{request.bankingDetails.branchCode}</div>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280', fontWeight: '600' }}>Account Type:</span>
                          <div style={{ color: '#111827', fontWeight: '700' }}>{request.bankingDetails.accountType}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: '#fef3c7',
                      border: '1px solid #fbbf24',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#92400e',
                      marginBottom: '1rem'
                    }}>
                      ⚠️ No banking details provided by team
                    </div>
                  )}

                  {request.notes && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#374151',
                      marginBottom: '1rem'
                    }}>
                      <strong>Notes:</strong> {request.notes}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => handleOpenModal(request, 'approve')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        ✓ Process Payout
                      </button>
                      <button
                        onClick={() => handleOpenModal(request, 'reject')}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {request.status === 'paid' && request.processedAt && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#d1fae5',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#065f46',
                      marginTop: '1rem'
                    }}>
                      ✓ Paid on {new Date(request.processedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: 'white',
              padding: '3rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                No {filter !== 'all' && filter} payout requests found
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                Payout requests from teams will appear here.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem', color: '#111827' }}>
              {actionType === 'approve' ? 'Process Payout' : 'Reject Payout'}
            </h2>
            
            <div style={{
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                <strong>Team:</strong> {selectedRequest.teamName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                <strong>Amount:</strong> R{selectedRequest.amount.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                <strong>Request ID:</strong> #{selectedRequest.id}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '700',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                color: '#374151'
              }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this payout..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={actionType === 'approve' ? handleProcessPayout : handleRejectPayout}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: actionType === 'approve' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {actionType === 'approve' ? 'Confirm Payout' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
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
