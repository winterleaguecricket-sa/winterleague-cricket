import Link from 'next/link';
import styles from './Button.module.css'

export default function Button({ funnelId, href, children, onClick, ...props }) {
  // If funnelId is provided, link to the funnel
  if (funnelId) {
    return (
      <Link href={`/funnel/${funnelId}?step=1`} className={styles.btn}>
        {children}
      </Link>
    );
  }
  
  // If href is provided, use Link component
  if (href) {
    return (
      <Link href={href} className={styles.btn}>
        {children}
      </Link>
    );
  }
  
  // Otherwise, render as button
  return (
    <button type="button" className={styles.btn} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
