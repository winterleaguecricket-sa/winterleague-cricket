import '../global.css'
import 'flatpickr/dist/flatpickr.min.css'
import { CartProvider } from '../context/CartContext'
import Head from 'next/head'
import { useEffect, useState } from 'react'

export default function MyApp({ Component, pageProps }) {
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico')

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
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </>
  )
}
