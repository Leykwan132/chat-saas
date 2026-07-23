import type {ReactNode} from 'react';
import styles from './ChangelogContent.module.css';

type ChangelogContentProps = {
  children: ReactNode;
};

export default function ChangelogContent({children}: ChangelogContentProps) {
  return <div className={styles.changelog}>{children}</div>;
}
