<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import { listDebts, deleteDebt, getSettings, listAccounts } from '$lib/storage';
	import DebtTable from '$lib/components/debt-table.svelte';
	import DebtSummary from '$lib/components/debt-summary.svelte';
	import DebtForm from '$lib/components/debt-form.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import type { Account, Debt, DebtType } from '$lib/db/schema';
	import { listenFlotiveEvents } from '$lib/client-events';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PageHeaderAction from '$lib/components/page-header-action.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let debts = $state<Debt[]>([]);
	let accounts = $state<Account[]>([]);
	let currency = $state('IDR');
	let loading = $state(true);
	let loadError = $state(false);
	let showForm = $state(false);
	let editing = $state<Debt | null>(null);
	let formType = $state<DebtType>('hutang');
	let toDelete = $state<Debt | null>(null);
	let confirmOpen = $state(false);

	onMount(() => {
		void load();
		return listenFlotiveEvents(['Flotive:synced', 'Flotive:new-debt'], (event) => {
			if (event === 'Flotive:new-debt') {
				openAdd('hutang');
				return;
			}
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'debts refresh failed', error: String(error) }))
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
			console.error(JSON.stringify({ message: 'debts load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function refresh() {
		if (auth.user) {
			const uid = auth.user.id;
			const wid = auth.activeWorkspaceId ?? '';
			const [settings, nextDebts, nextAccounts] = await Promise.all([
				getSettings(uid),
				listDebts(uid, wid),
				listAccounts(uid, wid)
			]);
			currency = settings?.currency ?? auth.user.defaultCurrency;
			debts = nextDebts;
			accounts = nextAccounts;
		}
	}
	let hutangList = $derived(debts.filter((d) => d.type === 'hutang'));
	let piutangList = $derived(debts.filter((d) => d.type === 'piutang'));
	let hutangTotal = $derived(
		hutangList
			.filter((d) => d.status !== 'paid')
			.reduce((s, d) => s + (d.amountCents - d.paidCents), 0)
	);
	let piutangTotal = $derived(
		piutangList
			.filter((d) => d.status !== 'paid')
			.reduce((s, d) => s + (d.amountCents - d.paidCents), 0)
	);
	function openAdd(t: DebtType) {
		formType = t;
		editing = null;
		showForm = true;
	}
	function onedit(d: Debt) {
		editing = d;
		formType = d.type;
		showForm = true;
	}
	function ondelete(d: Debt) {
		toDelete = d;
		confirmOpen = true;
	}
	async function confirmDelete() {
		if (!toDelete) return;
		await deleteDebt(toDelete.id);
		toDelete = null;
		confirmOpen = false;
		await refresh();
	}
</script>

<svelte:head><title>Hutang & Piutang — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Hutang & Piutang"
		description="Catat dan pantau status peminjaman serta pengembalian dana."
	>
		<PageHeaderAction label="Tambah Catatan" icon="money-plus" onclick={() => openAdd('hutang')} />
	</PageHeader>

	{#if loading}
		<PageSkeleton count={3} itemClass="h-20 rounded-lg" />
	{:else if loadError}
		<PageLoadError onretry={() => void load()} />
	{:else}
		<!-- 2 Cards Ringkasan -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<DebtSummary label="Total hutang belum lunas" totalCents={hutangTotal} {currency} />
			<DebtSummary label="Total piutang belum lunas" totalCents={piutangTotal} {currency} />
		</div>

		<!-- Tabel Gabungan (Hutang & Piutang) -->
		<DebtTable
			{debts}
			{accounts}
			userId={auth.user?.id ?? ''}
			workspaceId={auth.activeWorkspaceId ?? ''}
			{currency}
			{onedit}
			{ondelete}
			onrefresh={refresh}
		/>
	{/if}
</div>

{#if auth.user}
	<Dialog
		bind:open={showForm}
		onOpenChange={(open) => {
			if (!open) editing = null;
		}}
	>
		<DialogContent>
			<DialogHeader
				><DialogTitle>{editing ? 'Edit Catatan' : 'Tambah Catatan'}</DialogTitle></DialogHeader
			>
			<DebtForm
				userId={auth.user.id}
				workspaceId={auth.activeWorkspaceId ?? ''}
				{editing}
				defaultType={formType}
				onSaved={() => {
					showForm = false;
					refresh();
				}}
				onCancel={() => {
					showForm = false;
				}}
			/>
		</DialogContent>
	</Dialog>
{/if}

<ConfirmDialog
	bind:open={confirmOpen}
	title="Hapus catatan?"
	description="Data dipindahkan ke Tong Sampah dan dapat dipulihkan dalam 30 hari."
	onconfirm={confirmDelete}
/>
