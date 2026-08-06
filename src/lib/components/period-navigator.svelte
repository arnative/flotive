<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';
	import { cn } from '$lib/utils';

	interface Props {
		onprev: () => void;
		onnext: () => void;
		prevLabel?: string;
		nextLabel?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		onprev,
		onnext,
		prevLabel = 'Sebelumnya',
		nextLabel = 'Berikutnya',
		class: className = '',
		children
	}: Props = $props();
</script>

<div
	class={cn(
		'flex items-center justify-between rounded-xl border border-border bg-card p-2',
		className
	)}
>
	<Button variant="ghost" size="icon" onclick={onprev} aria-label={prevLabel}>
		<Icon name="chevron-left" />
	</Button>

	<div class="flex flex-1 flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2">
		{@render children?.()}
	</div>

	<Button variant="ghost" size="icon" onclick={onnext} aria-label={nextLabel}>
		<Icon name="chevron-right" />
	</Button>
</div>
