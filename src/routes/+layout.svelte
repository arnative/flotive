<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, onNavigate } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { auth } from '$lib/auth/store.svelte';
	import {
		applyTheme,
		getStoredTheme,
		watchSystemTheme,
		resolveTheme,
		type ResolvedTheme
	} from '$lib/theme';
	import { initSync } from '$lib/db/sync';
	import { Toaster, toast } from '$lib/components/ui/sonner';
	import AppShell from '$lib/components/app-shell.svelte';
	import WelcomeDialog from '$lib/components/welcome-dialog.svelte';
	import DotLoader from '$lib/components/ui/dot-loader.svelte';

	let { children } = $props();
	let resolved = $state<ResolvedTheme>('dark');
	let initializing = $state(true);

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(() => {
		applyTheme(getStoredTheme());
		resolved = resolveTheme(getStoredTheme());
		const stop = watchSystemTheme((r) => {
			if (getStoredTheme() === 'system') {
				resolved = r;
				applyTheme('system');
			}
		});
		const handleSynced = () => {
			if (auth.user) {
				auth.refreshWorkspaces(auth.user.id).catch(console.error);
				toast.info('Pembaruan tampilan', {
					description: 'Data dan tampilan berhasil diperbarui.'
				});
			}
		};
		window.addEventListener('Flotive:synced', handleSynced);
		(async () => {
			try {
				await auth.init();
				if (auth.user) {
					await auth.initWorkspaces(auth.user.id);
					await initSync(auth.user.id);
				}
			} catch (error) {
				console.error(error);
			} finally {
				initializing = false;
			}
		})();
		// PWA: register service worker + notify on update / offline-ready.
		import('virtual:pwa-register')
			.then(({ registerSW }) => {
				const updateSW = registerSW({
					onNeedRefresh() {
						toast.info('Pembaruan tampilan tersedia', {
							description: 'Muat ulang halaman untuk memakai tampilan versi terbaru.',
							action: { label: 'Muat ulang', onClick: () => updateSW() }
						});
					},
					onOfflineReady() {
						toast.success('Siap offline', {
							description: 'Aplikasi dapat dipakai tanpa internet.'
						});
					}
				});
			})
			.catch(() => {});
		return () => {
			stop();
			window.removeEventListener('Flotive:synced', handleSynced);
		};
	});

	$effect(() => {
		if (auth.loading) return;
		const p = page.url.pathname;
		if (!auth.isAuthenticated && p !== '/auth') goto('/auth', { replaceState: true });
		else if (auth.isAuthenticated && p === '/auth') goto('/', { replaceState: true });
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

{#if auth.loading || initializing}
	<div class="flex min-h-dvh items-center justify-center bg-background p-4">
		<DotLoader label="Memuat" size="md" />
	</div>
{:else if auth.isAuthenticated}
	<AppShell>
		{#key page.url.pathname + (auth.activeWorkspaceId ?? '')}
			<div in:fade={{ duration: 180 }} class="w-full">
				{@render children?.()}
			</div>
		{/key}
	</AppShell>
	{#if auth.needsOnboarding}<WelcomeDialog />{/if}
	<Toaster theme={resolved} />
{:else if page.url.pathname === '/auth'}
	{@render children?.()}
	<Toaster theme={resolved} />
{:else}
	<div class="flex min-h-dvh items-center justify-center bg-background p-4">
		<DotLoader label="Mengalihkan" size="md" />
	</div>
{/if}
