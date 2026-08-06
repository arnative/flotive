<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import type { Account, Bill } from '$lib/db/schema';
	import { billStatus, dueDateFor, paymentAmount, paymentNote, type BillStatus } from '$lib/bills';
	import { ACCOUNT_TYPE_META } from '$lib/accounts';
	import SearchInput from '$lib/components/search-input.svelte';

	let {
		bills = [],
		accounts = [],
		period,
		currency = 'IDR',
		ontogglepaid,
		onedit,
		ondelete
	}: {
		bills: Bill[];
		accounts?: Account[];
		period: string;
		currency?: string;
		ontogglepaid?: (bill: Bill) => void;
		onedit?: (bill: Bill) => void;
		ondelete?: (bill: Bill) => void;
	} = $props();

	let search = $state('');
	let statusFilter = $state<string>('all');
	let typeFilter = $state<string>('all');

	const statuses: Record<
		BillStatus,
		{ label: string; variant: 'outline' | 'warning' | 'destructive' | 'info' | 'purple' }
	> = {
		upcoming: { label: 'Akan datang', variant: 'outline' },
		soon: { label: 'Segera', variant: 'warning' },
		today: { label: 'Hari ini', variant: 'destructive' },
		overdue: { label: 'Terlambat', variant: 'destructive' },
		paid: { label: 'Lunas', variant: 'info' }
	};

	function formattedDueDate(bill: Bill): string {
		const date = dueDateFor(period, bill.dueDay);
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function paymentAccount(bill: Bill): Account | undefined {
		const payment = bill.payments[period];
		return typeof payment === 'object' && payment.accountId
			? accounts.find((account) => account.id === payment.accountId)
			: undefined;
	}

	function paymentAccountLabel(bill: Bill): string {
		const account = paymentAccount(bill);
		return account ? `${account.name} (${ACCOUNT_TYPE_META[account.type].label})` : '-';
	}

	let filteredBills = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return bills.filter((b) => {
			const status = billStatus(b, period);
			if (statusFilter !== 'all' && status !== statusFilter) return false;

			const acc = paymentAccount(b);

			if (typeFilter !== 'all' && acc?.type !== typeFilter) return false;

			if (!q) return true;
			const pAccName = acc?.name.toLowerCase() ?? '';
			const pAccType = acc ? ACCOUNT_TYPE_META[acc.type].label.toLowerCase() : '';
			const note = paymentNote(b, period).toLowerCase();
			const estimated = formatCurrency(b.amountCents, currency).toLowerCase();
			const actual = b.payments[period]
				? formatCurrency(paymentAmount(b, period), currency).toLowerCase()
				: '';

			return (
				b.name.toLowerCase().includes(q) ||
				note.includes(q) ||
				pAccName.includes(q) ||
				pAccType.includes(q) ||
				estimated.includes(q) ||
				actual.includes(q)
			);
		});
	});

	function resetFilters() {
		search = '';
		statusFilter = 'all';
		typeFilter = 'all';
	}
</script>

<div class="space-y-3">
	<!-- Filter Bar -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
		<SearchInput
			bind:value={search}
			placeholder="Cari tagihan, catatan, nominal, atau akun..."
			class="flex-1"
		/>
		<div class="flex flex-wrap items-center gap-2">
			<Select type="single" bind:value={statusFilter}>
				<SelectTrigger class="w-full sm:w-44">
					{statusFilter === 'all' ? 'Semua status' : statuses[statusFilter as BillStatus].label}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua status</SelectItem>
					<SelectItem value="upcoming">Akan datang</SelectItem>
					<SelectItem value="soon">Segera jatuh tempo</SelectItem>
					<SelectItem value="today">Jatuh tempo hari ini</SelectItem>
					<SelectItem value="overdue">Terlambat</SelectItem>
					<SelectItem value="paid">Lunas</SelectItem>
				</SelectContent>
			</Select>
			<Select type="single" bind:value={typeFilter}>
				<SelectTrigger class="w-full sm:w-40">
					{typeFilter === 'all'
						? 'Semua tipe'
						: ({ cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', other: 'Lainnya' }[typeFilter] ??
							'Tipe akun')}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua tipe</SelectItem>
					<SelectItem value="bank">Bank</SelectItem>
					<SelectItem value="ewallet">E-wallet</SelectItem>
					<SelectItem value="cash">Tunai</SelectItem>
					<SelectItem value="other">Lainnya</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</div>

	{#if filteredBills.length === 0}
		<div class="space-y-3 rounded-xl border border-input bg-background p-8 text-center">
			<div class="text-sm text-muted-foreground">Tidak ada tagihan yang sesuai dengan filter.</div>
			<Button variant="outline" size="sm" onclick={resetFilters}>
				<Icon name="arrow-counter-clockwise" class="mr-1.5 text-sm" />
				Reset Filter
			</Button>
		</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-input bg-background">
			<Table>
				<TableHeader>
					<TableRow class="hover:bg-transparent">
						<TableHead>Tagihan</TableHead>
						<TableHead>Catatan</TableHead>
						<TableHead class="w-32">Jatuh Tempo</TableHead>
						<TableHead class="w-40">Status</TableHead>
						<TableHead class="w-36">Tipe Pembayaran</TableHead>
						<TableHead class="w-32 text-right">Estimasi</TableHead>
						<TableHead class="w-32 text-right">Aktual</TableHead>
						<TableHead class="w-16 text-right">Aksi</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredBills as bill (bill.id)}
						{@const status = billStatus(bill, period)}
						<TableRow>
							<TableCell class="font-medium">{bill.name}</TableCell>
							<TableCell class="max-w-48 truncate text-xs text-muted-foreground"
								>{paymentNote(bill, period)}</TableCell
							>
							<TableCell class="text-xs text-muted-foreground">{formattedDueDate(bill)}</TableCell>
							<TableCell
								><Badge variant={statuses[status].variant}>{statuses[status].label}</Badge
								></TableCell
							>
							<TableCell class="text-xs text-muted-foreground"
								>{paymentAccountLabel(bill)}</TableCell
							>
							<TableCell class="text-right tabular-nums"
								>{formatCurrency(bill.amountCents, currency)}</TableCell
							>
							<TableCell class="text-right font-medium tabular-nums"
								>{bill.payments[period]
									? formatCurrency(paymentAmount(bill, period), currency)
									: '-'}</TableCell
							>
							<TableCell class="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger
										class="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										aria-label={`Aksi ${bill.name}`}
									>
										<Icon name="more-h" class="text-base" weight="fill" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" class="w-44">
										<DropdownMenuItem
											onclick={() => ontogglepaid?.(bill)}
											class="cursor-pointer font-medium text-primary focus:text-primary"
										>
											<Icon
												name={status === 'paid' ? 'arrow-counter-clockwise' : 'check'}
												class="mr-2 text-base"
											/>
											<span>{status === 'paid' ? 'Batal Lunas' : 'Tandai Lunas'}</span>
										</DropdownMenuItem>
										<DropdownMenuItem onclick={() => onedit?.(bill)} class="cursor-pointer"
											><Icon name="pen" class="mr-2 text-base text-muted-foreground" /><span
												>Edit</span
											></DropdownMenuItem
										>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onclick={() => ondelete?.(bill)}
											variant="destructive"
											class="cursor-pointer"
											><Icon name="trash-4" class="mr-2 text-base" /><span>Hapus</span
											></DropdownMenuItem
										>
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
