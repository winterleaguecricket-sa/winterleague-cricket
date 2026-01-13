import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/adminOrders.module.css';
import { getAllOrders, getProductOrders, getPlayerRegistrationOrders, getTeamRegistrationOrders, updateOrderStatus, addTrackingInfo, getOrderStats, getProductOrderStats, getPlayerRegistrationStats, getTeamRegistrationStats } from '../../data/orders';

export default function OrderManagement() {
  const [orders, setOrders] = useState(getAllOrders());
  const [stats, setStats] = useState(getOrderStats());
  const [filterStatus, setFilterStatus] = useState('all');
  const [orderType, setOrderType] = useState('all'); // all, products, player-registration, team-registration
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCourier, setTrackingCourier] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Get current stats based on order type
  const getCurrentStats = () => {
    if (orderType === 'products') return getProductOrderStats();
    if (orderType === 'player-registration') return getPlayerRegistrationStats();
    if (orderType === 'team-registration') return getTeamRegistrationStats();
    return getOrderStats();
  };

  const currentStats = getCurrentStats();

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: '#f59e0b' },
    { value: 'processing', label: 'Processing', color: '#3b82f6' },
    { value: 'shipped', label: 'Shipped', color: '#8b5cf6' },
    { value: 'delivered', label: 'Delivered', color: '#10b981' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
  ];

  const filteredOrders = orders.filter(order => {
    // Filter by order type
    const matchesType = orderType === 'all' || 
      (orderType === 'products' && order.orderType !== 'player-registration' && order.orderType !== 'team-registration') ||
      (orderType === 'player-registration' && order.orderType === 'player-registration') ||
      (orderType === 'team-registration' && order.orderType === 'team-registration');
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleStatusChange = (orderId, newStatus) => {
    updateOrderStatus(orderId, newStatus, statusNotes);
    setOrders(getAllOrders());
    setStats(getOrderStats());
    setStatusNotes('');
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(orders.find(o => o.id === orderId));
    }
  };

  const handleAddTracking = (orderId) => {
    if (trackingNumber && trackingCourier) {
      addTrackingInfo(orderId, trackingNumber, trackingCourier);
      setOrders(getAllOrders());
      setTrackingNumber('');
      setTrackingCourier('');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(orders.find(o => o.id === orderId));
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `R ${amount.toFixed(2)}`;
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Order Management - Admin Panel</title>
      </Head>

      <header style={{
        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
        color: 'white',
        padding: '0.85rem 1.5rem',
        marginBottom: '1.5rem',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>📦 Order Management</h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>← Back to Admin</Link>
            <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>View Store</Link>
          </nav>
        </div>
      </header>

      <main style={{ padding: '0 1.5rem' }}>
        {/* Order Type Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          <button
            onClick={() => setOrderType('all')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: orderType === 'all' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: orderType === 'all' ? 'white' : '#374151',
              fontWeight: orderType === 'all' ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📋 All Orders ({orders.length})
          </button>
          <button
            onClick={() => setOrderType('products')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: orderType === 'products' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: orderType === 'products' ? 'white' : '#374151',
              fontWeight: orderType === 'products' ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🛍️ Product Orders ({getProductOrders().length})
          </button>
          <button
            onClick={() => setOrderType('player-registration')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: orderType === 'player-registration' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: orderType === 'player-registration' ? 'white' : '#374151',
              fontWeight: orderType === 'player-registration' ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🏏 Player Registrations ({getPlayerRegistrationOrders().length})
          </button>
          <button
            onClick={() => setOrderType('team-registration')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: orderType === 'team-registration' 
                ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                : '#f3f4f6',
              color: orderType === 'team-registration' ? 'white' : '#374151',
              fontWeight: orderType === 'team-registration' ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            👥 Team Registrations ({getTeamRegistrationOrders().length})
          </button>
        </div>
        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem' }}>📦</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{currentStats.total}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Orders</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem' }}>⏳</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{currentStats.pending}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pending</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem' }}>🔄</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{currentStats.processing}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Processing</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem' }}>🚚</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{currentStats.shipped}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Shipped</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>{currentStats.delivered}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Delivered</div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '2rem' }}>💰</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{formatCurrency(currentStats.totalRevenue)}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Total Revenue</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search by order number, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.55rem 0.85rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '0.5rem 0.85rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: filterStatus === 'all' ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' : 'white',
                color: filterStatus === 'all' ? 'white' : '#374151',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              All ({orders.length})
            </button>
            {statusOptions.map(status => (
              <button
                key={status.value}
                onClick={() => setFilterStatus(status.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  border: `2px solid ${status.color}`,
                  borderRadius: '6px',
                  background: filterStatus === status.value ? status.color : 'white',
                  color: filterStatus === status.value ? 'white' : status.color,
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {status.label} ({orders.filter(o => o.status === status.value).length})
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white'
              }}>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Order #</th>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Items</th>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Total</th>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: '700', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={{
                  borderBottom: '1px solid #e5e7eb',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '0.75rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#111827' }}>{order.orderNumber}</strong>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827' }}>{order.customerName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{order.customerEmail}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{order.customerPhone}</div>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#374151' }}>{order.items.length} item(s)</td>
                  <td style={{ padding: '0.75rem' }}><strong style={{ fontSize: '0.9rem', color: '#111827' }}>{formatCurrency(order.total)}</strong></td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      background: statusOptions.find(s => s.value === order.status)?.color || '#6b7280',
                      color: 'white',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      textTransform: 'capitalize'
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>{formatDate(order.createdAt)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <>
          <div className={styles.modalOverlay} onClick={() => setSelectedOrder(null)}></div>
          <div className={styles.modalContainer}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>Order Details - {selectedOrder.orderNumber}</h2>
                <button onClick={() => setSelectedOrder(null)} className={styles.closeButton}>✕</button>
              </div>

              <div className={styles.modalBody}>
                {/* Customer Info */}
                <section className={styles.section}>
                  <h3>Customer Information</h3>
                  <div className={styles.infoGrid}>
                    <div>
                      <strong>Name:</strong> {selectedOrder.customerName}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedOrder.customerEmail}
                    </div>
                    <div>
                      <strong>Phone:</strong> {selectedOrder.customerPhone}
                    </div>
                  </div>
                </section>

                {/* Shipping Address */}
                <section className={styles.section}>
                  <h3>Shipping Address</h3>
                  <div className={styles.address}>
                    {selectedOrder.shippingAddress.street}<br />
                    {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province}<br />
                    {selectedOrder.shippingAddress.postalCode}
                  </div>
                </section>

                {/* Order Items */}
                <section className={styles.section}>
                  <h3>Order Items</h3>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{item.size || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td>{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4"><strong>Subtotal:</strong></td>
                        <td><strong>{formatCurrency(selectedOrder.subtotal)}</strong></td>
                      </tr>
                      <tr>
                        <td colSpan="4"><strong>Shipping:</strong></td>
                        <td><strong>{formatCurrency(selectedOrder.shipping)}</strong></td>
                      </tr>
                      <tr className={styles.totalRow}>
                        <td colSpan="4"><strong>Total:</strong></td>
                        <td><strong>{formatCurrency(selectedOrder.total)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </section>

                {/* Status Management */}
                <section className={styles.section}>
                  <h3>Update Order Status</h3>
                  <div className={styles.statusForm}>
                    <div className={styles.statusButtons}>
                      {statusOptions.map(status => (
                        <button
                          key={status.value}
                          className={`${styles.statusButton} ${selectedOrder.status === status.value ? styles.currentStatus : ''}`}
                          onClick={() => handleStatusChange(selectedOrder.id, status.value)}
                          style={{ borderColor: status.color, color: status.color }}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Add notes about status change..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      className={styles.statusNotes}
                      rows="2"
                    />
                  </div>
                </section>

                {/* Tracking Information */}
                <section className={styles.section}>
                  <h3>Tracking Information</h3>
                  {selectedOrder.tracking ? (
                    <div className={styles.trackingInfo}>
                      <p><strong>Tracking Number:</strong> {selectedOrder.tracking.number}</p>
                      <p><strong>Courier:</strong> {selectedOrder.tracking.courier}</p>
                      <p><strong>Added:</strong> {formatDate(selectedOrder.tracking.addedAt)}</p>
                    </div>
                  ) : (
                    <div className={styles.trackingForm}>
                      <input
                        type="text"
                        placeholder="Tracking Number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className={styles.input}
                      />
                      <input
                        type="text"
                        placeholder="Courier (e.g., PostNet, Courier Guy, etc.)"
                        value={trackingCourier}
                        onChange={(e) => setTrackingCourier(e.target.value)}
                        className={styles.input}
                      />
                      <button
                        onClick={() => handleAddTracking(selectedOrder.id)}
                        className={styles.addButton}
                      >
                        Add Tracking Info
                      </button>
                    </div>
                  )}
                </section>

                {/* Status History */}
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <section className={styles.section}>
                    <h3>Status History</h3>
                    <div className={styles.timeline}>
                      {selectedOrder.statusHistory.map((history, index) => (
                        <div key={index} className={styles.timelineItem}>
                          <div className={styles.timelineDot}></div>
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineStatus}>
                              <span 
                                className={styles.statusBadge}
                                style={{ 
                                  background: statusOptions.find(s => s.value === history.status)?.color 
                                }}
                              >
                                {history.status}
                              </span>
                            </div>
                            <div className={styles.timelineDate}>{formatDate(history.timestamp)}</div>
                            {history.notes && <div className={styles.timelineNotes}>{history.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
