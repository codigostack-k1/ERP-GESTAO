import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: './', // Essencial para o Electron encontrar assets (JS/CSS) localmente
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});