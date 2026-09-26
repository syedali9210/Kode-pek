import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2022',
    rolldownOptions: {
      // three.js rarely changes: its own chunk stays cached across portfolio redeploys
      output: { advancedChunks: { groups: [{ name: 'three', test: /node_modules[\/]three/ }] } },
    },
  },
})
