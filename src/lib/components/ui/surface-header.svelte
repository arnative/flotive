<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: {
		ref?: HTMLElement | null;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<header
	bind:this={ref}
	class={cn(
		'relative flex min-h-[44px] border-b border-border bg-card px-4 py-2.5',
		className
	)}
	{...restProps}
>
	{@render children()}
</header>
