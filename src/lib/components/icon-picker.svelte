<script lang="ts">
	import { iconKeys, getIcon } from '$lib/data/icons';
	import { Icon } from '$lib/components/ui/icon';

	let { value = $bindable('') }: { value: string } = $props();
</script>

<div class="max-h-48 overflow-y-auto rounded-lg border border-input bg-muted/20 p-2.5">
	<div class="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
		{#each iconKeys as key (key)}
			{@const iconName = getIcon(key)}
			<button
				type="button"
				onclick={() => (value = key)}
				class="flex size-8 items-center justify-center rounded-md border transition-colors {value === key
					? 'border-secondary-foreground bg-secondary text-secondary-foreground'
					: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'}"
				aria-label={key}
			>
				<Icon name={iconName} class="text-base" />
			</button>
		{/each}
	</div>
</div>
