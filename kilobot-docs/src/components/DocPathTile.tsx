import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
import {ArrowRight} from 'lucide-react';
import Link from '@docusaurus/Link';

import styles from './DocPathTile.module.css';

type DocPathTileProps = {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export default function DocPathTile({
  to,
  title,
  description,
  icon: Icon,
}: DocPathTileProps): ReactNode {
  return (
    <Link to={to} className={styles.tile}>
      <span className={styles.iconBox} aria-hidden="true">
        <Icon className={styles.icon} strokeWidth={1.75} />
      </span>
      <span className={styles.copy}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          <ArrowRight
            className={styles.arrow}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
        <span className={styles.description}>{description}</span>
      </span>
    </Link>
  );
}
