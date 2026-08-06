<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		size = "default",
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & {
		size?: "sm" | "default";
	} = $props();
</script>

<SwitchPrimitive.Root
	bind:ref
	bind:checked
	data-slot="switch"
	data-size={size}
	class={cn(
		"shrink-0 rounded-full border border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground data-[state=unchecked]:bg-muted/60 data-[state=unchecked]:hover:bg-muted peer group/switch relative inline-flex items-center p-0.5 transition-colors duration-200 outline-none cursor-pointer data-disabled:cursor-not-allowed data-disabled:opacity-50",
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		data-slot="switch-thumb"
		class="rounded-full shadow-sm group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-background data-[state=unchecked]:bg-muted-foreground/80 pointer-events-none block transition-all duration-200"
	/>
</SwitchPrimitive.Root>
