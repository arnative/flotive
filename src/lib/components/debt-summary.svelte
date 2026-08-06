<script lang="ts">
	import { formatCurrency } from '$lib/utils/currency';
	import type { Snippet } from 'svelte';

	let {
		totalCents,
		currency,
		label,
		sub,
		class: className = ''
	}: {
		totalCents: number;
		currency: string;
		label: string;
		sub?: Snippet;
		class?: string;
	} = $props();
</script>

<div class="rounded-2xl border border-input bg-card p-4 {className}">
	<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</span>
	<div class="mt-1 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
		{formatCurrency(totalCents, currency)}
	</div>
	{#if sub}
		<div class="mt-1.5 text-[0.65rem] text-muted-foreground">
			{@render sub()}
		</div>
	{/if}
</div>
