<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import {
		listAccounts,
		deleteAccount,
		setDefaultAccount,
		listTransactions,
		getSettings
	} from '$lib/storage';
	import DebtSummary from '$lib/components/debt-summary.svelte';
	import AccountTable from '$lib/components/account-table.svelte';
	import AccountForm from '$lib/components/account-form.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PageHeaderAction from '$lib/components/page-header-action.svelte';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import { toast } from 'svelte-sonner';
	import type { Account, Transaction } from '$lib/db/schema';
	import { totalAccountBalance } from '$lib/accounts';
	import { listenFlotiveEvents } from '$lib/client-events';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let accounts = $state<Account[]>([]);
	let txs = $state<Transaction[]>([]);
	let currency = $state('IDR');
	let loading = $state(true);
	let loadError = $state(false);
	let showForm = $state(false);
	let editing = $state<Account | null>(null);
	let toDelete = $state<Account | null>(null);
	let confirmOpen = $state(false);

	onMount(() => {
		void load();
		return listenFlotiveEvents(['Flotive:synced', 'Flotive:new-account'], (event) => {
			if (event === 'Flotive:new-account') {
				openAdd();
				return;
			}
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'accounts refresh failed', error: String(error) }))
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
			console.error(JSON.stringify({ message: 'accounts load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function refresh() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const [settings, nextAccounts, nextTransactions] = await Promise.all([
			getSettings(uid),
			listAccounts(auth.user.id, wid),
			listTransactions(auth.user.id, wid)
		]);
		currency = settings?.currency ?? auth.user.defaultCurrency;
		accounts = nextAccounts;
		txs = nextTransactions;
	}

	let totalBalance = $derived(totalAccountBalance(accounts, txs));

	function openAdd() {
		editing = null;
		showForm = true;
	}

	function openEdit(a: Account) {
		editing = a;
		showForm = true;
	}

	function openDelete(a: Account) {
		toDelete = a;
		confirmOpen = true;
	}

	async function confirmDelete() {
		if (!toDelete) return;
		await deleteAccount(toDelete.id);
		toDelete = null;
		confirmOpen = false;
		toast.success('Akun dihapus');
		await refresh();
	}

	async function makeDefault(account: Account) {
		await setDefaultAccount(account.id);
		await refresh();
		toast.success(`${account.name} dijadikan akun default`);
	}
</script>

<svelte:head><title>Akun & Dompet — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Akun & Dompet"
		description="Kelola rekening bank, dompet digital, dan sumber dana tunai Anda."
	>
		<PageHeaderAction label="Tambah Akun" icon="user-edit" onclick={openAdd} />
	</PageHeader>

	{#if loading}
		<PageSkeleton count={3} />
	{:else if loadError}
		<PageLoadError onretry={() => void load()} />
	{:else if accounts.length === 0}
		<EmptyState
			title="Belum ada akun"
			description="Tambahkan akun dompet untuk mulai mencatat transaksi."
			icon="wallet"
		/>
	{:else}
		<!-- Summary total saldo -->
		<DebtSummary label="Total Saldo" totalCents={totalBalance} {currency}>
			{#snippet sub()}
				{accounts.length} akun aktif
			{/snippet}
		</DebtSummary>

		<!-- Daftar akun -->
		<AccountTable
			{accounts}
			{txs}
			{currency}
			onmakedefault={makeDefault}
			onedit={openEdit}
			ondelete={openDelete}
		/>
	{/if}
</div>

<!-- Dialog Form Tambah/Edit Akun -->
{#if auth.user}
	<Dialog
		bind:open={showForm}
		onOpenChange={(open) => {
			if (!open) editing = null;
		}}
	>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle>{editing ? 'Edit akun' : 'Akun baru'}</DialogTitle>
				<DialogDescription>Atur nama, jenis, dan saldo awal akun.</DialogDescription>
			</DialogHeader>
			<AccountForm
				userId={auth.user.id}
				workspaceId={auth.activeWorkspaceId ?? ''}
				{editing}
				onSaved={() => {
					showForm = false;
					refresh();
				}}
				onCancel={() => (showForm = false)}
			/>
		</DialogContent>
	</Dialog>
{/if}

<!-- Dialog Konfirmasi Hapus -->
<ConfirmDialog
	bind:open={confirmOpen}
	title="Hapus akun?"
	description={`"${toDelete?.name ?? ''}" akan dihapus. Transaksi terkait tetap utuh.`}
	onconfirm={confirmDelete}
/>
