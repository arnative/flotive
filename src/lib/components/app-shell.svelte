<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth/store.svelte';
	import { logout } from '$lib/auth/actions';
	import { getStoredTheme, setTheme, type Theme } from '$lib/theme';
	import { listAccounts, listCategories, getSettings } from '$lib/storage';
	import TransactionDialog from '$lib/components/transaction-dialog.svelte';
	import SidebarNav from '$lib/components/sidebar-nav.svelte';
	import MobileHeader from '$lib/components/mobile-header.svelte';
	import MobileBottomNav from '$lib/components/mobile-bottom-nav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';
	import type { Account, Category } from '$lib/db/schema';
	import { toast } from 'svelte-sonner';

	let { children } = $props();

	// FAB konteks per-halaman — fungsi "buat baru" dipindah dari header.
	type FabAction = { label: string; icon: string; event?: string } | null;
	let fabAction = $derived.by<FabAction>(() => {
		const path = page.url.pathname;
		switch (path) {
			case '/':
			case '/history':
				return { label: 'Transaksi Baru', icon: 'plus' };
			case '/accounts':
				return { label: 'Akun Baru', icon: 'user-edit', event: 'Flotive:new-account' };
			case '/budgets':
				return { label: 'Atur Anggaran', icon: 'edit2', event: 'Flotive:new-budget' };
			case '/bills':
				return { label: 'Tambah Tagihan', icon: 'memo-plus', event: 'Flotive:new-bill' };
			case '/debts':
				return { label: 'Tambah Catatan', icon: 'money-plus', event: 'Flotive:new-debt' };
			case '/categories':
				return {
					label: 'Tambah Kategori',
					icon: 'grid-circle-plus',
					event: 'Flotive:new-category'
				};
			default:
				return null;
		}
	});

	function handleFabClick() {
		if (!fabAction) return;
		if (fabAction.event) {
			window.dispatchEvent(new CustomEvent(fabAction.event));
		} else {
			openNewTransaction();
		}
	}

	const navGroups = [
		{
			label: '',
			items: [
				{ href: '/', label: 'Beranda', icon: 'home-smile' },
				{ href: '/history', label: 'Riwayat', icon: 'history' }
			]
		},
		{
			label: 'Manajemen',
			items: [
				{ href: '/accounts', label: 'Akun & Dompet', icon: 'wallet' },
				{ href: '/bills', label: 'Tagihan', icon: 'receipt' },
				{ href: '/budgets', label: 'Anggaran', icon: 'chart-pie' },
				{ href: '/debts', label: 'Hutang & Piutang', icon: 'banknote-2' },
				{ href: '/categories', label: 'Kategori', icon: 'category-2' }
			]
		},
		{
			label: 'Sistem',
			items: [{ href: '/trash', label: 'Tong Sampah', icon: 'trash-3' }]
		}
	];

	const bottomNav = [
		{ href: '/', label: 'Beranda', icon: 'home-smile' },
		{ href: '/history', label: 'Riwayat', icon: 'history' },
		{ href: '/accounts', label: 'Akun', icon: 'wallet' },
		{ href: '/budgets', label: 'Anggaran', icon: 'chart-pie' }
	];

	const moreNav = [
		{ href: '/bills', label: 'Tagihan', icon: 'receipt' },
		{ href: '/debts', label: 'Hutang', icon: 'banknote-2' },
		{ href: '/categories', label: 'Kategori', icon: 'category-2' },
		{ href: '/trash', label: 'Tong Sampah', icon: 'trash-3' },
		{ href: '/settings', label: 'Pengaturan', icon: 'gear' }
	];

	let initials = $derived(
		(auth.user?.name?.trim() || 'Flotive')
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('')
	);

	let collapsed = $state(false);
	function toggleSidebar() {
		collapsed = !collapsed;
	}

	let theme = $state<Theme>(getStoredTheme());
	function toggleTheme() {
		const cycleMap: Record<Theme, Theme> = {
			light: 'dark',
			dark: 'system',
			system: 'light'
		};
		const next = cycleMap[theme] ?? 'dark';
		setTheme(next);
		theme = next;
		const labels: Record<Theme, string> = {
			light: 'Terang',
			dark: 'Gelap',
			system: 'Sistem (Perangkat)'
		};
		toast.success(`Tampilan diubah ke tema ${labels[next]}`);
	}

	async function doLogout() {
		try {
			await logout();
			await goto('/auth', { replaceState: true });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Gagal keluar.');
		}
	}

	let showTxModal = $state(false);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let currency = $state('IDR');

	async function loadTxData() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const s = await getSettings(uid);
		currency = s?.currency ?? auth.user.defaultCurrency;
		[accounts, categories] = await Promise.all([listAccounts(uid, wid), listCategories(uid, wid)]);
	}

	async function openNewTransaction() {
		await loadTxData();
		showTxModal = true;
	}

	function handleTxSaved() {
		showTxModal = false;
		window.dispatchEvent(new CustomEvent('Flotive:transaction-saved'));
	}

	onMount(() => {
		const checkHash = () => {
			if (window.location.hash === '#transaction-new') {
				openNewTransaction();
				window.history.replaceState(null, '', window.location.pathname + window.location.search);
			}
		};
		checkHash();
		window.addEventListener('hashchange', checkHash);
		return () => window.removeEventListener('hashchange', checkHash);
	});
</script>

<div
	class="flex min-h-dvh flex-col overflow-hidden bg-background text-foreground md:h-dvh md:flex-row md:gap-3 md:p-3"
>
	<!-- Desktop Sidebar -->
	<SidebarNav
		bind:collapsed
		{navGroups}
		pathname={page.url.pathname}
		user={auth.user}
		{initials}
		{theme}
		ontogglesidebar={toggleSidebar}
		ontoggletheme={toggleTheme}
		onnewtransaction={openNewTransaction}
		onlogout={doLogout}
	/>

	<!-- Main Content Panel (Kanan) -->
	<div class="flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:h-full">
		<!-- Header Mobile -->
		<MobileHeader />

		<!-- Main Panel Floating -->
		<main
			class="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none md:rounded-2xl md:border md:border-border md:bg-background md:pb-0"
		>
			<div class="mx-auto w-full max-w-7xl p-6 md:p-10 lg:p-12">
				{@render children?.()}
			</div>
		</main>

		<!-- Floating Action Button (Mobile) -->
		{#if fabAction}
			<Button
				onclick={handleFabClick}
				size="icon-lg"
				class="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-12 items-center justify-center rounded-full bg-[oklch(0.55_0.16_175)] p-0 text-white shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 md:hidden dark:bg-[oklch(0.68_0.16_175)] dark:text-[oklch(0.08_0.02_175)]"
				aria-label={fabAction.label}
				title={fabAction.label}
			>
				<Icon name={fabAction.icon} class="text-4xl" weight="fill" />
			</Button>
		{/if}

		<!-- Bottom Nav (Mobile) -->
		<MobileBottomNav
			{bottomNav}
			{moreNav}
			pathname={page.url.pathname}
			{theme}
			onselecttheme={(nextTheme) => {
				setTheme(nextTheme);
				theme = nextTheme;
			}}
		/>
	</div>
</div>

{#if showTxModal && auth.user}
	<TransactionDialog
		userId={auth.user.id}
		workspaceId={auth.activeWorkspaceId ?? ''}
		{accounts}
		{categories}
		{currency}
		onSaved={handleTxSaved}
		onclose={() => (showTxModal = false)}
	/>
{/if}
