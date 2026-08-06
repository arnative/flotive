<script lang="ts">
	import { Icon } from '$lib/components/ui/icon';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		titleClass?: string;
		description?: string;
		icon?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		title,
		titleClass = '',
		description,
		icon = 'file-text',
		class: customClass = '',
		children
	}: Props = $props();
</script>

<div class={cn('rounded-2xl border border-input bg-card p-10 text-center', customClass)}>
	{#if icon}
		<div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
			<Icon name={icon} class="text-2xl text-muted-foreground" />
		</div>
	{/if}
	<h2 class={cn('text-sm font-medium text-foreground', titleClass)}>{title}</h2>
	{#if description}
		<p class="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground">
			{description}
		</p>
	{/if}
	{#if children}
		<div class="mt-4 flex items-center justify-center gap-2">
			{@render children()}
		</div>
	{/if}
</div>
