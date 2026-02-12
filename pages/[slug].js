import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import styles from '../styles/home.module.css';

export default function DynamicPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const fetchPage = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/pages?slug=${slug}`);
        const data = await response.json();
        
        if (data.success && data.page) {
          if (data.page.active) {
            setPage(data.page);
          } else {
            setError('This page is currently not available');
          }
        } else {
          setError('Page not found');
        }
      } catch (err) {
        console.error('Error fetching page:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Loading... | Winter League Cricket</title>
        </Head>
        <main className={styles.main}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '50vh',
            color: 'white'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid #333', 
                borderTop: '3px solid #dc0000', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <p>Loading...</p>
            </div>
          </div>
        </main>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Page Not Found | Winter League Cricket</title>
        </Head>
        <main className={styles.main}>
          <div style={{
            maxWidth: '600px',
            margin: '100px auto',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px'
          }}>
            <h1 style={{ color: '#dc0000', marginBottom: '20px' }}>404</h1>
            <p style={{ color: '#ccc', marginBottom: '30px' }}>{error}</p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#dc0000',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}>
              Return Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{page?.title} | Winter League Cricket</title>
        <meta name="description" content={page?.content?.substring(0, 160)} />
      </Head>

      <header style={{
        backgroundColor: '#111',
        borderBottom: '1px solid #333',
        padding: '15px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: 'white' 
            }}>
              Winter League Cricket
            </span>
          </Link>
          <nav style={{ display: 'flex', gap: '20px' }}>
            <Link href="/premium" style={{ color: '#ccc', textDecoration: 'none' }}>Premium</Link>
            <Link href="/training" style={{ color: '#ccc', textDecoration: 'none' }}>Training</Link>
            <Link href="/contact" style={{ color: '#ccc', textDecoration: 'none' }}>Contact</Link>
          </nav>
        </div>
      </header>

      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 20px',
        minHeight: '60vh'
      }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '30px' }}>
          <Link href="/" style={{ color: '#888', textDecoration: 'none' }}>Home</Link>
          <span style={{ color: '#555', margin: '0 10px' }}>/</span>
          <span style={{ color: '#dc0000' }}>{page?.title}</span>
        </nav>

        {/* Page Content */}
        <article style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '40px',
          color: '#e0e0e0',
          lineHeight: '1.8'
        }}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 style={{ 
                  color: 'white', 
                  fontSize: '2.5rem', 
                  marginBottom: '30px',
                  borderBottom: '2px solid #dc0000',
                  paddingBottom: '15px'
                }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ 
                  color: 'white', 
                  fontSize: '1.8rem', 
                  marginTop: '40px', 
                  marginBottom: '20px' 
                }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ 
                  color: '#dc0000', 
                  fontSize: '1.3rem', 
                  marginTop: '30px', 
                  marginBottom: '15px' 
                }}>
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ marginBottom: '15px', color: '#ccc' }}>{children}</p>
              ),
              ul: ({ children }) => (
                <ul style={{ marginBottom: '20px', paddingLeft: '25px', color: '#ccc' }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ marginBottom: '20px', paddingLeft: '25px', color: '#ccc' }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: '8px' }}>{children}</li>
              ),
              strong: ({ children }) => (
                <strong style={{ color: 'white' }}>{children}</strong>
              ),
              a: ({ href, children }) => (
                <Link href={href || '#'} style={{ color: '#dc0000', textDecoration: 'underline' }}>
                  {children}
                </Link>
              ),
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: '#222'
                  }}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead style={{ backgroundColor: '#333' }}>{children}</thead>
              ),
              th: ({ children }) => (
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid #dc0000',
                  color: 'white'
                }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #333',
                  color: '#ccc'
                }}>
                  {children}
                </td>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: '4px solid #dc0000',
                  paddingLeft: '20px',
                  margin: '20px 0',
                  color: '#aaa',
                  fontStyle: 'italic'
                }}>
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code style={{
                  backgroundColor: '#333',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  color: '#dc0000'
                }}>
                  {children}
                </code>
              ),
              hr: () => (
                <hr style={{
                  border: 'none',
                  borderTop: '1px solid #333',
                  margin: '30px 0'
                }} />
              )
            }}
          >
            {page?.content}
          </ReactMarkdown>
        </article>

        {/* Category Badge */}
        {page?.category && (
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '6px 16px',
              backgroundColor: '#222',
              color: '#888',
              borderRadius: '20px',
              fontSize: '0.85rem',
              textTransform: 'capitalize'
            }}>
              {page.category.replace('-', ' ')}
            </span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#111',
        borderTop: '1px solid #333',
        padding: '40px 20px',
        marginTop: '60px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>© {new Date().getFullYear()} Winter League Cricket. All rights reserved.</p>
          <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <Link href="/privacy" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>Terms</Link>
            <Link href="/contact" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
