<script lang="ts">
	import {
		formatCurrency,
		formatInputInteger,
		formatLiveInput,
		parseToCents
	} from '$lib/utils/currency';
	import { formatDate, todayISO } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import { recordDebtPayment, listDebtPayments } from '$lib/storage';
	import { toast } from 'svelte-sonner';
	import DebtStatusBadge from './debt-status-badge.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import type { Account, Debt, DebtStatus, DebtType, Transaction } from '$lib/db/schema';
	import SearchInput from '$lib/components/search-input.svelte';

	let {
		debts,
		accounts = [],
		userId = '',
		workspaceId = '',
		currency,
		onedit,
		ondelete,
		onrefresh
	}: {
		debts: Debt[];
		accounts?: Account[];
		userId?: string;
		workspaceId?: string;
		currency: string;
		onedit?: (d: Debt) => void;
		ondelete?: (d: Debt) => void;
		onrefresh?: () => void;
	} = $props();

	let search = $state('');
	let typeFilter = $state<string>('all');
	let statusFilter = $state<string>('all');

	// Pay Dialog State
	let payDialogOpen = $state(false);
	let historyDialogOpen = $state(false);
	let selectedDebt = $state<Debt | null>(null);

	let payAmountRaw = $state('');
	let payAccountId = $state('');
	let payDate = $state('');
	let payNote = $state('');
	let paying = $state(false);

	// History Dialog State
	let historyList = $state<Transaction[]>([]);
	let loadingHistory = $state(false);

	let filtered = $derived.by(() => {
		let list = debts;
		if (typeFilter !== 'all') list = list.filter((d) => d.type === (typeFilter as DebtType));
		if (statusFilter !== 'all')
			list = list.filter((d) => d.status === (statusFilter as DebtStatus));
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(d) => d.counterparty.toLowerCase().includes(q) || (d.note ?? '').toLowerCase().includes(q)
			);
		}
		return list;
	});
	let sortedAccounts = $derived(
		[...accounts].sort(
			(a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt
		)
	);

	function openPayModal(d: Debt) {
		selectedDebt = d;
		const remaining = d.amountCents - d.paidCents;
		payAmountRaw = formatInputInteger(remaining > 0 ? remaining : d.amountCents, currency);
		payAccountId = accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? '';
		payDate = todayISO();
		payNote = '';
		payDialogOpen = true;
	}

	async function submitPayment(e: SubmitEvent) {
		e.preventDefault();
		if (!selectedDebt || !userId) return;
		const amountCents = parseToCents(payAmountRaw);
		if (amountCents <= 0) return toast.error('Nominal pembayaran harus lebih dari 0');
		if (!payAccountId) return toast.error('Pilih akun/dompet pembayaran');

		paying = true;
		const res = await recordDebtPayment(userId, workspaceId, selectedDebt, {
			amountCents,
			accountId: payAccountId,
			date: payDate,
			note: payNote
		});
		paying = false;

		if (res) {
			toast.success(
				selectedDebt.type === 'hutang'
					? 'Pembayaran hutang berhasil dicatat'
					: 'Penerimaan piutang berhasil dicatat'
			);
			payDialogOpen = false;
			selectedDebt = null;
			onrefresh?.();
		} else {
			toast.error('Gagal mencatat pembayaran');
		}
	}

	async function openHistoryModal(d: Debt) {
		selectedDebt = d;
		loadingHistory = true;
		historyDialogOpen = true;
		if (userId) {
			historyList = await listDebtPayments(userId, workspaceId, d.id);
		} else {
			historyList = [];
		}
		loadingHistory = false;
	}
</script>

<div class="space-y-3">
	<!-- Filter Controls -->
	<div class="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
		<SearchInput bind:value={search} placeholder="Cari pihak, catatan..." class="flex-1" />

		<div class="flex flex-wrap items-center gap-2">
			<Select type="single" bind:value={typeFilter}>
				<SelectTrigger class="w-32">
					{typeFilter === 'all' ? 'Semua tipe' : typeFilter === 'hutang' ? 'Hutang' : 'Piutang'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua tipe</SelectItem>
					<SelectItem value="hutang">Hutang</SelectItem>
					<SelectItem value="piutang">Piutang</SelectItem>
				</SelectContent>
			</Select>
			<Select type="single" bind:value={statusFilter}>
				<SelectTrigger class="w-36">
					{statusFilter === 'all'
						? 'Semua status'
						: statusFilter === 'unpaid'
							? 'Belum lunas'
							: statusFilter === 'partial'
								? 'Sebagian'
								: 'Lunas'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua status</SelectItem>
					<SelectItem value="unpaid">Belum lunas</SelectItem>
					<SelectItem value="partial">Sebagian</SelectItem>
					<SelectItem value="paid">Lunas</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</div>

	{#if filtered.length === 0}
		<EmptyState
			title="Belum ada hutang & piutang"
			description={search || typeFilter !== 'all' || statusFilter !== 'all'
				? 'Tidak ada data yang cocok dengan filter.'
				: 'Catat pinjaman, hutang kewajiban, atau piutang pertama Anda.'}
			icon="banknote-2"
		/>
	{:else}
		<div class="overflow-hidden rounded-xl border border-input bg-background">
			<Table>
				<TableHeader>
					<TableRow class="hover:bg-transparent">
						<TableHead class="w-28">Tanggal</TableHead>
						<TableHead>Pihak</TableHead>
						<TableHead>Catatan</TableHead>
						<TableHead class="w-32">Jatuh Tempo</TableHead>
						<TableHead class="w-28">Status</TableHead>
						<TableHead class="w-36 text-right">Sisa Nominal</TableHead>
						<TableHead class="w-16 text-right">Aksi</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filtered as d (d.id)}
						<TableRow>
							<!-- 1. Tanggal -->
							<TableCell class="text-xs text-muted-foreground">
								{formatDate(d.date)}
							</TableCell>

							<!-- 2. Pihak & Tipe -->
							<TableCell>
								<div class="flex items-center gap-2">
									<span class="font-medium text-foreground">{d.counterparty}</span>
									<Badge
										variant={d.type === 'hutang' ? 'purple' : 'info'}
										class="h-auto px-1.5 py-0.5 text-[0.65rem] font-medium"
									>
										{d.type === 'hutang' ? 'Hutang' : 'Piutang'}
									</Badge>
								</div>
							</TableCell>

							<!-- 3. Catatan -->
							<TableCell class="max-w-[180px] truncate text-xs text-muted-foreground">
								{d.note || '-'}
							</TableCell>

							<!-- 4. Jatuh Tempo -->
							<TableCell class="text-xs text-muted-foreground">
								{d.dueDate ? formatDate(d.dueDate) : '-'}
							</TableCell>

							<!-- 5. Status -->
							<TableCell>
								<DebtStatusBadge status={d.status} />
							</TableCell>

							<!-- 6. Nominal -->
							<TableCell class="text-right">
								<span class="text-sm font-medium text-foreground tabular-nums">
									{formatCurrency(d.amountCents - d.paidCents, currency)}
								</span>
								{#if d.paidCents > 0}
									<div class="text-[0.65rem] text-muted-foreground">
										dari {formatCurrency(d.amountCents, currency)}
									</div>
								{/if}
							</TableCell>

							<!-- 7. Aksi (Dropdown Menu Titik Tiga) -->
							<TableCell class="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger
										class="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										aria-label="Aksi"
									>
										<Icon name="more-h" class="text-base" weight="fill" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" class="w-44">
										{#if d.status !== 'paid'}
											<DropdownMenuItem
												onclick={() => openPayModal(d)}
												class="cursor-pointer font-medium text-primary focus:text-primary"
											>
												<Icon name="plus" class="mr-2 text-base" />
												<span>Bayar / Cicil</span>
											</DropdownMenuItem>
										{/if}
										<DropdownMenuItem onclick={() => openHistoryModal(d)} class="cursor-pointer">
											<Icon name="clock" class="mr-2 text-base text-muted-foreground" />
											<span>Riwayat Cicilan</span>
										</DropdownMenuItem>
										<DropdownMenuItem onclick={() => onedit?.(d)} class="cursor-pointer">
											<Icon name="pen" class="mr-2 text-base text-muted-foreground" />
											<span>Edit</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onclick={() => ondelete?.(d)}
											variant="destructive"
											class="cursor-pointer"
										>
											<Icon name="trash-4" class="mr-2 text-base" />
											<span>Hapus</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>

<!-- Modal Dialog Pembayaran / Cicilan -->
{#if payDialogOpen && selectedDebt}
	<Dialog bind:open={payDialogOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle>
					{selectedDebt.type === 'hutang' ? 'Bayar / Cicil Hutang' : 'Terima Cicilan Piutang'}
				</DialogTitle>
			</DialogHeader>

			<form onsubmit={submitPayment}>
				<div class="space-y-4 p-5">
					<div class="space-y-1.5 rounded-xl border border-input/60 bg-accent/70 p-3.5 text-xs">
						<div class="text-sm font-semibold text-foreground">{selectedDebt.counterparty}</div>
						<div class="text-muted-foreground">
							Sisa tagihan: <span class="font-semibold text-foreground"
								>{formatCurrency(selectedDebt.amountCents - selectedDebt.paidCents, currency)}</span
							>
							dari {formatCurrency(selectedDebt.amountCents, currency)}
						</div>
					</div>

					<div class="space-y-2">
						<Label for="pay-amount">Nominal Pembayaran</Label>
						<Input
							id="pay-amount"
							inputmode="numeric"
							value={payAmountRaw}
							oninput={(e) =>
								(payAmountRaw = formatLiveInput((e.target as HTMLInputElement).value, currency))}
							placeholder="0"
							class="text-lg tabular-nums"
						/>
					</div>

					<div class="space-y-2">
						<Label for="pay-account">Akun / Dompet</Label>
						<Select type="single" bind:value={payAccountId}>
							<SelectTrigger id="pay-account" class="w-full">
								{accounts.find((a) => a.id === payAccountId)?.name ?? 'Pilih Akun'}
							</SelectTrigger>
							<SelectContent>
								{#each sortedAccounts as a (a.id)}
									<SelectItem value={a.id}>{a.name}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="space-y-2">
						<Label for="pay-date">Tanggal Pembayaran</Label>
						<DatePicker id="pay-date" bind:value={payDate} placeholder={todayISO()} />
					</div>

					<div class="space-y-2">
						<Label for="pay-note">Catatan (opsional)</Label>
						<Input id="pay-note" bind:value={payNote} placeholder="Misal: Cicilan ke-1" />
					</div>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onclick={() => (payDialogOpen = false)}
						>Batal</Button
					>
					<Button type="submit" disabled={paying}>
						{paying ? 'Menyimpan…' : 'Simpan Pembayaran'}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal Dialog Riwayat Pembayaran -->
{#if historyDialogOpen && selectedDebt}
	<Dialog bind:open={historyDialogOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="flex items-center gap-2">
					<Icon name="clock" class="text-xl text-muted-foreground" />
					Riwayat — {selectedDebt.counterparty}
				</DialogTitle>
			</DialogHeader>

			<!-- Summary: Total, Dibayar, Sisa — full width bg cerah -->
			<div class="grid grid-cols-3 gap-3 border-b border-border bg-muted/40 px-5 py-4">
				<div>
					<div class="text-xs text-muted-foreground">Total Tagihan</div>
					<div class="mt-0.5 text-sm font-medium text-foreground tabular-nums">
						{formatCurrency(selectedDebt.amountCents, currency)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Sudah Dibayar</div>
					<div class="mt-0.5 text-sm font-medium text-success tabular-nums">
						{formatCurrency(selectedDebt.paidCents, currency)}
					</div>
				</div>
				<div>
					<div class="text-xs text-muted-foreground">Sisa Nominal</div>
					<div class="mt-0.5 text-sm font-medium text-foreground tabular-nums">
						{formatCurrency(selectedDebt.amountCents - selectedDebt.paidCents, currency)}
					</div>
				</div>
			</div>

			<!-- Daftar cicilan -->
			<div class="px-5 py-4">
				<div class="max-h-56 overflow-y-auto">
					{#if loadingHistory}
						<div class="py-6 text-center text-xs text-muted-foreground">Memuat riwayat…</div>
					{:else if historyList.length === 0}
						<div class="py-6 text-center text-xs text-muted-foreground">
							Belum ada riwayat transaksi cicilan tercatat.
						</div>
					{:else}
						<ul class="divide-y divide-border">
							{#each historyList as h (h.id)}
								{@const acc = accounts.find((a) => a.id === h.accountId)}
								<li class="flex items-center gap-3 py-2">
									<div class="min-w-0 flex-1">
										<div class="text-xs font-medium text-foreground">{formatDate(h.date)}</div>
										<div class="truncate text-[0.65rem] text-muted-foreground">
											{acc?.name ?? 'Akun'}{#if h.note}
												· {h.note}{/if}
										</div>
									</div>
									<div class="shrink-0 text-right text-xs font-medium text-foreground tabular-nums">
										+{formatCurrency(h.amountCents, currency)}
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (historyDialogOpen = false)}>Tutup</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
