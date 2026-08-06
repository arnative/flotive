<script lang="ts">
	import { formatAmount, formatCurrency } from '$lib/utils/currency';
	import PanelCard from '$lib/components/panel-card.svelte';
	import { cn } from '$lib/utils';

	let {
		byCategory = [],
		currency = 'IDR',
		class: className
	}: {
		byCategory: { label: string; cents: number }[];
		currency?: string;
		class?: string;
	} = $props();

	// Category chart — single accent color
	let totalExpense = $derived(byCategory.reduce((s, c) => s + c.cents, 0));

	let segments = $derived.by(() => {
		return byCategory.map((c) => {
			const frac = totalExpense > 0 ? c.cents / totalExpense : 0;
			return { ...c, pct: Math.round(frac * 100) };
		});
	});
</script>

<PanelCard
	title="Rincian Kategori"
	class={cn('h-full', className)}
	bodyClass="bg-background p-4 flex flex-col justify-start"
>
	{#snippet action()}
		<span class="text-xs font-medium text-muted-foreground tabular-nums">
			{totalExpense > 0 ? formatCurrency(totalExpense, currency) : '—'}
		</span>
	{/snippet}
	{#if totalExpense === 0}
		<div class="my-auto flex flex-col items-center justify-center gap-2 py-6 text-center">
			<div class="flex size-10 items-center justify-center rounded-full bg-muted">
				<span class="text-lg text-muted-foreground">—</span>
			</div>
			<p class="text-xs text-muted-foreground">Belum ada pengeluaran bulan ini.</p>
		</div>
	{:else}
		<div class="space-y-2.5">
			{#each segments.slice(0, 6) as s (s.label)}
				<div>
					<div class="mb-1 flex items-center justify-between gap-2 text-xs">
						<span class="truncate font-medium text-foreground">{s.label}</span>
						<div class="flex shrink-0 items-center gap-2">
							<span class="text-muted-foreground tabular-nums"
								>{formatAmount(s.cents, currency)}</span
							>
							<span class="text-muted-foreground/70 tabular-nums">{s.pct}%</span>
						</div>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full bg-secondary-foreground transition-all"
							style="width:{s.pct}%"
						></div>
					</div>
				</div>
			{/each}
			{#if segments.length > 6}
				<p class="pt-1 text-xs text-muted-foreground">+{segments.length - 6} kategori lainnya</p>
			{/if}
		</div>
	{/if}
</PanelCard>
