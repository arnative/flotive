<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';
	import { cn } from '$lib/utils';

	let {
		currentPage,
		totalPages,
		onprev,
		onnext,
		class: className = ''
	}: {
		currentPage: number;
		totalPages: number;
		onprev: () => void;
		onnext: () => void;
		class?: string;
	} = $props();
</script>

<div
	class={cn(
		'mt-auto flex items-center justify-between border-t border-border px-4 py-2',
		className
	)}
>
	<span class="text-xs text-muted-foreground">
		{currentPage + 1}/{totalPages}
	</span>
	<div class="flex items-center gap-1">
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={onprev}
			disabled={currentPage === 0}
			aria-label="Sebelumnya"
		>
			<Icon name="chevron-left" class="text-base" />
		</Button>
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={onnext}
			disabled={currentPage >= totalPages - 1}
			aria-label="Berikutnya"
		>
			<Icon name="chevron-right" class="text-base" />
		</Button>
	</div>
</div>
