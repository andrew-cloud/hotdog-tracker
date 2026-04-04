import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Injects a build timestamp comment into the HTML output so GitHub Pages
// always sees index.html as changed and serves the fresh version.
function buildTimestamp() {
  return {
    name: 'build-timestamp',
    transformIndexHtml(html) {
      return html.replace(
        '<!-- build-timestamp -->',
        `<!-- built: ${new Date().toISOString()} -->`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), buildTimestamp()],
  base: '/hotdog-tracker/',
  build: {
    // Ensure assets always have content-hashed filenames
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
