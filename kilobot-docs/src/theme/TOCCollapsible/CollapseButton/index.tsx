import type {ReactNode} from 'react';
import clsx from 'clsx';
import type {Props} from '@theme/TOCCollapsible/CollapseButton';

import styles from './styles.module.css';

export default function TOCCollapsibleCollapseButton({
  collapsed,
  ...props
}: Props): ReactNode {
  return (
    <button
      type="button"
      aria-label="Page sections"
      {...props}
      className={clsx(
        'clean-btn',
        styles.tocCollapsibleButton,
        !collapsed && styles.tocCollapsibleButtonExpanded,
        props.className,
      )}
    />
  );
}
