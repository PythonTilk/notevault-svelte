import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 51975,
		cors: true
	},
	build: {
		// Enable minification and compression
		minify: 'esbuild',
		sourcemap: false, // Disable sourcemaps in production for smaller builds
		// Optimize chunk size warning limit
		chunkSizeWarningLimit: 1000,
		// Better tree shaking
		rollupOptions: {
			output: {
				// Automatic chunking strategy
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('lucide-svelte')) {
							return 'lucide';
						}
						if (id.includes('svelte')) {
							return 'svelte-vendor';
						}
						return 'vendor';
					}
				}
			}
		}
	},
	// Optimize dependencies
	optimizeDeps: {
		include: [
			'lucide-svelte'
		]
	}
});