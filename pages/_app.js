import '../global.css'
import 'flatpickr/dist/flatpickr.min.css'
import { CartProvider } from '../context/CartContext'
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

// Track page views on route change
function usePageTracking(gaId) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (typeof window !== 'undefined' && window.gtag && gaId) {
        window.gtag('config', gaId, {
          page_path: url,
        })
      }
      // Also send to local analytics
      if (typeof window !== 'undefined') {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: url, referrer: document.referrer })
        }).catch(() => {})
      }
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events, gaId])

  // Track initial page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: window.location.pathname, referrer: document.referrer })
      }).catch(() => {})
    }
  }, [])
}

// Live visitor heartbeat — pings /api/visitors every 30s so admin can see active users
function useVisitorHeartbeat() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Skip heartbeat on admin pages to not inflate visitor count
    if (window.location.pathname.startsWith('/admin')) return

    // Generate or retrieve a unique visitor ID for this browser session
    let visitorId = sessionStorage.getItem('_vid')
    if (!visitorId) {
      visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36)
      sessionStorage.setItem('_vid', visitorId)
    }

    // Try to detect the visitor's name from localStorage data
    const getVisitorName = () => {
      try {
        // Primary: persistent name saved on registration/login
        const saved = localStorage.getItem('_vname')
        if (saved) return saved

        // Fallback: team registration draft (form 1) — visitor is actively filling the form
        const draft1 = localStorage.getItem('formDraft_1')
        if (draft1) {
          const p = JSON.parse(draft1)
          const teamName = p?.formData?.[1] || p?.formData?.['1'] || ''
          const managerName = p?.formData?.[2] || p?.formData?.['2'] || ''
          if (teamName || managerName) {
            return managerName ? `${managerName}${teamName ? ` (${teamName})` : ''}` : teamName
          }
        }

        // Fallback: player registration draft (form 2) — visitor is actively filling the form
        const draft2 = localStorage.getItem('formDraft_2')
        if (draft2) {
          const p = JSON.parse(draft2)
          const fd = p?.formData || {}
          const first = fd.checkout_firstName || fd[6] || fd['6'] || ''
          const last = fd.checkout_lastName || fd[7] || fd['7'] || ''
          if (first || last) return [first, last].filter(Boolean).join(' ')
        }
        return ''
      } catch { return '' }
    }

    // One-time: if existing team-portal user has teamId but no _vname, fetch their name
    if (!localStorage.getItem('_vname') && localStorage.getItem('teamId')) {
      fetch(`/api/teams?id=${localStorage.getItem('teamId')}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.team) {
            const tName = data.team.teamName || data.team.team_name || ''
            const mName = data.team.managerName || data.team.manager_name || ''
            const vname = mName ? `${mName}${tName ? ` (${tName})` : ''}` : tName
            if (vname) localStorage.setItem('_vname', vname)
          }
        })
        .catch(() => {})
    }

    const sendHeartbeat = () => {
      // Don't send heartbeats from admin pages
      if (window.location.pathname.startsWith('/admin')) return
      const payload = { visitorId, page: window.location.pathname }
      const vname = getVisitorName()
      if (vname) payload.visitorName = vname
      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {})
    }

    // Send immediately on first load
    sendHeartbeat()

    // Then every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000)

    // On route change, send heartbeat with new page
    const handleRouteChange = () => sendHeartbeat()
    router.events.on('routeChangeComplete', handleRouteChange)

    // On page close, notify server
    const handleUnload = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/visitors', JSON.stringify({ visitorId, _delete: true }))
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      router.events.off('routeChangeComplete', handleRouteChange)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])
}

export default function MyApp({ Component, pageProps }) {
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico')
  const [gaId, setGaId] = useState(null)
  usePageTracking(gaId)
  useVisitorHeartbeat()

  useEffect(() => {
    const loadSiteConfig = async () => {
      try {
        const res = await fetch('/api/site-config')
        const data = await res.json()
        if (data.success && data.config) {
          if (data.config.faviconUrl) {
            setFaviconUrl(data.config.faviconUrl)
          }
          if (data.config.ga4MeasurementId && data.config.ga4MeasurementId.startsWith('G-')) {
            setGaId(data.config.ga4MeasurementId)
          }
        }
      } catch (error) {
        // silent fallback
      }
    }

    loadSiteConfig()
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
      </Head>

      {/* Google Analytics 4 — dynamically loaded from admin settings */}
      {gaId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                  send_page_view: true
                });
              `,
            }}
          />
        </>
      )}

      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </>
  )
}
