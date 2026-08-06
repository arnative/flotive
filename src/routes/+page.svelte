<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import {
		listAccounts,
		listTransactions,
		listDebts,
		listTodos,
		listCategories,
		listBills,
		getSettings
	} from '$lib/storage';
	import { formatCurrency } from '$lib/utils/currency';
	import { isSameMonth } from '$lib/utils/format';
	import MetricCard from '$lib/components/metric-card.svelte';
	import CategoryExpenseCard from '$lib/components/category-expense-card.svelte';
	import IncomeVsExpenseCard from '$lib/components/income-vs-expense-card.svelte';
	import TodoPreview from '$lib/components/todo-preview.svelte';
	import AccountWidget from '$lib/components/account-widget.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import DashboardSkeleton from '$lib/components/dashboard-skeleton.svelte';
	import RecentTransactions from '$lib/components/recent-transactions.svelte';
	import DebtSummary from '$lib/components/debt-summary.svelte';
	import type { Account, Bill, Category, Debt, Todo, Transaction } from '$lib/db/schema';
	import { totalAccountBalance } from '$lib/accounts';
	import { listenFlotiveEvents } from '$lib/client-events';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let accounts = $state<Account[]>([]);
	let txs = $state<Transaction[]>([]);
	let debts = $state<Debt[]>([]);
	let todos = $state<Todo[]>([]);
	let categories = $state<Category[]>([]);
	let bills = $state<Bill[]>([]);
	let currency = $state('IDR');
	let loading = $state(true);
	let loadError = $state(false);

	onMount(() => {
		void load();
		return listenFlotiveEvents(['Flotive:transaction-saved', 'Flotive:synced'], () => {
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'dashboard refresh failed', error: String(error) }))
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
			console.error(JSON.stringify({ message: 'dashboard load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function refresh() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const s = await getSettings(uid);
		currency = s?.currency ?? auth.user.defaultCurrency ?? 'IDR';
		[accounts, txs, debts, todos, categories, bills] = await Promise.all([
			listAccounts(uid, wid),
			listTransactions(uid, wid),
			listDebts(uid, wid),
			listTodos(uid, wid),
			listCategories(uid, wid),
			listBills(uid, wid)
		]);
	}

	let balance = $derived(totalAccountBalance(accounts, txs));
	let monthIncome = $derived(
		txs
			.filter((t) => t.type === 'income' && isSameMonth(t.date))
			.reduce((s, t) => s + t.amountCents, 0)
	);
	let monthExpense = $derived(
		txs
			.filter((t) => t.type === 'expense' && isSameMonth(t.date))
			.reduce((s, t) => s + t.amountCents, 0)
	);
	let hutang = $derived(
		debts
			.filter((d) => d.type === 'hutang' && d.status !== 'paid')
			.reduce((s, d) => s + (d.amountCents - d.paidCents), 0)
	);
	let piutang = $derived(
		debts
			.filter((d) => d.type === 'piutang' && d.status !== 'paid')
			.reduce((s, d) => s + (d.amountCents - d.paidCents), 0)
	);

	let byCategory = $derived.by(() => {
		if (categories.length === 0 && txs.length === 0) return [];
		const catMap = new Map(categories.map((c) => [c.id, c]));
		const tagihanCat = categories.find((c) => c.name.toLowerCase() === 'tagihan');
		const map = new Map<string, number>();
		const billTxIds = new Set(
			bills.flatMap((b) =>
				Object.values(b.payments)
					.map((p) => (typeof p === 'object' && p ? p.transactionId : null))
					.filter(Boolean) as string[]
			)
		);
		for (const t of txs) {
			if (t.type === 'expense' && isSameMonth(t.date)) {
				let category = catMap.get(t.categoryId ?? '');
				if (!category && (billTxIds.has(t.id) || t.note?.toLowerCase().includes('tagihan'))) {
					category = tagihanCat;
				}
				const label = category?.name ?? 'Lainnya';
				map.set(label, (map.get(label) ?? 0) + t.amountCents);
			}
		}
		return [...map.entries()]
			.map(([label, cents]) => ({ label, cents }))
			.sort((a, b) => b.cents - a.cents);
	});

	let monthly = $derived.by(() => {
		if (txs.length === 0) return [];
		const now = new Date();
		const monthMap = new Map<string, { income: number; expense: number }>();
		const months: { label: string; key: string }[] = [];

		for (let i = 5; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			const label = d.toLocaleDateString('id-ID', { month: 'short' });
			monthMap.set(key, { income: 0, expense: 0 });
			months.push({ label, key });
		}

		for (const t of txs) {
			const key = t.date.slice(0, 7);
			const entry = monthMap.get(key);
			if (entry) {
				if (t.type === 'income') entry.income += t.amountCents;
				else if (t.type === 'expense') entry.expense += t.amountCents;
			}
		}

		return months.map((m) => {
			const e = monthMap.get(m.key) ?? { income: 0, expense: 0 };
			return { label: m.label, income: e.income, expense: e.expense, key: m.key };
		});
	});

	let isEmpty = $derived(txs.length === 0 && accounts.length === 0);
</script>

<svelte:head><title>Beranda — Flotive</title></svelte:head>

<div class="w-full space-y-4">
	<!-- Page Header -->
	<PageHeader
		title="Beranda"
		description="Pantau ringkasan keuangan, saldo akun, dan aktivitas transaksi terbaru Anda."
	/>

	{#if loading}
		<DashboardSkeleton />
	{:else if loadError}
		<PageLoadError onretry={() => void load()} />
	{:else if isEmpty}
		<EmptyState
			title={`Selamat datang, ${auth.user?.name ?? 'User'}!`}
			titleClass="text-lg font-semibold"
			description="Mulai dengan menambahkan akun dompet dan transaksi pertama Anda. Data tersimpan lokal di perangkat ini."
			icon="wallet"
		>
			<a
				href="/accounts"
				class="mt-1 inline-block text-sm font-medium text-foreground underline hover:opacity-80"
			>
				Atur akun & kategori
			</a>
		</EmptyState>
	{:else}
		<!-- Dashboard workspace -->
		<div class="grid grid-cols-1 gap-3">
			<!-- Summary: Total Saldo + 4 Metric Cards sejajar -->
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-6">
				<!-- Total Saldo -->
				<DebtSummary
					label="Total Saldo"
					totalCents={balance}
					{currency}
					class="col-span-2 lg:col-span-2"
				>
					{#snippet sub()}
						{accounts.length} akun · {txs.filter((t) => isSameMonth(t.date)).length} trx/bln
					{/snippet}
				</DebtSummary>

				<MetricCard
					label="Pemasukan"
					value={formatCurrency(monthIncome, currency)}
					icon="trend-up"
					tone="success"
				/>
				<MetricCard
					label="Pengeluaran"
					value={formatCurrency(monthExpense, currency)}
					icon="trend-down"
					tone="destructive"
				/>
				<MetricCard
					label="Hutang"
					value={formatCurrency(hutang, currency)}
					icon="banknote-2"
					tone="warning"
				/>
				<MetricCard
					label="Piutang"
					value={formatCurrency(piutang, currency)}
					icon="coins"
					tone="info"
				/>
			</div>

			<!-- Row 2: Top pair — Pengeluaran per Kategori & To-Do -->
			<div class="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-8">
				<div class="lg:col-span-5">
					<CategoryExpenseCard {byCategory} {currency} class="h-full" />
				</div>
				<div class="lg:col-span-3">
					<TodoPreview {todos} onChange={refresh} class="h-full" />
				</div>
			</div>

			<!-- Row 3: Bottom pair — Pemasukan vs Pengeluaran & Akun & Dompet -->
			<div class="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-8">
				<div class="lg:col-span-5">
					<IncomeVsExpenseCard {monthly} {currency} class="h-full" />
				</div>
				<div class="lg:col-span-3">
					<AccountWidget {accounts} {txs} {currency} class="h-full" />
				</div>
			</div>

			<!-- Row 4: Transaksi Terbaru -->
			<RecentTransactions {txs} {accounts} {categories} {currency} />
		</div>
	{/if}
</div>
