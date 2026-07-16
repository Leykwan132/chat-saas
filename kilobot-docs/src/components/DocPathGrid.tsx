import type {ReactNode} from 'react';

import styles from './DocPathGrid.module.css';

type DocPathGridProps = {
  children: ReactNode;
};

export default function DocPathGrid({children}: DocPathGridProps): ReactNode {
  return <div className={styles.grid}>{children}</div>;
}
