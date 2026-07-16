import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';

import styles from './DocCard.module.css';

type DocCardProps = {
  to: string;
  title: string;
  description?: string;
};

export default function DocCard({
  to,
  title,
  description,
}: DocCardProps): ReactNode {
  return (
    <Link to={to} className={styles.card}>
      <span className={styles.title}>{title}</span>
      {description ? (
        <span className={styles.description}>{description}</span>
      ) : null}
    </Link>
  );
}
