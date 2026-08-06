import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
	ssr: {
		resolve: {
			conditions: ['workerd', 'module', 'node', 'development|production']
		}
	},
	server: {
		proxy: {
			'/api': {
				target: 'https://flotive.pages.dev',
				changeOrigin: true
			}
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			strategies: 'generateSW',
			// 'prompt': update SW menunggu persetujuan user (toast) alih-alih auto-reload
			// mid-session, yang sebelumnya membatalkan fetch /api/auth yang sedang berjalan.
			registerType: 'autoUpdate',
			devOptions: {
				enabled: true
			},
			includeAssets: [
				'favicon.ico',
				'favicon.svg',
				'favicon.png',
				'apple-touch-icon.png',
				'apple-touch-icon-precomposed.png',
				'icon-192.png',
				'icon-512.png'
			],
			manifest: {
				name: 'Flotive — Pengelolaan Uang',
				short_name: 'Flotive',
				description: 'Aplikasi pengelolaan keuangan lokal-first, praktis, dan aman.',
				start_url: '/',
				display: 'standalone',
				background_color: '#121212',
				theme_color: '#121212',
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
				globIgnores: ['**/sw.js', '**/workbox-*.js'],
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
				navigateFallback: null,
				clientsClaim: true,
				runtimeCaching: [
					{
						urlPattern: /\.(?:woff2?|ttf|otf)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'flotive-fonts',
							expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
				]
			}
		})
	]
});
