import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fetwtgrah.github.io',
  output: 'static',
  trailingSlash: 'always',
  integrations: [expressiveCode({ themes: ['github-light', 'github-dark'], themeCssSelector: theme => `[data-theme="${theme.name === 'github-dark' ? 'dark' : 'light'}"]` }), sitemap()],
});
