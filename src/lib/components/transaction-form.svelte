<script lang="ts">
	import { untrack } from 'svelte';
	import { createTransaction, updateTransaction } from '$lib/storage';
	import { parseToCents, formatInputInteger, formatLiveInput } from '$lib/utils/currency';
	import { todayISO } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { DialogFooter } from '$lib/components/ui/dialog';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { toast } from 'svelte-sonner';
	import type { Account, Category, Transaction, TransactionType, DebtType } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		accounts,
		categories,
		currency = 'IDR',
		editing = null,
		onSaved,
		onCancel
	}: {
		userId: string;
		workspaceId: string;
		accounts: Account[];
		categories: Category[];
		currency?: string;
		editing?: Transaction | null;
		onSaved?: (tx: Transaction) => void;
		onCancel?: () => void;
	} = $props();

	let type = $state<TransactionType>(untrack(() => editing?.type ?? 'expense'));
	let amountRaw = $state(
		untrack(() => (editing ? formatInputInteger(editing.amountCents, currency) : ''))
	);
	let categoryId = $state<string>(untrack(() => editing?.categoryId ?? ''));
	let date = $state(untrack(() => editing?.date ?? todayISO()));
	let accountId = $state<string>(
		untrack(
			() =>
				editing?.accountId ??
				accounts.find((account) => account.isDefault)?.id ??
				accounts[0]?.id ??
				''
		)
	);
	let toAccountId = $state<string>(untrack(() => editing?.toAccountId ?? ''));
	let debtEnabled = $state(untrack(() => editing?.debtType != null));
	let adminFeeEnabled = $state(untrack(() => editing?.adminFeeCents != null));
	let adminFeeRaw = $state(
		untrack(() =>
			editing?.adminFeeCents ? formatInputInteger(editing.adminFeeCents, currency) : ''
		)
	);
	let inBudget = $state(untrack(() => editing?.inBudget ?? false));
	let debtKind = $state<DebtType>(untrack(() => editing?.debtType ?? 'hutang'));
	let counterparty = $state(untrack(() => editing?.counterparty ?? ''));
	let note = $state(untrack(() => editing?.note ?? ''));
	let saving = $state(false);

	let availableCategories = $derived(
		categories.filter((c) =>
			type === 'income'
				? c.kind === 'income' || c.kind === 'both'
				: c.kind === 'expense' || c.kind === 'both'
		)
	);
	let sortedAccounts = $derived(
		[...accounts].sort(
			(a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt
		)
	);

	function onAmountInput(e: Event) {
		amountRaw = formatLiveInput((e.target as HTMLInputElement).value, currency);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const amountCents = parseToCents(amountRaw);
		if (amountCents <= 0) return toast.error('Nominal harus lebih dari 0');
		if (!accountId) return toast.error('Pilih akun/dompet');
		if (!date) return toast.error('Tanggal wajib diisi');
		if (type !== 'transfer' && !categoryId) return toast.error('Pilih kategori');
		if (type === 'transfer' && (!toAccountId || toAccountId === accountId))
			return toast.error('Pilih akun tujuan yang berbeda');
		if (debtEnabled && !counterparty.trim())
			return toast.error('Nama pihak wajib untuk hutang/piutang');
		const adminFeeCents = type === 'transfer' && adminFeeEnabled ? parseToCents(adminFeeRaw) : null;
		if (type === 'transfer' && adminFeeEnabled && (adminFeeCents === null || adminFeeCents <= 0))
			return toast.error('Biaya admin harus lebih dari 0');

		saving = true;
		const payload = {
			accountId,
			type,
			amountCents,
			categoryId: type === 'transfer' ? null : categoryId || null,
			date,
			note: note.trim() || null,
			debtType: type === 'transfer' ? null : debtEnabled ? debtKind : null,
			counterparty: debtEnabled ? counterparty.trim() : null,
			toAccountId: type === 'transfer' ? toAccountId : null,
			adminFeeCents,
			inBudget: type === 'expense' ? inBudget : false
		};
		const result = editing
			? await updateTransaction(editing.id, payload)
			: await createTransaction(userId, workspaceId, payload);
		saving = false;
		if (result) {
			toast.success(editing ? 'Transaksi diperbarui' : 'Transaksi ditambahkan');
			onSaved?.(result);
		} else {
			toast.error('Gagal menyimpan transaksi');
		}
	}
</script>

<form onsubmit={submit}>
	<div class="space-y-4 p-5">
		<Tabs bind:value={type} class="w-full">
			<TabsList class="grid h-11 w-full grid-cols-3 p-1">
				<TabsTrigger value="expense">Pengeluaran</TabsTrigger>
				<TabsTrigger value="income">Pemasukan</TabsTrigger>
				<TabsTrigger value="transfer">Transfer</TabsTrigger>
			</TabsList>
		</Tabs>

		<div class="space-y-2">
			<Label for="tx-amount">Nominal</Label>
			<Input
				id="tx-amount"
				inputmode="numeric"
				value={amountRaw}
				oninput={onAmountInput}
				placeholder="0"
				class="text-lg tabular-nums"
			/>
		</div>

		{#if type !== 'transfer'}
			<div class="space-y-2">
				<Label>Kategori</Label>
				<Select type="single" bind:value={categoryId}>
					<SelectTrigger class="w-full"
						>{categories.find((c) => c.id === categoryId)?.name ?? 'Pilih kategori'}</SelectTrigger
					>
					<SelectContent>
						{#each availableCategories as c (c.id)}<SelectItem value={c.id}>{c.name}</SelectItem
							>{/each}
					</SelectContent>
				</Select>
			</div>
		{/if}

		<div class="space-y-2">
			<Label>{type === 'transfer' ? 'Dari akun' : 'Akun/dompet'}</Label>
			<Select type="single" bind:value={accountId}>
				<SelectTrigger class="w-full"
					>{accounts.find((a) => a.id === accountId)?.name ?? 'Pilih akun'}</SelectTrigger
				>
				<SelectContent>
					{#each sortedAccounts as a (a.id)}<SelectItem value={a.id}>{a.name}</SelectItem>{/each}
				</SelectContent>
			</Select>
		</div>
		{#if type === 'transfer'}
			<div class="space-y-2">
				<Label>Ke akun</Label>
				<Select type="single" bind:value={toAccountId}>
					<SelectTrigger class="w-full"
						>{accounts.find((a) => a.id === toAccountId)?.name ??
							'Pilih akun tujuan'}</SelectTrigger
					>
					<SelectContent>
						{#each sortedAccounts as a (a.id)}<SelectItem value={a.id}>{a.name}</SelectItem>{/each}
					</SelectContent>
				</Select>
			</div>
		{/if}

		<div class="space-y-2">
			<Label for="tx-date">Tanggal</Label>
			<DatePicker id="tx-date" bind:value={date} placeholder={todayISO()} />
		</div>

		{#if type === 'expense'}
			<label
				for="budget-check"
				class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input p-3 text-sm select-none"
			>
				<Checkbox id="budget-check" bind:checked={inBudget} />
				<span>
					<span class="block font-medium">Anggaran</span>
					<span class="block text-xs text-muted-foreground"
						>Hitung transaksi ini dalam anggaran harian.</span
					>
				</span>
			</label>
		{/if}

		{#if type === 'transfer'}
			<div class="space-y-3 rounded-lg border border-input p-3">
				<label
					for="admin-fee-check"
					class="flex cursor-pointer items-center gap-2.5 text-sm font-medium select-none"
				>
					<Checkbox id="admin-fee-check" bind:checked={adminFeeEnabled} />
					<span>Biaya admin</span>
				</label>
				{#if adminFeeEnabled}
					<div class="space-y-2">
						<Label for="tx-admin-fee">Nominal biaya admin</Label>
						<Input
							id="tx-admin-fee"
							inputmode="numeric"
							value={adminFeeRaw}
							oninput={(e) =>
								(adminFeeRaw = formatLiveInput((e.target as HTMLInputElement).value, currency))}
							placeholder="0"
							class="tabular-nums"
						/>
					</div>
				{/if}
			</div>
		{:else}
			<div class="space-y-3 rounded-lg border border-input p-3">
				<label
					for="debt-check"
					class="flex cursor-pointer items-center gap-2.5 text-sm font-medium select-none"
				>
					<Checkbox id="debt-check" bind:checked={debtEnabled} />
					<span>Tandai sebagai hutang/piutang</span>
				</label>
				{#if debtEnabled}
					<Tabs bind:value={debtKind} class="w-full">
						<TabsList class="grid h-10 w-full grid-cols-2 p-1">
							<TabsTrigger value="hutang">Hutang</TabsTrigger>
							<TabsTrigger value="piutang">Piutang</TabsTrigger>
						</TabsList>
					</Tabs>
					<div class="space-y-2">
						<Label for="tx-party">Pihak</Label>
						<Input id="tx-party" bind:value={counterparty} placeholder="Nama orang/perusahaan" />
					</div>
				{/if}
			</div>
		{/if}

		<div class="space-y-2">
			<Label for="tx-note">Catatan (opsional)</Label>
			<Textarea id="tx-note" bind:value={note} rows={2} placeholder="Catatan tambahan" />
		</div>
	</div>

	<DialogFooter>
		<Button type="button" variant="outline" onclick={onCancel}>Batal</Button>
		<Button type="submit" disabled={saving}
			>{saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambah'}</Button
		>
	</DialogFooter>
</form>
