import type { ReactNode } from 'react';
import styles from './DocExample.module.css';

type DocExampleProps = {
  title: string;
  children: ReactNode;
};

export default function DocExample({ title, children }: DocExampleProps) {
  return (
    <section className={styles.root}>
      <p className={styles.eyebrow}>Example</p>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
