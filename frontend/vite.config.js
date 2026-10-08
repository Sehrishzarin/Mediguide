import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Keep the heavy map library out of the main bundle (it is lazy-loaded with the map)
        codeSplitting: {
          groups: [
            { name: 'leaflet', test: /node_modules[\/](leaflet|react-leaflet|@react-leaflet)/ },
            { name: 'react-vendor', test: /node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/ },
          ],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
