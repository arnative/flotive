<script lang="ts">
	import { Icon } from '$lib/components/ui/icon';
	import { cn } from '$lib/utils';

	let {
		icon,
		message,
		class: className = ''
	}: {
		icon?: string;
		message: string;
		class?: string;
	} = $props();
</script>

<div
	class={cn('my-auto flex flex-col items-center justify-center gap-2 py-8 text-center', className)}
>
	{#if icon}
		<Icon name={icon} class="text-2xl text-muted-foreground/50" />
	{/if}
	<p class="text-xs text-muted-foreground">{message}</p>
</div>
