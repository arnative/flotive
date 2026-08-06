<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import { monthKey, paymentAmount } from '$lib/bills';
	import {
		cancelBillPayment,
		deleteBill,
		getSettings,
		getWorkspaceBudget,
		listAccounts,
		listBills,
		payBill,
		upsertWorkspaceBudget
	} from '$lib/storage';
	import {
		formatCurrency,
		formatInputInteger,
		formatLiveInput,
		parseToCents
	} from '$lib/utils/currency';
	import BillForm from '$lib/components/bill-form.svelte';
	import PeriodNavigator from '$lib/components/period-navigator.svelte';
	import BillTable from '$lib/components/bill-table.svelte';
	import MetricCard from '$lib/components/metric-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Icon } from '$lib/components/ui/icon';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { FormField } from '$lib/components/ui/form-field';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { todayISO } from '$lib/utils/format';
	import { toast } from 'svelte-sonner';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import type { Account, Bill } from '$lib/db/schema';
	import { listenFlotiveEvents } from '$lib/client-events';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PageHeaderAction from '$lib/components/page-header-action.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let bills = $state<Bill[]>([]);
	let accounts = $state<Account[]>([]);
	let currency = $state('IDR');
	let monthlyIncomeCents = $state(0);
	let selectedMonth = $state(new Date());
	let loading = $state(true);
	let loadError = $state(false);
	let showForm = $state(false);
	let editing = $state<Bill | null>(null);
	let toDelete = $state<Bill | null>(null);
	let incomeOpen = $state(false);
	let incomeRaw = $state('');
	let paymentOpen = $state(false);
	let paymentBill = $state<Bill | null>(null);
	let paymentAccountId = $state('');
	let paymentDate = $state(todayISO());
	let paymentAmountRaw = $state('');
	let paymentNoteInput = $state('');
	let paying = $state(false);

	const MONTH_NAMES = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];

	let currentYear = new Date().getFullYear();
	let yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

	function updateSelectedMonth(monthIndex: number, year: number) {
		selectedMonth = new Date(year, monthIndex, 1);
	}

	let period = $derived(monthKey(selectedMonth));
	let monthLabel = $derived(
		new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(selectedMonth)
	);
	let sortedBills = $derived([...bills].sort((a, b) => a.dueDay - b.dueDay));
	let totalBills = $derived(bills.reduce((total, bill) => total + bill.amountCents, 0));
	let paidTotal = $derived(
		bills.reduce(
			(total, bill) => total + (bill.payments[period] ? paymentAmount(bill, period) : 0),
			0
		)
	);
	let remainingToPay = $derived(totalBills - paidTotal);
	let availableBudget = $derived(monthlyIncomeCents - totalBills);
	let sortedAccounts = $derived(
		[...accounts].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
	);

	async function refresh() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const [settings, budget, nextBills, nextAccounts] = await Promise.all([
			getSettings(uid),
			getWorkspaceBudget(uid, wid),
			listBills(uid, wid),
			listAccounts(uid, wid)
		]);
		currency = settings?.currency ?? auth.user.defaultCurrency;
		monthlyIncomeCents = budget;
		bills = nextBills;
		accounts = nextAccounts;
	}

	onMount(() => {
		void load();
		return listenFlotiveEvents(['Flotive:synced', 'Flotive:new-bill'], (event) => {
			if (event === 'Flotive:new-bill') {
				editing = null;
				showForm = true;
				return;
			}
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'bills refresh failed', error: String(error) }))
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
			console.error(JSON.stringify({ message: 'bills load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	function moveMonth(offset: number) {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1);
	}

	function openIncome() {
		incomeRaw = formatInputInteger(monthlyIncomeCents, currency);
		incomeOpen = true;
	}

	async function saveIncome() {
		if (!auth.user) return;
		const amount = parseToCents(incomeRaw);
		if (amount < 0) return toast.error('Anggaran tidak boleh negatif');
		await upsertWorkspaceBudget(auth.user.id, auth.activeWorkspaceId ?? '', amount);
		monthlyIncomeCents = amount;
		incomeOpen = false;
		toast.success('Anggaran bulanan disimpan');
	}

	async function togglePaid(bill: Bill) {
		if (bill.payments[period]) {
			await cancelBillPayment(bill, period);
			await refresh();
			window.dispatchEvent(new CustomEvent('Flotive:transaction-saved'));
			toast.success('Pembayaran tagihan dibatalkan');
			return;
		}
		if (!sortedAccounts.length) return toast.error('Tambahkan akun/dompet terlebih dahulu');
		paymentBill = bill;
		paymentAccountId =
			sortedAccounts.find((account) => account.isDefault)?.id ?? sortedAccounts[0].id;
		paymentDate = todayISO();
		paymentAmountRaw = formatInputInteger(bill.amountCents, currency);
		paymentNoteInput = '';
		paymentOpen = true;
	}

	async function confirmPayment() {
		if (!auth.user || !paymentBill || !paymentAccountId) return;
		const actualAmountCents = parseToCents(paymentAmountRaw);
		if (actualAmountCents <= 0) return toast.error('Nominal aktual harus lebih dari 0');
		paying = true;
		try {
			const saved = await payBill(
				auth.user.id,
				auth.activeWorkspaceId ?? '',
				paymentBill,
				period,
				paymentAccountId,
				paymentDate,
				actualAmountCents,
				paymentNoteInput
			);
			if (!saved) return toast.error('Gagal mencatat pembayaran');
			paymentOpen = false;
			paymentBill = null;
			await refresh();
			window.dispatchEvent(new CustomEvent('Flotive:transaction-saved'));
			toast.success('Tagihan lunas dan saldo akun diperbarui');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Gagal mencatat pembayaran');
		} finally {
			paying = false;
		}
	}

	async function confirmDelete() {
		if (!toDelete) return;
		await deleteBill(toDelete.id);
		toDelete = null;
		await refresh();
		toast.success('Tagihan dihapus');
	}

	function editBill(bill: Bill) {
		if (bill.payments[period]) {
			toast.info('Batalkan status lunas terlebih dahulu untuk mengedit tagihan bulan ini.');
			return;
		}
		editing = bill;
		showForm = true;
	}
</script>

<svelte:head><title>Tagihan - Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader title="Tagihan" description="Atur tagihan rutin dan pantau pembayaran setiap bulan.">
		<PageHeaderAction
			label="Tambah Tagihan"
			icon="memo-plus"
			onclick={() => {
				editing = null;
				showForm = true;
			}}
		/>
	</PageHeader>

	<PeriodNavigator
		onprev={() => moveMonth(-1)}
		onnext={() => moveMonth(1)}
		prevLabel="Bulan sebelumnya"
		nextLabel="Bulan berikutnya"
	>
		<div class="flex items-center gap-1.5">
			<Select
				type="single"
				value={String(selectedMonth.getMonth())}
				onValueChange={(val) =>
					val != null && updateSelectedMonth(Number(val), selectedMonth.getFullYear())}
			>
				<SelectTrigger class="h-9 w-[130px] border-border text-xs font-medium">
					{MONTH_NAMES[selectedMonth.getMonth()]}
				</SelectTrigger>
				<SelectContent>
					{#each MONTH_NAMES as name, idx}
						<SelectItem value={String(idx)}>{name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>

			<Select
				type="single"
				value={String(selectedMonth.getFullYear())}
				onValueChange={(val) =>
					val != null && updateSelectedMonth(selectedMonth.getMonth(), Number(val))}
			>
				<SelectTrigger class="h-9 w-[90px] border-border text-xs font-medium">
					{selectedMonth.getFullYear()}
				</SelectTrigger>
				<SelectContent>
					{#each yearOptions as yr}
						<SelectItem value={String(yr)}>{yr}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>

		{#if monthKey(selectedMonth) !== monthKey(new Date())}
			<button
				class="text-xs whitespace-nowrap text-muted-foreground hover:text-foreground"
				onclick={() => (selectedMonth = new Date())}
			>
				Kembali ke bulan ini
			</button>
		{/if}
	</PeriodNavigator>

	{#if loading}
		<PageSkeleton
			count={4}
			containerClass="grid grid-cols-2 gap-3 lg:grid-cols-4"
			itemClass="h-24 rounded-xl"
		/>
	{:else if loadError}
		<PageLoadError onretry={() => void load()} />
	{:else}
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<button class="text-left" onclick={openIncome} aria-label="Ubah anggaran bulanan">
				<MetricCard
					label="Pendapatan Bulanan"
					value={formatCurrency(monthlyIncomeCents, currency)}
					sub="Klik untuk mengubah"
					icon="money"
				/>
			</button>
			<MetricCard
				label="Total Tagihan"
				value={formatCurrency(totalBills, currency)}
				sub={`${bills.length} tagihan rutin`}
				icon="bill-list"
			/>
			<MetricCard
				label="Belum Dibayar"
				value={formatCurrency(remainingToPay, currency)}
				sub={`${formatCurrency(paidTotal, currency)} sudah lunas`}
				icon="history"
				tone={remainingToPay ? 'warning' : 'success'}
			/>
			<MetricCard
				label="Sisa Setelah Tagihan"
				value={formatCurrency(availableBudget, currency)}
				sub="Setelah semua tagihan"
				icon="wallet"
				tone={availableBudget < 0 ? 'destructive' : 'success'}
			/>
		</div>

		{#if bills.length === 0}
			<EmptyState
				title="Belum ada tagihan"
				description="Tambahkan tagihan rutin pertama untuk mulai merencanakan anggaran."
				icon="bill-list"
			/>
		{:else}
			<BillTable
				bills={sortedBills}
				{accounts}
				{period}
				{currency}
				ontogglepaid={togglePaid}
				onedit={editBill}
				ondelete={(b) => (toDelete = b)}
			/>
		{/if}
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
				><DialogTitle>{editing ? 'Edit Tagihan' : 'Tambah Tagihan'}</DialogTitle><DialogDescription
					>Tagihan ini otomatis tersedia pada setiap periode bulan.</DialogDescription
				></DialogHeader
			>
			<BillForm
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

<Dialog bind:open={incomeOpen}>
	<DialogContent>
		<DialogHeader
			><DialogTitle>Pendapatan Bulanan</DialogTitle><DialogDescription
				>Nilai ini digunakan untuk menghitung sisa setelah seluruh tagihan.</DialogDescription
			></DialogHeader
		>
		<div class="p-5">
			<FormField label="Nominal" for="monthly-income"
				><Input
					id="monthly-income"
					inputmode="numeric"
					value={incomeRaw}
					oninput={(event) => (incomeRaw = formatLiveInput(event.currentTarget.value))}
					class="tabular-nums"
				/></FormField
			>
		</div>
		<DialogFooter
			><Button variant="outline" onclick={() => (incomeOpen = false)}>Batal</Button><Button
				onclick={saveIncome}>Simpan</Button
			></DialogFooter
		>
	</DialogContent>
</Dialog>

<Dialog
	bind:open={paymentOpen}
	onOpenChange={(open) => {
		if (!open) paymentBill = null;
	}}
>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Bayar {paymentBill?.name ?? 'Tagihan'}</DialogTitle>
			<DialogDescription
				>Masukkan nominal pada tagihan bulan ini. Nilai ini akan dicatat sebagai pengeluaran.</DialogDescription
			>
		</DialogHeader>
		<div class="space-y-4 p-5">
			<FormField label="Nominal aktual" for="bill-payment-amount">
				<Input
					id="bill-payment-amount"
					inputmode="numeric"
					value={paymentAmountRaw}
					oninput={(event) =>
						(paymentAmountRaw = formatLiveInput(event.currentTarget.value, currency))}
					class="text-lg tabular-nums"
				/>
			</FormField>
			<FormField label="Akun pembayaran">
				<Select type="single" bind:value={paymentAccountId}>
					<SelectTrigger class="w-full"
						>{sortedAccounts.find((account) => account.id === paymentAccountId)?.name ??
							'Pilih akun'}</SelectTrigger
					>
					<SelectContent
						>{#each sortedAccounts as account (account.id)}<SelectItem value={account.id}
								>{account.name}</SelectItem
							>{/each}</SelectContent
					>
				</Select>
			</FormField>
			<FormField label="Tanggal pembayaran" for="bill-payment-date">
				<DatePicker id="bill-payment-date" bind:value={paymentDate} placeholder={todayISO()} />
			</FormField>
			<FormField label="Catatan" for="bill-payment-note">
				<Textarea
					id="bill-payment-note"
					bind:value={paymentNoteInput}
					rows={2}
					placeholder="Opsional (mis. bukti/keterangan transfer)"
				/>
			</FormField>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (paymentOpen = false)}>Batal</Button>
			<Button onclick={confirmPayment} disabled={paying}
				>{paying ? 'Menyimpan...' : 'Bayar dan Tandai Lunas'}</Button
			>
		</DialogFooter>
	</DialogContent>
</Dialog>

<ConfirmDialog
	open={Boolean(toDelete)}
	title="Hapus tagihan?"
	description="Riwayat pembayaran tagihan ini juga akan dihapus dari daftar."
	onOpenChange={(open) => {
		if (!open) toDelete = null;
	}}
	onconfirm={confirmDelete}
/>
