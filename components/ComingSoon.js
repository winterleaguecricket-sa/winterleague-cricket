import { useEffect, useState } from 'react'
import Head from 'next/head'
import styles from '../styles/comingSoon.module.css'

const defaultSiteAccess = {
  title: 'We’re getting things ready',
  subtitle: 'Thanks for your patience. We’re working on something great and will be live soon.',
  logoUrl: '',
  mediaType: 'none',
  mediaUrl: '',
}

export default function ComingSoon({ config }) {
  const [remoteConfig, setRemoteConfig] = useState(null)

  useEffect(() => {
    if (config) return

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/homepage')
        const data = await response.json()
        if (data.success) {
          setRemoteConfig(data.config)
        }
      } catch (error) {
        console.error('Error fetching homepage config:', error)
      }
    }

    fetchConfig()
  }, [config])

  const siteAccess = {
    ...defaultSiteAccess,
    ...(config?.siteAccess || remoteConfig?.siteAccess || {}),
  }

  const showMedia = siteAccess.mediaType !== 'none' && siteAccess.mediaUrl

  return (
    <div className={styles.page}>
      <Head>
        <title>Coming Soon</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.hero}>
          {siteAccess.logoUrl && (
            <img src={siteAccess.logoUrl} alt="Logo" className={styles.logo} />
          )}
          <div className={styles.overlay}>
            <div className={styles.badge}>Coming Soon</div>
            <h1 className={styles.title}>{siteAccess.title}</h1>
            <p className={styles.subtitle}>{siteAccess.subtitle}</p>
          </div>
        </div>

        {showMedia && (
          <div className={styles.media}>
            {siteAccess.mediaType === 'image' ? (
              <img src={siteAccess.mediaUrl} alt="Preview" />
            ) : (
              <video src={siteAccess.mediaUrl} autoPlay muted loop playsInline controls={false} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
