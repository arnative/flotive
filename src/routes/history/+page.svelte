<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import {
		listTransactions,
		listAccounts,
		listCategories,
		getSettings,
		deleteTransaction
	} from '$lib/storage';
	import TransactionTable from '$lib/components/transaction-table.svelte';
	import TransactionDialog from '$lib/components/transaction-dialog.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import type { Account, Category, Transaction } from '$lib/db/schema';
	import { listenFlotiveEvents } from '$lib/client-events';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PageHeaderAction from '$lib/components/page-header-action.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let txs = $state<Transaction[]>([]);
	let currency = $state('IDR');
	let loading = $state(true);
	let loadError = $state(false);
	let showTx = $state(false);
	let editing = $state<Transaction | null>(null);
	let toDelete = $state<Transaction | null>(null);
	let confirmOpen = $state(false);

	onMount(() => {
		void load();
		return listenFlotiveEvents(['Flotive:transaction-saved', 'Flotive:synced'], () => {
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'history refresh failed', error: String(error) }))
			);
		});
	});

	async function load() {
		loading = true;
		loadError = false;
		try {
			await refresh();
		} catch (error) {
			loadError = true;
			console.error(JSON.stringify({ message: 'history load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function refresh() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const [settings, nextAccounts, nextCategories, nextTransactions] = await Promise.all([
			getSettings(uid),
			listAccounts(uid, wid),
			listCategories(uid, wid),
			listTransactions(uid, wid)
		]);
		currency = settings?.currency ?? auth.user.defaultCurrency;
		accounts = nextAccounts;
		categories = nextCategories;
		txs = nextTransactions;
	}
	function onedit(tx: Transaction) {
		editing = tx;
		showTx = true;
	}
	function ondelete(tx: Transaction) {
		toDelete = tx;
		confirmOpen = true;
	}
	async function confirmDelete() {
		if (!toDelete) return;
		await deleteTransaction(toDelete.id);
		toDelete = null;
		confirmOpen = false;
		await refresh();
	}
</script>

<svelte:head><title>Riwayat — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Riwayat"
		description="Daftar seluruh riwayat pencatatan transaksi pengeluaran dan pemasukan."
	>
		<PageHeaderAction
			label="Transaksi Baru"
			icon="plus"
			onclick={() => {
				editing = null;
				showTx = true;
			}}
		/>
	</PageHeader>

	{#if loading}
		<PageSkeleton count={4} />
	{:else if loadError}
		<PageLoadError onretry={() => void load()} />
	{:else if txs.length === 0}
		<EmptyState
			title="Belum ada transaksi"
			description="Mulai catat pemasukan dan pengeluaran Anda."
			icon="history"
		/>
	{:else}
		<TransactionTable {txs} {accounts} {categories} {currency} {onedit} {ondelete} />
	{/if}
</div>

{#if showTx && auth.user}
	<TransactionDialog
		userId={auth.user.id}
		workspaceId={auth.activeWorkspaceId ?? ''}
		{accounts}
		{categories}
		{currency}
		{editing}
		onSaved={() => {
			showTx = false;
			editing = null;
			refresh();
		}}
		onclose={() => {
			showTx = false;
			editing = null;
		}}
	/>
{/if}

<ConfirmDialog
	bind:open={confirmOpen}
	title="Hapus transaksi?"
	description="Transaksi dipindahkan ke Tong Sampah dan dapat dipulihkan dalam 30 hari."
	onconfirm={confirmDelete}
/>
