import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode preview` makes one self-contained HTML file (hash routing) for shareable previews.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  define: mode === 'preview' ? { 'import.meta.env.VITE_HASH_ROUTER': '"1"' } : {},
  build: mode === 'preview' ? { outDir: 'dist-preview' } : {},
}))
