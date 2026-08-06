<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Icon } from '$lib/components/ui/icon';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		placeholder = 'Cari...',
		class: className,
		inputClass,
		ariaLabel = 'Pencarian'
	}: {
		value?: string;
		placeholder?: string;
		class?: string;
		inputClass?: string;
		ariaLabel?: string;
	} = $props();
</script>

<div class={cn('relative min-w-0', className)}>
	<Icon
		name="magnifying-glass"
		class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-base text-muted-foreground"
	/>
	<Input
		type="search"
		bind:value
		{placeholder}
		aria-label={ariaLabel}
		class={cn('pl-8', inputClass)}
	/>
</div>
