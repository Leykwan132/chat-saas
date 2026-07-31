import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './DocExample.module.css';

type DocExampleProps = {
  title: string;
  children: ReactNode;
  icon?: LucideIcon;
};

export default function DocExample({ title, children, icon: Icon }: DocExampleProps) {
  return (
    <section className={styles.root}>
      <h3 className={styles.title}>
        {Icon ? <Icon aria-hidden="true" data-icon="example" /> : null}
        {title}
      </h3>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
