<script lang="ts">
	import PanelCard from '$lib/components/panel-card.svelte';
	import ListItemRow from '$lib/components/list-item-row.svelte';
	import CardEmptyState from '$lib/components/card-empty-state.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/format';
	import { getIcon } from '$lib/data/icons';
	import type { Account, Category, Transaction } from '$lib/db/schema';

	let {
		txs = [],
		accounts = [],
		categories = [],
		currency = 'IDR',
		limit = 5,
		class: className = ''
	}: {
		txs: Transaction[];
		accounts: Account[];
		categories: Category[];
		currency?: string;
		limit?: number;
		class?: string;
	} = $props();
</script>

<PanelCard
	title="Transaksi Terbaru"
	description="{limit} transaksi terakhir"
	class={className}
	bodyClass="bg-background"
>
	{#snippet action()}
		<a
			href="/history"
			class="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
		>
			Lihat Semua
		</a>
	{/snippet}

	{#if txs.length === 0}
		<CardEmptyState icon="transfer-h" message="Belum ada transaksi." />
	{:else}
		<div class="divide-y divide-border">
			{#each txs.slice(0, limit) as t (t.id)}
				{@const category = categories.find((c) => c.id === t.categoryId)}
				{@const account = accounts.find((a) => a.id === t.accountId)}
				{@const isIncome = t.type === 'income'}
				{@const isTransfer = t.type === 'transfer'}
				{@const iconName = category
					? getIcon(category.icon)
					: isTransfer
						? 'arrows-left-right'
						: isIncome
							? 'trend-up'
							: 'trend-down'}
				<ListItemRow
					icon={iconName}
					title={category?.name ?? (isTransfer ? 'Transfer' : 'Transaksi')}
					subtitle={`${account?.name ?? 'Akun'} · ${formatDate(t.date)}`}
					value={`${isIncome ? '+' : isTransfer ? '' : '−'}${formatCurrency(t.amountCents, currency)}`}
					valueClass={isIncome
						? 'text-success'
						: isTransfer
							? 'text-muted-foreground'
							: 'text-foreground'}
				>
					{#snippet badge()}
						{#if t.debtType}
							<Badge
								variant={t.debtType === 'hutang' ? 'purple' : 'info'}
								class="px-1.5 py-0 text-[0.6rem]"
							>
								{t.debtType === 'hutang' ? 'Hutang' : 'Piutang'}
							</Badge>
						{/if}
					{/snippet}
				</ListItemRow>
			{/each}
		</div>
	{/if}
</PanelCard>
