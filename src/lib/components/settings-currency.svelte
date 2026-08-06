<script lang="ts">
	import { upsertSettings } from '$lib/storage';
	import { auth } from '$lib/auth/store.svelte';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import { SUPPORTED_CURRENCIES } from '$lib/utils/currency';

	let { currency = $bindable() }: { currency: string } = $props();

	async function change(v: string) {
		currency = v;
		if (auth.user) {
			await upsertSettings(auth.user.id, { currency: v });
			toast.success('Mata uang diperbarui');
		}
	}
</script>

<Select type="single" value={currency} onValueChange={change}>
	<SelectTrigger class="w-full">{currency}</SelectTrigger>
	<SelectContent>
		{#each SUPPORTED_CURRENCIES as c (c)}<SelectItem value={c}>{c}</SelectItem>{/each}
	</SelectContent>
</Select>
