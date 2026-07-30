import type { ReactNode } from 'react';
import styles from './DocSuccess.module.css';

export default function DocSuccess({ children }: { children: ReactNode }) {
  return (
    <section className={styles.root} aria-labelledby="doc-success-title">
      <h2 id="doc-success-title" className={styles.title}>You’re done when</h2>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
