import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'ElastiWidget',
            fileName: () => 'widget.js',
            formats: ['iife'],
        },
        outDir: 'dist',
        minify: true,
    },
});
