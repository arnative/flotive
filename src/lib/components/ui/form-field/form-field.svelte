<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		label,
		for: htmlFor,
		description,
		class: className = '',
		children
	}: {
		label?: string;
		for?: string;
		description?: string;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<Label for={htmlFor}>{label}</Label>
	{/if}
	{@render children?.()}
	{#if description}
		<p class="text-xs text-muted-foreground">{description}</p>
	{/if}
</div>
