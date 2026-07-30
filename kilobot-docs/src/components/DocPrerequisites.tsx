import type { ReactNode } from 'react';
import styles from './DocPrerequisites.module.css';

export default function DocPrerequisites({ children }: { children: ReactNode }) {
  return (
    <section className={styles.root} aria-labelledby="doc-prerequisites-title">
      <h2 id="doc-prerequisites-title" className={styles.title}>Before you begin</h2>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
