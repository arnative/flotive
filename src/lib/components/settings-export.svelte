<script lang="ts">
	import { exportJson, exportCsv, download } from '$lib/utils/export';
	import { auth } from '$lib/auth/store.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';
	import { toast } from 'svelte-sonner';

	async function doJson() {
		if (!auth.user) return;
		download(
			`flotive-${Date.now()}.json`,
			await exportJson(auth.user.id, auth.activeWorkspaceId ?? ''),
			'application/json'
		);
		toast.success('JSON diekspor');
	}
	async function doCsv() {
		if (!auth.user) return;
		download(
			`flotive-transactions-${Date.now()}.csv`,
			await exportCsv(auth.user.id, auth.activeWorkspaceId ?? ''),
			'text/csv'
		);
		toast.success('CSV diekspor');
	}
</script>

<div class="flex flex-wrap gap-2">
	<Button variant="outline" onclick={doJson}
		><Icon name="upload-3" class="text-base" />Ekspor JSON</Button
	>
	<Button variant="outline" onclick={doCsv}
		><Icon name="upload-3" class="text-base" />Ekspor CSV</Button
	>
</div>
