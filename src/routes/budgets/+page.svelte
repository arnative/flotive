<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import {
		deleteTransaction,
		getSettings,
		listAccounts,
		getDailyBudget,
		getDailyBudgetEditor,
		listCategories,
		listTransactions
	} from '$lib/storage';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate, todayISO } from '$lib/utils/format';
	import BudgetForm from '$lib/components/budget-form.svelte';
	import PeriodNavigator from '$lib/components/period-navigator.svelte';
	import TransactionTable from '$lib/components/transaction-table.svelte';
	import TransactionDialog from '$lib/components/transaction-dialog.svelte';
	import MetricCard from '$lib/components/metric-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import PageHeader from '$lib/components/page-header.svelte';
	import PageHeaderAction from '$lib/components/page-header-action.svelte';
	import type { Account, Budget, Category, Transaction } from '$lib/db/schema';
	import { listenFlotiveEvents } from '$lib/client-events';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let budget = $state<Budget | undefined>();
	let budgetIsOverride = $state(false);
	let categories = $state<Category[]>([]);
	let accounts = $state<Account[]>([]);
	let transactions = $state<Transaction[]>([]);
	let currency = $state('IDR');
	let loading = $state(true);
	let loadError = $state(false);

	let showForm = $state(false);
	let editorAmount = $state(0);
	let editorIsOverride = $state(false);
	let refreshSequence = 0;

	// Transaksi edit/hapus (reuse pola Riwayat)
	let showTx = $state(false);
	let editingTx = $state<Transaction | null>(null);
	let toDeleteTx = $state<Transaction | null>(null);

	let today = $state(todayISO());

	let hasBudget = $derived(Boolean(budget && budget.amountCents > 0));
	let totalTargetToday = $derived(hasBudget ? (budget?.amountCents ?? 0) : 0);
	let dailyExpenses = $derived(transactions.filter((t) => t.date === today && t.inBudget));
	let totalSpentToday = $derived(
		dailyExpenses.reduce((sum, tx) => sum + tx.amountCents + (tx.adminFeeCents ?? 0), 0)
	);
	let sisaToday = $derived(Math.max(totalTargetToday - totalSpentToday, 0));
	let overspentToday = $derived(hasBudget ? Math.max(totalSpentToday - totalTargetToday, 0) : 0);
	function moveDay(offset: number) {
		const [year, month, day] = today.split('-').map(Number);
		const date = new Date(Date.UTC(year, month - 1, day + offset));
		const newDate = date.toISOString().slice(0, 10);
		today = newDate;
		void refresh(newDate);
	}

	function selectDay(date: string) {
		if (date) {
			today = date;
			void refresh(date);
		}
	}

	async function refresh(targetDate = today) {
		if (!auth.user) return;
		const sequence = ++refreshSequence;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const [settings, nextBudget, nextCategories, nextAccounts, nextTx] = await Promise.all([
			getSettings(uid),
			getDailyBudget(uid, wid, targetDate),
			listCategories(uid, wid),
			listAccounts(uid, wid),
			listTransactions(uid, wid, { type: 'expense' })
		]);
		if (sequence !== refreshSequence || targetDate !== today) return;
		currency = settings?.currency ?? auth.user.defaultCurrency;
		budget = nextBudget?.budget;
		budgetIsOverride = nextBudget?.isOverride ?? false;
		categories = nextCategories;
		accounts = nextAccounts;
		transactions = nextTx;
	}
	async function load() {
		loading = true;
		loadError = false;
		try {
			await refresh();
		} catch (error) {
			loadError = true;
			console.error(JSON.stringify({ message: 'budgets load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function openBudgetForm() {
		if (!auth.user) return;
		const editor = await getDailyBudgetEditor(auth.user.id, auth.activeWorkspaceId ?? '', today);
		editorAmount = editor.amountCents;
		editorIsOverride = editor.isOverride;
		showForm = true;
	}

	onMount(() => {
		void load();
		return listenFlotiveEvents(
			['Flotive:synced', 'Flotive:transaction-saved', 'Flotive:new-budget'],
			(event) => {
				if (event === 'Flotive:new-budget') {
					void openBudgetForm();
					return;
				}
				void refresh().catch((error) =>
					console.error(JSON.stringify({ message: 'budgets refresh failed', error: String(error) }))
				);
			}
		);
	});

	function oneditTx(tx: Transaction) {
		editingTx = tx;
		showTx = true;
	}
	function ondeleteTx(tx: Transaction) {
		toDeleteTx = tx;
	}
	async function confirmDeleteTx() {
		if (!toDeleteTx) return;
		try {
			await deleteTransaction(toDeleteTx.id);
			toDeleteTx = null;
			await refresh();
			window.dispatchEvent(new CustomEvent('Flotive:transaction-saved'));
			toast.success('Transaksi dihapus');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Gagal menghapus transaksi');
		}
	}
</script>

<svelte:head><title>Anggaran — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader title="Anggaran" description="Pantau batas dan pengeluaran harian.">
		<PageHeaderAction label="Atur Anggaran" icon="edit2" onclick={() => void openBudgetForm()} />
	</PageHeader>

	{#if loading}
		<PageSkeleton
			count={4}
			containerClass="grid grid-cols-2 gap-3 lg:grid-cols-4"
			itemClass="h-24 rounded-xl"
		/>
	{:else if loadError}
		<PageLoadError onretry={() => void load()} />
	{:else}
		<PeriodNavigator
			onprev={() => moveDay(-1)}
			onnext={() => moveDay(1)}
			prevLabel="Hari sebelumnya"
			nextLabel="Hari berikutnya"
		>
			<DatePicker bind:value={today} onchange={selectDay} class="w-44 text-center" />
			{#if today !== todayISO()}
				<button
					class="text-xs whitespace-nowrap text-muted-foreground hover:text-foreground"
					onclick={() => {
						today = todayISO();
						void refresh();
					}}>Kembali ke hari ini</button
				>
			{/if}
		</PeriodNavigator>

		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<MetricCard
				label="Target Hari Ini"
				value={formatCurrency(totalTargetToday, currency)}
				sub={hasBudget
					? budgetIsOverride
						? 'Khusus tanggal ini'
						: 'Mengikuti anggaran harian'
					: 'Belum diatur'}
				icon="coins"
				tone="info"
			/>
			<MetricCard
				label="Terpakai Hari Ini"
				value={formatCurrency(totalSpentToday, currency)}
				sub={`${dailyExpenses.length} transaksi dalam anggaran`}
				icon="chart-bar"
				tone={overspentToday ? 'destructive' : 'default'}
			/>
			<MetricCard
				label="Sisa Hari Ini"
				value={formatCurrency(sisaToday, currency)}
				sub={hasBudget ? 'Masih dapat digunakan' : 'Atur anggaran tanggal ini'}
				icon="piggy-bank"
				tone={overspentToday
					? 'destructive'
					: totalTargetToday > 0 && sisaToday <= totalTargetToday * 0.2
						? 'warning'
						: 'success'}
			/>
			<MetricCard
				label="Melebihi"
				value={formatCurrency(overspentToday, currency)}
				sub={overspentToday ? 'Melewati batas hari ini' : 'Tidak melebihi batas'}
				icon="warning"
				tone={overspentToday ? 'destructive' : 'success'}
			/>
		</div>

		<TransactionTable
			txs={dailyExpenses}
			{accounts}
			{categories}
			{currency}
			onedit={oneditTx}
			ondelete={ondeleteTx}
		/>
	{/if}
</div>

{#if auth.user}
	<Dialog bind:open={showForm}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Atur Anggaran</DialogTitle>
				<DialogDescription>
					Batas berlaku mulai {formatDate(today)} sampai diubah kembali pada tanggal lain.
				</DialogDescription>
			</DialogHeader>
			{#key `${today}:${showForm}:${editorIsOverride}:${editorAmount}`}
				<BudgetForm
					userId={auth.user.id}
					workspaceId={auth.activeWorkspaceId ?? ''}
					{currency}
					startDate={today}
					amountCents={editorAmount}
					isOverride={editorIsOverride}
					onSaved={async (saved) => {
						showForm = false;
						if (saved.startDate <= today && (!saved.endDate || saved.endDate >= today)) {
							budget = saved;
						}
						await refresh(today);
					}}
					onCancel={() => (showForm = false)}
				/>
			{/key}
		</DialogContent>
	</Dialog>
{/if}

{#if showTx && auth.user}
	<TransactionDialog
		userId={auth.user.id}
		workspaceId={auth.activeWorkspaceId ?? ''}
		{accounts}
		{categories}
		{currency}
		editing={editingTx}
		onSaved={() => {
			showTx = false;
			editingTx = null;
			refresh();
		}}
		onclose={() => {
			showTx = false;
			editingTx = null;
		}}
	/>
{/if}

<ConfirmDialog
	open={Boolean(toDeleteTx)}
	title="Hapus transaksi?"
	description="Data dipindahkan ke Tong Sampah dan dapat dipulihkan dalam 30 hari."
	onOpenChange={(open) => {
		if (!open) toDeleteTx = null;
	}}
	onconfirm={confirmDeleteTx}
/>
