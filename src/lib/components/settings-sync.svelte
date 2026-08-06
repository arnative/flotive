<script lang="ts">
	import { auth } from '$lib/auth/store.svelte';
	import { isSyncActive, runSync } from '$lib/db/sync';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import DotLoader from '$lib/components/ui/dot-loader.svelte';

	let syncing = $state(false);

	async function manualSync() {
		if (!auth.user) return;
		syncing = true;
		try {
			await runSync(auth.user.id);
			toast.success('Data terbaru sudah tersinkron');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Sinkronisasi gagal');
		} finally {
			syncing = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
		<div>
			<div class="text-sm font-medium">Flotive Cloud</div>
			<div class="text-xs text-muted-foreground">Data lokal otomatis tersinkron saat perangkat online.</div>
		</div>
		<span class="text-sm text-success">{isSyncActive() ? 'Aktif' : 'Menghubungkan'}</span>
	</div>
	<Button variant="outline" onclick={manualSync} disabled={syncing}>
		{#if syncing}
			<DotLoader label="Menyinkron…" size="sm" />
		{:else}
			Sinkronkan sekarang
		{/if}
	</Button>
</div>
