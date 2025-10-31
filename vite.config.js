import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// ✅ Make assets load correctly in packaged Electron builds
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
})