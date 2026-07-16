import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useThemeConfig} from '@docusaurus/theme-common';
import ThemedImage from '@theme/ThemedImage';
import styles from './styles.module.css';

export default function NavbarLogo(): ReactNode {
  const {
    siteConfig: {title},
  } = useDocusaurusContext();
  const {
    navbar: {title: navbarTitle, logo},
  } = useThemeConfig();

  const logoLink = useBaseUrl(logo?.href || '/');
  const alt = logo?.alt ?? (navbarTitle ? '' : title);
  const sources = {
    light: useBaseUrl(logo!.src),
    dark: useBaseUrl(logo!.srcDark || logo!.src),
  };

  return (
    <Link
      to={logoLink}
      className={`navbar__brand ${styles.brand}`}
      {...(logo?.target ? {target: logo.target} : {})}
    >
      <ThemedImage
        className="navbar__logo"
        sources={sources}
        height={logo?.height}
        width={logo?.width}
        alt={alt}
        style={logo?.style}
      />
      {navbarTitle != null && (
        <span className={styles.wordmark}>
          <b className="navbar__title">{navbarTitle}</b>
          <span className={styles.pill}>Docs</span>
        </span>
      )}
    </Link>
  );
}
