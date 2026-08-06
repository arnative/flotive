<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		title: string;
		description?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		title,
		description,
		class: customClass = '',
		children
	}: Props = $props();
</script>

<div class={cn('flex items-start justify-between gap-3 sm:items-end', customClass)}>
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if description}
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if children}
		<div class="flex items-center gap-2 shrink-0 self-start sm:self-end">
			{@render children()}
		</div>
	{/if}
</div>
