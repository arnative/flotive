<script lang="ts">
	import IconBadge from '$lib/components/icon-badge.svelte';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		icon,
		title,
		subtitle,
		badge,
		value,
		valueClass = '',
		action,
		class: className = ''
	}: {
		icon?: string;
		title: string;
		subtitle?: string;
		badge?: Snippet;
		value?: string;
		valueClass?: string;
		action?: Snippet;
		class?: string;
	} = $props();
</script>

<div class={cn('flex items-center justify-between gap-2.5 px-4 py-2.5', className)}>
	<div class="flex min-w-0 items-center gap-2.5 flex-1">
		{#if icon}
			<IconBadge name={icon} />
		{/if}
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-1.5">
				<span class="truncate text-sm font-medium text-foreground">{title}</span>
				{#if badge}
					{@render badge()}
				{/if}
			</div>
			{#if subtitle}
				<div class="truncate text-xs text-muted-foreground">{subtitle}</div>
			{/if}
		</div>
	</div>
	{#if value !== undefined}
		<div class={cn('pl-2 text-right text-sm font-medium whitespace-nowrap text-foreground tabular-nums', valueClass)}>
			{value}
		</div>
	{/if}
	{#if action}
		<div class="shrink-0 pl-1">
			{@render action()}
		</div>
	{/if}
</div>
