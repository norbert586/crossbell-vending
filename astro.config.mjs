// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://crossbellvending.com',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    sitemap({
      // Form success page — reachable only by submitting a form, not for search.
      // The promotions page is reached from the resident welcome email only.
      filter: (page) => !page.includes('/thanks/') && !page.includes('/promotions/'),
    }),
  ]
});