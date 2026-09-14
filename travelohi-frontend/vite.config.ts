import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all gRPC-Web calls to Envoy
      '/travelohi': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Forward WebSocket game traffic to Envoy
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
