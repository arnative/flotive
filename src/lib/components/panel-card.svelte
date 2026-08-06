<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import SurfaceHeader from '$lib/components/ui/surface-header.svelte';

	interface Props {
		title?: string;
		description?: string;
		class?: string;
		headerClass?: string;
		bodyClass?: string;
		action?: Snippet;
		children: Snippet;
	}

	let {
		title,
		description,
		class: className = '',
		headerClass = '',
		bodyClass = '',
		action,
		children
	}: Props = $props();
</script>

<section
	class={cn('flex flex-col overflow-hidden rounded-2xl border border-input bg-card', className)}
>
	{#if title || description || action}
		<SurfaceHeader class={cn('items-center justify-between gap-2', headerClass)}>
			<div class="flex min-w-0 flex-col gap-1">
				{#if title}
					<h2 class="truncate text-sm leading-tight font-medium text-foreground">{title}</h2>
				{/if}
				{#if description}
					<p class="truncate text-xs leading-tight text-muted-foreground">{description}</p>
				{/if}
			</div>
			{#if action}
				<div class="shrink-0">
					{@render action()}
				</div>
			{/if}
		</SurfaceHeader>
	{/if}

	<div class={cn('min-h-0 flex-1', bodyClass)}>
		{@render children()}
	</div>
</section>
