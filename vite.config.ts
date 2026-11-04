import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode preview` makes one self-contained HTML file (hash routing) for shareable previews.
// Every other build is served at buildsoftwaresolo.com/vault: the main site proxies /vault here,
// so files are built into dist/vault and every URL starts with /vault/.
export default defineConfig(({ mode }) => ({
  base: mode === 'preview' ? '/' : '/vault/',
  plugins: [react(), ...(mode === 'preview' ? [viteSingleFile()] : [])],
  define: mode === 'preview' ? { 'import.meta.env.VITE_HASH_ROUTER': '"1"' } : {},
  build: mode === 'preview' ? { outDir: 'dist-preview' } : { outDir: 'dist/vault', emptyOutDir: true },
}))
