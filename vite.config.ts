import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'WebMCPAdapter',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
        },
        rollupOptions: {
            external: ['@mcp-b/global', '@mcp-b/webmcp-types'],
        },
    },
    plugins: [
        dts({ rollupTypes: true }),
    ],
})