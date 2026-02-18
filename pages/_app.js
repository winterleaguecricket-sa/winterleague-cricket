import '../global.css'
import 'flatpickr/dist/flatpickr.min.css'
import { CartProvider } from '../context/CartContext'
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

// Google Analytics 4 Measurement ID
// Replace G-XXXXXXXXXX with your actual GA4 Measurement ID from https://analytics.google.com
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX'

// Track page views on route change
function usePageTracking() {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
        window.gtag('config', GA_MEASUREMENT_ID, {
          page_path: url,
        })
      }
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])
}

export default function MyApp({ Component, pageProps }) {
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico')
  usePageTracking()

  useEffect(() => {
    const loadFavicon = async () => {
      try {
        const res = await fetch('/api/site-config')
        const data = await res.json()
        if (data.success && data.config?.faviconUrl) {
          setFaviconUrl(data.config.faviconUrl)
        }
      } catch (error) {
        // silent fallback to default
      }
    }

    loadFavicon()
  }, [])

  const gaEnabled = GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX'

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

      {/* Google Analytics 4 */}
      {gaEnabled && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
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
