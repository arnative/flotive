<script lang="ts">
	import { cn } from '$lib/utils';
	import PanelCard from '$lib/components/panel-card.svelte';
	import ListItemRow from '$lib/components/list-item-row.svelte';
	import CardPaginationFooter from '$lib/components/card-pagination-footer.svelte';
	import CardEmptyState from '$lib/components/card-empty-state.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
	import { formatCurrency } from '$lib/utils/currency';
	import type { Account, Transaction } from '$lib/db/schema';
	import { ACCOUNT_TYPE_META, accountBalance } from '$lib/accounts';

	let {
		accounts = [],
		txs = [],
		currency = 'IDR',
		class: className
	}: { accounts: Account[]; txs: Transaction[]; currency?: string; class?: string } = $props();

	let page = $state(0);
	const PAGE_SIZE = 3;
	let totalPages = $derived(Math.max(1, Math.ceil(accounts.length / PAGE_SIZE)));
	let currentPage = $derived(Math.min(page, totalPages - 1));
	let pagedAccounts = $derived(
		accounts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
	);

	function prev() {
		if (currentPage > 0) page = currentPage - 1;
	}
	function next() {
		if (currentPage < totalPages - 1) page = currentPage + 1;
	}
</script>

<PanelCard
	title="Akun & Dompet"
	description="{accounts.length} akun aktif"
	class={cn('h-full', className)}
	bodyClass="bg-background flex flex-col"
>
	{#snippet action()}
		<a
			href="/accounts"
			class="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
		>
			Lihat Semua
		</a>
	{/snippet}

	{#if accounts.length === 0}
		<CardEmptyState icon="wallet" message="Belum ada akun." />
	{:else}
		<ul class="flex-1 divide-y divide-border">
			{#each pagedAccounts as acc (acc.id)}
				<li>
					<ListItemRow
						icon={ACCOUNT_TYPE_META[acc.type].icon}
						title={acc.name}
						subtitle={ACCOUNT_TYPE_META[acc.type].label}
						value={formatCurrency(accountBalance(acc, txs), currency)}
					>
						{#snippet badge()}
							{#if acc.isDefault}
								<Badge variant="outline" class="h-4 px-1.5 text-[0.6rem] font-normal">Default</Badge
								>
							{/if}
						{/snippet}
					</ListItemRow>
				</li>
			{/each}
		</ul>

		<CardPaginationFooter {currentPage} {totalPages} onprev={prev} onnext={next} />
	{/if}
</PanelCard>
