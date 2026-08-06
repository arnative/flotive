	<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { Icon } from '$lib/components/ui/icon';
	import { cn, type WithoutChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		value,
		label,
		children: childrenProp,
		...restProps
	}: WithoutChild<SelectPrimitive.ItemProps> = $props();
</script>

<SelectPrimitive.Item
	bind:ref
	{value}
	data-slot="select-item"
	class={cn(
		"gap-2 rounded-lg px-2.5 py-1.5 pr-7 text-xs md:text-sm font-medium transition-colors cursor-pointer select-none outline-none text-card-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground data-highlighted:bg-secondary data-highlighted:text-secondary-foreground data-[state=checked]:text-secondary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 flex w-full items-center justify-between relative box-border",
		className
	)}
	{...restProps}
>
	{#snippet children({ selected, highlighted })}
		<span class="flex flex-1 items-center gap-2 truncate font-medium">
			{#if childrenProp}
				{@render childrenProp({ selected, highlighted })}
			{:else}
				{label || value}
			{/if}
		</span>
		<span class="absolute end-2.5 flex size-4 items-center justify-center">
			{#if selected}
				<Icon name="check" class="text-base" />
			{/if}
		</span>
	{/snippet}
</SelectPrimitive.Item>
