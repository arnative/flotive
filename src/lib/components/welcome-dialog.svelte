<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import { auth } from '$lib/auth/store.svelte';
	import { onMount } from 'svelte';
	import { completeOnboarding } from '$lib/auth/onboarding';
	import { upsertSettings } from '$lib/storage';
	import { initSync } from '$lib/db/sync';
	import { toast } from 'svelte-sonner';
	import { SUPPORTED_CURRENCIES } from '$lib/utils/currency';

	let open = $state(false);
	let name = $state(auth.user?.name ?? '');
	let currency = $state(auth.user?.defaultCurrency ?? 'IDR');
	let saving = $state(false);

	onMount(() => {
		const t = setTimeout(() => (open = true), 300);
		return () => clearTimeout(t);
	});

	async function finish() {
		if (!name.trim()) {
			toast.error('Nama tidak boleh kosong');
			return;
		}
		if (!auth.user) return;
		const userId = auth.user.id;
		saving = true;
		try {
			await completeOnboarding({
				name: name.trim(),
				defaultCurrency: currency,
				storageMode: 'cloud'
			});
			await upsertSettings(userId, { syncEnabled: true, currency });
			await initSync(userId);
			open = false;
			toast.success('Onboarding selesai. Selamat datang!');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Onboarding gagal.');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Selamat datang di Flotive</DialogTitle>
			<DialogDescription>Sedikit pengaturan awal, lalu siap digunakan.</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 p-5">
			<div class="space-y-1.5">
				<Label for="ob-name">Nama</Label>
				<Input id="ob-name" bind:value={name} placeholder="Nama Anda" />
			</div>

			<div class="space-y-1.5">
				<Label>Mata uang default</Label>
				<Select type="single" bind:value={currency}>
					<SelectTrigger class="w-full">{currency}</SelectTrigger>
					<SelectContent>
						{#each SUPPORTED_CURRENCIES as c (c)}
							<SelectItem value={c}>{c}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<p class="rounded-lg border p-3 text-xs text-muted-foreground">
				Data disimpan lokal agar tetap dapat dipakai offline dan otomatis disinkronkan ke Flotive
				Cloud.
			</p>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)}>Lewati</Button>
			<Button onclick={finish} disabled={saving}>{saving ? 'Menyimpan…' : 'Selesai'}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
