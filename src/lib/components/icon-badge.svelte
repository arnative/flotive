<script lang="ts">
	import { cn } from '$lib/utils';
	import { Icon } from '$lib/components/ui/icon';

	interface Props {
		name: string;
		class?: string;
		iconClass?: string;
		weight?: 'regular' | 'fill';
	}

	let { name, class: className = '', iconClass = 'text-base', weight = 'regular' }: Props = $props();
</script>

<div class={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground', className)}>
	<Icon {name} {weight} class={iconClass} />
</div>
