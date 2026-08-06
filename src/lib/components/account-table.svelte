<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';
	import IconBadge from '$lib/components/icon-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
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
	import type { Account, AccountType, Transaction } from '$lib/db/schema';
	import { ACCOUNT_TYPE_META, accountBalance } from '$lib/accounts';

	let {
		accounts = [],
		txs = [],
		currency = 'IDR',
		onmakedefault,
		onedit,
		ondelete
	}: {
		accounts: Account[];
		txs: Transaction[];
		currency?: string;
		onmakedefault?: (acc: Account) => void;
		onedit?: (acc: Account) => void;
		ondelete?: (acc: Account) => void;
	} = $props();

	const typeBadge: Record<AccountType, 'success' | 'info' | 'purple' | 'secondary'> = {
		cash: 'success',
		bank: 'info',
		ewallet: 'purple',
		other: 'secondary'
	};
</script>

<div class="overflow-hidden rounded-xl border border-input bg-background">
	<Table>
		<TableHeader>
			<TableRow class="hover:bg-transparent">
				<TableHead>Akun</TableHead>
				<TableHead class="w-24">Jenis</TableHead>
				<TableHead class="w-28 text-right">Saldo Awal</TableHead>
				<TableHead class="w-28 text-right">Saldo Saat Ini</TableHead>
				<TableHead class="w-12"></TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each accounts as acc (acc.id)}
				<TableRow>
					<TableCell>
						<div class="flex items-center gap-2.5">
							<IconBadge name={ACCOUNT_TYPE_META[acc.type].icon} />
							<span class="font-medium text-foreground">{acc.name}</span>
							{#if acc.isDefault}<Badge variant="outline" class="h-4 px-1.5 text-[0.6rem]"
									>Default</Badge
								>{/if}
						</div>
					</TableCell>
					<TableCell>
						<Badge variant={typeBadge[acc.type]} class="h-5 px-2 text-[0.65rem] font-medium"
							>{ACCOUNT_TYPE_META[acc.type].label}</Badge
						>
					</TableCell>
					<TableCell class="text-right">
						<span class="text-xs text-muted-foreground tabular-nums">
							{formatCurrency(acc.initialBalanceCents, currency)}
						</span>
					</TableCell>
					<TableCell class="text-right">
						<span class="text-sm font-medium text-foreground tabular-nums">
							{formatCurrency(accountBalance(acc, txs), currency)}
						</span>
					</TableCell>
					<TableCell class="text-right">
						<DropdownMenu>
							<DropdownMenuTrigger
								class="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								aria-label="Aksi akun"
							>
								<Icon name="more-h" class="text-base" weight="fill" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" class="w-36">
								{#if !acc.isDefault}
									<DropdownMenuItem onclick={() => onmakedefault?.(acc)} class="cursor-pointer">
										<Icon name="star" class="mr-2 text-base text-muted-foreground" />
										Jadikan Default
									</DropdownMenuItem>
								{/if}
								<DropdownMenuItem onclick={() => onedit?.(acc)} class="cursor-pointer">
									<Icon name="pen" class="mr-2 text-base text-muted-foreground" />
									Edit
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onclick={() => ondelete?.(acc)}
									variant="destructive"
									class="cursor-pointer"
								>
									<Icon name="trash-4" class="mr-2 text-base" />
									Hapus
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>
