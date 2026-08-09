import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localSyncPlugin } from './server';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localSyncPlugin()],
  server: {
    port: 3001,
    host: true
  },
  preview: {
    port: 3001,
    host: true
  }
});
