import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './DocQuickstartBanner.module.css';

type BannerAction = {
  label: string;
  to: string;
};

type DocQuickstartBannerProps = {
  title: string;
  description: string;
  primary: BannerAction;
  secondary: BannerAction;
};

export default function DocQuickstartBanner({
  title,
  description,
  primary,
  secondary,
}: DocQuickstartBannerProps): ReactNode {
  const iconSrc = useBaseUrl('/img/icon.svg');

  return (
    <div className={styles.banner}>
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} to={primary.to}>
            {primary.label}
          </Link>
          <Link className={styles.secondary} to={secondary.to}>
            {secondary.label}
          </Link>
        </div>
      </div>
      <div className={styles.media} aria-hidden="true">
        <p className={styles.mediaHeadline}>
          AI Agent for sales
          <br />
          in 5 minutes.
        </p>
        <div className={styles.mediaBrand}>
          <img
            className={styles.mediaIcon}
            src={iconSrc}
            alt=""
            width={18}
            height={18}
          />
          <span className={styles.mediaWordmark}>KiloBot</span>
        </div>
      </div>
    </div>
  );
}
