<script lang="ts">
	import { cn } from '$lib/utils';
	import { Card } from '$lib/components/ui/card';
	import { Icon } from '$lib/components/ui/icon';

	let {
		label,
		value,
		sub,
		icon,
		tone = 'default',
		class: className
	}: {
		label: string;
		value: string;
		sub?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
		class?: string;
	} = $props();

	const tones: Record<string, string> = {
		default: '',
		success: 'text-success',
		warning: 'text-warning',
		destructive: 'text-destructive',
		info: 'text-info'
	};

	// Font adaptif berbasis jumlah digit: nominal umum tetap besar, hanya miliaran+ yang dikecilkan.
	const valueSize = $derived.by(() => {
		const digits = value.replace(/\D/g, '').length;
		return digits > 12 ? 'text-xs' : digits > 9 ? 'text-sm' : 'text-sm sm:text-lg';
	});
</script>

<Card class={cn('p-3 flex flex-col', className)}>
	<div class="flex items-baseline justify-between gap-2">
		<span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
		{#if icon}
			{#if typeof icon === 'string'}
				<span class={tones[tone]}><Icon name={icon} class="text-sm" /></span>
			{:else}
				{@const I = icon}
				<span class={tones[tone]}><I class="size-3.5" /></span>
			{/if}
		{/if}
	</div>
	<div class="mt-auto pt-2">
		<div class={cn('font-semibold tabular-nums whitespace-nowrap', valueSize, tones[tone])}>{value}</div>
		{#if sub}<div class="mt-0.5 text-xs text-muted-foreground">{sub}</div>{/if}
	</div>
</Card>
