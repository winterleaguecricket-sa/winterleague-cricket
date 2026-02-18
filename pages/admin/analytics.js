import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [siteConfig, setSiteConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, configRes] = await Promise.all([
          fetch('/api/analytics'),
          fetch('/api/site-config'),
        ]);
        const analyticsData = await analyticsRes.json();
        const configData = await configRes.json();
        if (analyticsData.success) setAnalytics(analyticsData);
        if (configData.success) setSiteConfig(configData.config);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const gaConnected = siteConfig?.ga4MeasurementId && siteConfig.ga4MeasurementId.startsWith('G-');
  const lookerUrl = siteConfig?.lookerStudioUrl;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Loading analytics...</div>
      </div>
    );
  }

  const maxChartValue = analytics?.chartData ? Math.max(...analytics.chartData.map(d => d.views), 1) : 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Head>
        <title>Analytics Dashboard | Admin</title>
      </Head>

      {/* Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Admin
          </Link>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
            📊 Analytics Dashboard
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {gaConnected ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.75rem', background: '#166534', borderRadius: '20px',
              fontSize: '0.8rem', fontWeight: '600', color: '#bbf7d0'
            }}>
              ● GA4 Connected ({siteConfig.ga4MeasurementId})
            </span>
          ) : (
            <Link href="/admin/settings" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.75rem', background: '#92400e', borderRadius: '20px',
              fontSize: '0.8rem', fontWeight: '600', color: '#fde68a', textDecoration: 'none'
            }}>
              ⚠ Connect GA4 →
            </Link>
          )}
          {gaConnected && (
            <a
              href={`https://analytics.google.com/analytics/web/#/p${siteConfig.ga4MeasurementId.replace('G-', '')}/realtime/overview`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.4rem 0.75rem', background: '#1e40af', borderRadius: '20px',
                fontSize: '0.8rem', fontWeight: '600', color: '#dbeafe', textDecoration: 'none'
              }}
            >
              Open Google Analytics ↗
            </a>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0', borderBottom: '1px solid #334155',
        background: '#1e293b', padding: '0 2rem', overflowX: 'auto'
      }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'pages', label: 'Top Pages' },
          { key: 'referrers', label: 'Referrers' },
          ...(lookerUrl ? [{ key: 'ga-dashboard', label: 'GA4 Dashboard' }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              color: activeTab === tab.key ? '#60a5fa' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #60a5fa' : '2px solid transparent',
              fontWeight: activeTab === tab.key ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Stat Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <StatCard
                label="Today"
                value={analytics?.today?.views || 0}
                subtitle={`Top: ${analytics?.today?.topPage || '-'}`}
                color="#3b82f6"
              />
              <StatCard
                label="Yesterday"
                value={analytics?.yesterday?.views || 0}
                subtitle={analytics?.today?.views > analytics?.yesterday?.views ? '↑ Trending up' : analytics?.today?.views < analytics?.yesterday?.views ? '↓ Lower today' : '→ Same'}
                color="#8b5cf6"
              />
              <StatCard
                label="This Week"
                value={analytics?.week?.views || 0}
                subtitle="Last 7 days"
                color="#06b6d4"
              />
              <StatCard
                label="This Month"
                value={analytics?.month?.views || 0}
                subtitle="Last 30 days"
                color="#10b981"
              />
            </div>

            {/* Chart */}
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #334155',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: '#94a3b8', fontWeight: '600' }}>
                Page Views — Last 14 Days
              </h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px' }}>
                {analytics?.chartData?.map((day, i) => (
                  <div key={i} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}>
                    <span style={{
                      fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px',
                      fontWeight: day.views > 0 ? '700' : '400'
                    }}>
                      {day.views > 0 ? day.views : ''}
                    </span>
                    <div style={{
                      width: '100%',
                      maxWidth: '48px',
                      height: `${Math.max((day.views / maxChartValue) * 160, day.views > 0 ? 4 : 1)}px`,
                      background: day.views > 0
                        ? `linear-gradient(180deg, #3b82f6, #1d4ed8)`
                        : '#334155',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{
                      fontSize: '0.65rem',
                      color: '#64748b',
                      marginTop: '6px',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Info */}
            {!gaConnected && (
              <div style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px dashed #475569',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔗</div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#e2e8f0' }}>Connect Google Analytics for Deeper Insights</h3>
                <p style={{ color: '#94a3b8', margin: '0 0 1.25rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                  Local tracking is active and showing basic page view stats above.
                  Connect GA4 to get real-time visitors, demographics, device info, bounce rates, and more.
                </p>
                <Link href="/admin/settings" style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}>
                  Set Up Google Analytics →
                </Link>
              </div>
            )}
          </>
        )}

        {/* TOP PAGES TAB */}
        {activeTab === 'pages' && (
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>Top Pages — Last 7 Days</h3>
            </div>
            {analytics?.topPages?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>Page</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>Views</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', width: '40%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topPages.map((item, i) => {
                    const maxViews = analytics.topPages[0]?.views || 1;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.75rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>{i + 1}</td>
                        <td style={{ padding: '0.75rem 1.5rem', fontWeight: '600', fontSize: '0.9rem', fontFamily: 'monospace' }}>{item.page}</td>
                        <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: '700', color: '#3b82f6' }}>{item.views}</td>
                        <td style={{ padding: '0.75rem 1.5rem' }}>
                          <div style={{
                            height: '8px',
                            borderRadius: '4px',
                            background: '#334155',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${(item.views / maxViews) * 100}%`,
                              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                              borderRadius: '4px'
                            }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No page view data yet. Data will appear as visitors browse your site.
              </div>
            )}
          </div>
        )}

        {/* REFERRERS TAB */}
        {activeTab === 'referrers' && (
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>Top Referrers — Last 7 Days</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>Where your visitors are coming from</p>
            </div>
            {analytics?.topReferrers?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>Source</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topReferrers.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.75rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1.5rem', fontWeight: '600', fontSize: '0.9rem' }}>{item.referrer}</td>
                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>{item.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No referrer data yet. This shows which websites are sending visitors to your site.
              </div>
            )}
          </div>
        )}

        {/* GA4 DASHBOARD EMBED TAB */}
        {activeTab === 'ga-dashboard' && lookerUrl && (
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0' }}>Google Analytics Dashboard</h3>
              <a
                href={lookerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none' }}
              >
                Open Full Report ↗
              </a>
            </div>
            <iframe
              src={lookerUrl}
              style={{
                width: '100%',
                height: '75vh',
                border: 'none',
                background: '#ffffff'
              }}
              allowFullScreen
              sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        )}

      </main>
    </div>
  );
}

function StatCard({ label, value, subtitle, color }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      border: '1px solid #334155',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
        background: color, borderRadius: '12px 0 0 12px'
      }} />
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
        {subtitle}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
