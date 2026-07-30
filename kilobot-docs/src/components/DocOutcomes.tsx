import type { ReactNode } from 'react';
import styles from './DocOutcomes.module.css';

export default function DocOutcomes({ children }: { children: ReactNode }) {
  return <section className={styles.root}>{children}</section>;
}
