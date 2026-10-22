import { defineConfig } from 'vite';

// Relative asset paths so the production build also loads correctly from
// file:// inside the packaged Electron app.
export default defineConfig({
  base: './',
});
