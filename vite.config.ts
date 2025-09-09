import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  test: {
    environment: 'jsdom'
  }
});
