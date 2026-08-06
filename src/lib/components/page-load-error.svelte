<script lang="ts">
	import EmptyState from '$lib/components/empty-state.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';

	let { onretry }: { onretry: () => void } = $props();
</script>

<EmptyState
	title="Data gagal dimuat"
	description="Data lokal Anda tidak dihapus. Periksa penyimpanan perangkat lalu coba lagi."
	icon="warning"
>
	<Button variant="outline" size="sm" onclick={onretry}>
		<Icon name="arrow-counter-clockwise" />
		Coba lagi
	</Button>
</EmptyState>
