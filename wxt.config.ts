import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'WebScope — Visual CSS Inspector & Extractor',
    description:
      'Free visual CSS inspector, live style editor, design token extractor, asset downloader, and deterministic web-to-code exporter.',
    permissions: ['sidePanel', 'activeTab', 'scripting', 'storage', 'downloads'],
    action: {
      default_title: 'Open WebScope Inspector',
    },
  },
});
