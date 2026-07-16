import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Kilobot Docs',
  tagline: 'Build, launch, and grow with Kilobot',
  favicon: 'img/icon.svg',
  future: {v4: true},
  url: 'https://docs.kilobot.app',
  baseUrl: '/',
  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
  ],
  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&family=Gilda+Display&display=swap',
  ],
  organizationName: 'kilobot',
  projectName: 'kilobot-docs',
  onBrokenLinks: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},
  trailingSlash: false,
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          breadcrumbs: false,
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: [
            './src/css/custom.css',
            './src/css/navbar.css',
            './src/css/toc.css',
            './src/css/pagination.css',
          ],
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      '@cmfcmf/docusaurus-search-local',
      {
        indexDocs: true,
        indexPages: true,
        indexBlog: false,
        language: 'en',
        maxSearchResults: 8,
      },
    ],
  ],
  themeConfig: {
    image: 'img/kilobot-social-card.svg',
    metadata: [
      {name: 'keywords', content: 'KiloBot help, AI sales agent, workflow, bookings, inbox'},
      {name: 'theme-color', content: '#ffffff'},
    ],
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Kilobot',
      logo: {
        alt: 'Kilobot',
        src: 'img/icon.svg',
        srcDark: 'img/icon-dark.svg',
      },
      items: [
        {type: 'search', position: 'right'},
        {
          href: 'https://kilobot.app/workspace',
          label: 'Try Kilobot',
          position: 'right',
          className: 'navbar-dashboard-link',
        },
      ],
    },
    footer: undefined,
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
