<script lang="ts">
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';
	import { Icon } from '$lib/components/ui/icon';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate, todayISO } from '$lib/utils/format';
	import { getIcon } from '$lib/data/icons';
	import type { Account, Category, Transaction, TransactionType } from '$lib/db/schema';
	import SearchInput from '$lib/components/search-input.svelte';
	import IconBadge from '$lib/components/icon-badge.svelte';

	let {
		txs,
		accounts,
		categories,
		currency,
		onedit,
		ondelete
	}: {
		txs: Transaction[];
		accounts: Account[];
		categories: Category[];
		currency: string;
		onedit?: (tx: Transaction) => void;
		ondelete?: (tx: Transaction) => void;
	} = $props();

	let search = $state('');
	let typeFilter = $state<string>('all');
	let accountFilter = $state<string>('all');
	let startDate = $state('');
	let endDate = $state('');

	let filtered = $derived.by(() => {
		let list = txs;
		if (typeFilter !== 'all') list = list.filter((t) => t.type === (typeFilter as TransactionType));
		if (accountFilter !== 'all')
			list = list.filter((t) => t.accountId === accountFilter || t.toAccountId === accountFilter);
		if (startDate) list = list.filter((t) => t.date >= startDate);
		if (endDate) list = list.filter((t) => t.date <= endDate);
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				(t) =>
					(t.note ?? '').toLowerCase().includes(q) ||
					(t.counterparty ?? '').toLowerCase().includes(q) ||
					(t.adminFeeCents != null &&
						t.adminFeeCents > 0 &&
						`biaya admin ${formatCurrency(t.adminFeeCents, currency)}`.toLowerCase().includes(q)) ||
					(categories.find((c) => c.id === t.categoryId)?.name ?? '').toLowerCase().includes(q)
			);
		}
		return list;
	});

	function reset() {
		search = '';
		typeFilter = 'all';
		accountFilter = 'all';
		startDate = '';
		endDate = '';
	}

	let hasFilter = $derived(
		!!search || typeFilter !== 'all' || accountFilter !== 'all' || !!startDate || !!endDate
	);
	let sortedAccounts = $derived(
		[...accounts].sort(
			(a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt
		)
	);
</script>

<div class="space-y-3">
	<!-- Filter Controls -->
	<div class="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
		<SearchInput bind:value={search} placeholder="Cari catatan, kategori..." class="flex-1" />

		<div class="flex flex-wrap items-center gap-2">
			<Select type="single" bind:value={typeFilter}>
				<SelectTrigger class="w-36">
					{typeFilter === 'all'
						? 'Semua tipe'
						: typeFilter === 'income'
							? 'Pemasukan'
							: typeFilter === 'expense'
								? 'Pengeluaran'
								: 'Transfer'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua tipe</SelectItem>
					<SelectItem value="income">Pemasukan</SelectItem>
					<SelectItem value="expense">Pengeluaran</SelectItem>
					<SelectItem value="transfer">Transfer</SelectItem>
				</SelectContent>
			</Select>
			<Select type="single" bind:value={accountFilter}>
				<SelectTrigger class="w-36">
					{accountFilter === 'all'
						? 'Semua akun'
						: (accounts.find((a) => a.id === accountFilter)?.name ?? 'Semua akun')}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua akun</SelectItem>
					{#each sortedAccounts as a (a.id)}
						<SelectItem value={a.id}>{a.name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
			<DatePicker bind:value={startDate} class="w-auto" placeholder={todayISO()} />
			<span class="text-xs text-muted-foreground">→</span>
			<DatePicker bind:value={endDate} class="w-auto" placeholder={todayISO()} />
			{#if hasFilter}
				<Button variant="ghost" size="sm" onclick={reset}
					><Icon name="x" class="text-base" />Reset</Button
				>
			{/if}
		</div>
	</div>

	<div class="text-xs font-medium text-muted-foreground">{filtered.length} transaksi</div>

	{#if filtered.length === 0}
		<div
			class="rounded-xl border border-input bg-background p-8 text-center text-sm text-muted-foreground"
		>
			Tidak ada transaksi yang cocok.
		</div>
	{:else}
		<!-- Table Format -->
		<div class="overflow-hidden rounded-xl border border-input bg-background">
			<Table>
				<TableHeader>
					<TableRow class="hover:bg-transparent">
						<TableHead class="w-28">Tanggal</TableHead>
						<TableHead class="w-36">Akun</TableHead>
						<TableHead class="w-48">Kategori</TableHead>
						<TableHead>Catatan</TableHead>
						<TableHead class="w-36 text-right">Nominal</TableHead>
						<TableHead class="w-16 text-right">Aksi</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filtered as t (t.id)}
						{@const category = categories.find((c) => c.id === t.categoryId)}
						{@const account = accounts.find((a) => a.id === t.accountId)}
						{@const toAccount = accounts.find((a) => a.id === t.toAccountId)}
						{@const isIncome = t.type === 'income'}
						{@const isTransfer = t.type === 'transfer'}
						{@const iconName = category
							? getIcon(category.icon)
							: isTransfer
								? 'arrows-left-right'
								: isIncome
									? 'trend-up'
									: 'trend-down'}
						<TableRow>
							<!-- 1. Tanggal -->
							<TableCell class="text-xs text-muted-foreground">
								{formatDate(t.date)}
							</TableCell>

							<!-- 2. Akun -->
							<TableCell class="text-xs text-muted-foreground">
								{#if isTransfer}
									{account?.name ?? '-'} → {toAccount?.name ?? '-'}
								{:else}
									{account?.name ?? '-'}
								{/if}
							</TableCell>

							<!-- 3. Kategori -->
							<TableCell>
								<div class="flex items-center gap-2">
									<IconBadge name={iconName} class="size-7 rounded-md" iconClass="text-base" />
									<span class="font-medium text-foreground">
										{category?.name ?? (isTransfer ? 'Transfer' : 'Transaksi')}
									</span>
									{#if t.debtType}
										<Badge
											variant={t.debtType === 'hutang' ? 'purple' : 'info'}
											class="h-auto px-1.5 py-0.5 text-[0.65rem] font-medium"
										>
											{t.debtType === 'hutang' ? 'Hutang' : 'Piutang'}
										</Badge>
									{/if}
								</div>
							</TableCell>

							<!-- 4. Catatan -->
							{@const noteText =
								[
									t.note || t.counterparty || null,
									t.adminFeeCents != null && t.adminFeeCents > 0
										? `Biaya Admin ${formatCurrency(t.adminFeeCents, currency)}`
										: null
								]
									.filter(Boolean)
									.join(' · ') || '-'}
							<TableCell class="max-w-[200px] truncate text-xs text-muted-foreground">
								{noteText}
							</TableCell>

							<!-- 5. Nominal -->
							<TableCell class="text-right">
								<span
									class="text-sm font-medium tabular-nums {isIncome
										? 'text-success'
										: isTransfer
											? 'text-muted-foreground'
											: 'text-foreground'}"
								>
									{isIncome ? '+' : isTransfer ? '' : '−'}{formatCurrency(t.amountCents, currency)}
								</span>
							</TableCell>

							<!-- 6. Aksi (Dropdown Menu Titik Tiga) -->
							<TableCell class="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger
										class="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										aria-label="Aksi"
									>
										<Icon name="more-h" class="text-base" weight="fill" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" class="w-36">
										<DropdownMenuItem onclick={() => onedit?.(t)} class="cursor-pointer">
											<Icon name="pen" class="mr-2 text-base text-muted-foreground" />
											<span>Edit</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onclick={() => ondelete?.(t)}
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
