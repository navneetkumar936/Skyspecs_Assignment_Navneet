import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = process.env.API_URL || 'http://localhost:4000';
const proxy = { '/api': api, '/graphql': api, '/events': api };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': api, '/graphql': api, '/events': api } },
  preview: { host: true, port: 8080, proxy }
});