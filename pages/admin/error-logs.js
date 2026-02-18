// Admin Error Logs Viewer
// View server errors, form events, and payment events

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/admin.module.css';

const LOG_TYPES = [
  { id: 'api-errors', label: 'API Errors', icon: '🔴' },
  { id: 'app-errors', label: 'App Errors', icon: '🟠' },
  { id: 'form-events', label: 'Form Events', icon: '📝' },
  { id: 'payment-events', label: 'Payment Events', icon: '💳' },
  { id: 'server', label: 'Server Events', icon: '🖥️' },
];

export default function ErrorLogs() {
  const [activeLog, setActiveLog] = useState('api-errors');
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [expandedEntry, setExpandedEntry] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/error-logs?log=${activeLog}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
    setLoading(false);
  }, [activeLog, limit]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/error-logs?stats=true');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-ZA', { 
        dateStyle: 'short', 
        timeStyle: 'medium',
        timeZone: 'Africa/Johannesburg'
      });
    } catch {
      return ts;
    }
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'FATAL': return '#ff4444';
      case 'ERROR': return '#ff6b6b';
      case 'WARN': return '#ffa726';
      case 'INFO': return '#66bb6a';
      default: return '#aaa';
    }
  };

  return (
    <>
      <Head>
        <title>Error Logs | Admin</title>
      </Head>

      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '20px', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#e0e0e0',
        background: '#1a1a2e',
        minHeight: '100vh'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Server Logs</h1>
          <Link href="/admin" style={{ color: '#64b5f6', textDecoration: 'none' }}>
            ← Back to Admin
          </Link>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            marginBottom: 20, 
            flexWrap: 'wrap' 
          }}>
            {LOG_TYPES.map(lt => {
              const s = stats[lt.id];
              return (
                <div key={lt.id} style={{
                  background: activeLog === lt.id ? '#2a2a4e' : '#16213e',
                  border: activeLog === lt.id ? '1px solid #64b5f6' : '1px solid #333',
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  minWidth: 140,
                  transition: 'all 0.2s'
                }} onClick={() => setActiveLog(lt.id)}>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{lt.icon} {lt.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {s?.lines ?? 0} <span style={{ fontSize: '0.7rem', color: '#888' }}>entries</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>{s?.sizeHuman || '0 B'}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Log Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {LOG_TYPES.map(lt => (
            <button
              key={lt.id}
              onClick={() => setActiveLog(lt.id)}
              style={{
                padding: '8px 16px',
                background: activeLog === lt.id ? '#64b5f6' : '#16213e',
                color: activeLog === lt.id ? '#000' : '#ccc',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: activeLog === lt.id ? 'bold' : 'normal'
              }}
            >
              {lt.icon} {lt.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{
              background: '#16213e', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: '4px 8px'
            }}>
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>
            <button onClick={fetchLogs} style={{
              padding: '6px 14px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
            }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Log Entries */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', background: '#16213e', borderRadius: 8 }}>
            No entries found in {activeLog}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {entries.map((entry, idx) => (
              <div key={idx} style={{
                background: '#16213e',
                borderRadius: 6,
                padding: '10px 14px',
                cursor: 'pointer',
                borderLeft: `3px solid ${getLevelColor(entry.level)}`,
                transition: 'background 0.15s'
              }}
                onClick={() => setExpandedEntry(expandedEntry === idx ? null : idx)}
                onMouseEnter={e => e.currentTarget.style.background = '#1e1e3e'}
                onMouseLeave={e => e.currentTarget.style.background = '#16213e'}
              >
                {/* Summary row */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: '#666', minWidth: 140, fontSize: '0.75rem' }}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  {entry.level && (
                    <span style={{ 
                      color: getLevelColor(entry.level), 
                      fontWeight: 'bold', 
                      minWidth: 50,
                      fontSize: '0.75rem'
                    }}>
                      {entry.level}
                    </span>
                  )}
                  {entry.method && (
                    <span style={{ 
                      background: '#333', 
                      padding: '2px 6px', 
                      borderRadius: 3, 
                      fontSize: '0.75rem',
                      color: entry.method === 'POST' ? '#66bb6a' : '#64b5f6'
                    }}>
                      {entry.method}
                    </span>
                  )}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.url || entry.message || entry.action || entry.type || '—'}
                  </span>
                  {entry.statusCode && (
                    <span style={{ 
                      color: entry.statusCode >= 500 ? '#ff6b6b' : entry.statusCode >= 400 ? '#ffa726' : '#66bb6a',
                      fontWeight: 'bold',
                      fontSize: '0.8rem'
                    }}>
                      {entry.statusCode}
                    </span>
                  )}
                  {entry.duration && (
                    <span style={{ color: '#888', fontSize: '0.75rem' }}>{entry.duration}ms</span>
                  )}
                </div>
                
                {/* Error message preview */}
                {entry.error && expandedEntry !== idx && (
                  <div style={{ 
                    color: '#ff8a80', 
                    fontSize: '0.8rem', 
                    marginTop: 4, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {entry.error}
                  </div>
                )}

                {/* Expanded details */}
                {expandedEntry === idx && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #333', paddingTop: 10, fontSize: '0.8rem' }}>
                    <pre style={{
                      background: '#0d1117',
                      padding: 12,
                      borderRadius: 6,
                      overflow: 'auto',
                      maxHeight: 400,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#c9d1d9',
                      fontSize: '0.75rem',
                      margin: 0
                    }}>
                      {JSON.stringify(entry, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
