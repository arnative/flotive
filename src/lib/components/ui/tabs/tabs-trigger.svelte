<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		"flex h-full flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none",
		"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs data-active:bg-primary data-active:text-primary-foreground data-active:shadow-xs",
		className
	)}
	{...restProps}
/>
