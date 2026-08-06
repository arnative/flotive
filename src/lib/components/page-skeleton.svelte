<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';

	let {
		count = 3,
		containerClass = 'space-y-2',
		itemClass = 'h-16 rounded-lg'
	}: {
		count?: number;
		containerClass?: string;
		itemClass?: string;
	} = $props();
</script>

<div class={containerClass}>
	{#each Array(count) as _}
		<Skeleton class={itemClass} />
	{/each}
</div>
