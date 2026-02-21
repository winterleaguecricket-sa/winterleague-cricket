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

    const sendHeartbeat = () => {
      // Don't send heartbeats from admin pages
      if (window.location.pathname.startsWith('/admin')) return
      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, page: window.location.pathname })
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
