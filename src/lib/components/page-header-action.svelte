<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';

	let {
		label,
		icon = 'plus',
		onclick,
		disabled = false
	}: { label: string; icon?: string; onclick: () => void; disabled?: boolean } = $props();
</script>

<!-- Di mobile tombol "buat baru" dipindah ke FAB (contextual). -->
<Button
	variant="default"
	size="lg"
	class="hidden md:inline-flex"
	aria-label={label}
	{onclick}
	{disabled}
>
	<Icon name={icon} class="shrink-0 text-base" weight="fill" />
	<span>{label}</span>
</Button>
