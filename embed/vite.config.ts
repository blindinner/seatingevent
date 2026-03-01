import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SeatMapWidgetExports',
      formats: ['iife'],
      fileName: () => 'seat-map-widget.js',
    },
    rollupOptions: {
      // Bundle everything - no external dependencies
      external: [],
      output: {
        // Ensure React is bundled
        inlineDynamicImports: true,
        // Global variable name for the module exports
        name: 'SeatMapWidgetExports',
        // Add footer to expose SeatMapWidget directly on window
        footer: 'window.SeatMapWidget = SeatMapWidgetExports.SeatMapWidget;',
      },
    },
    minify: 'esbuild',
    // Target smaller bundle
    target: 'es2018',
    sourcemap: false,
    // Inline CSS into the JS bundle
    cssCodeSplit: false,
  },
  css: {
    // Inject CSS as a <style> tag via JS
    modules: {
      localsConvention: 'camelCase',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
