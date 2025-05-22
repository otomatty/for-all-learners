import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // Required if you're testing React components

export default defineConfig({
  plugins: [react()], // Required if you're testing React components
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts', // Optional: if you need setup files
  },
});
