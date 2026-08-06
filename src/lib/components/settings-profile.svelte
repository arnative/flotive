<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import { updateUser } from '$lib/storage';
	import { auth } from '$lib/auth/store.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PanelCard from '$lib/components/panel-card.svelte';
	import { toast } from 'svelte-sonner';

	let name = $state(untrack(() => auth.user?.name ?? ''));
	const email = untrack(() => auth.user?.email ?? '');
	const currency = untrack(() => auth.user?.defaultCurrency ?? 'IDR');
	const storageMode = untrack(() => auth.user?.storageMode ?? 'local');
	const createdAt = untrack(() => auth.user?.createdAt ?? 0);
	let saving = $state(false);
	// Nama terakhir yang berhasil disimpan; dipakai untuk skip simpan saat inisialisasi.
	let lastSaved = untrack(() => auth.user?.name?.trim() ?? '');
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	let initials = $derived(
		(name.trim() || 'Flotive')
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('')
	);

	let memberSince = $derived(
		createdAt ? new Date(createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '—'
	);

	let storageLabel = $derived(storageMode === 'cloud' ? 'Tersinkronisasi' : 'Lokal');

	async function persist() {
		if (!auth.user || !name.trim()) return;
		saving = true;
		const u = await updateUser(auth.user.id, { name: name.trim() });
		if (u) {
			try {
				const response = await fetch('/api/account', {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: u.name })
				});
				if (!response.ok) throw new Error('Gagal menyimpan profil ke server.');
				auth.setUser(u);
				lastSaved = name.trim();
				toast.success('Profil tersimpan otomatis');
			} catch (error) {
				toast.error(error instanceof Error ? error.message : 'Profil gagal diperbarui.');
			}
		}
		saving = false;
	}

	// Auto-save (debounce) saat nama berubah.
	$effect(() => {
		if (!auth.user) return;
		if (name.trim() === lastSaved) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveTimer = null;
			persist();
		}, 600);
		return () => {
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = null;
		};
	});

	// Flush perubahan yang belum tersimpan saat keluar dari halaman.
	onDestroy(() => {
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		if (name.trim() !== lastSaved) void persist();
	});
</script>

<PanelCard title="Profil" description="Kelola informasi akun Anda" bodyClass="p-0">
	<!-- Hero: Avatar besar + identitas + meta -->
	<div class="relative px-4 pt-5 pb-4">
		<div class="flex items-center gap-4">
			<div class="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold select-none ring-1 ring-primary/20">
				{initials}
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="truncate text-base font-semibold text-foreground">{name || 'Tanpa nama'}</h3>
				<p class="truncate text-xs text-muted-foreground">{email || '—'}</p>
				<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
					<span class="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
						{currency}
					</span>
					<span class="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
						{storageLabel}
					</span>
					<span class="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
						Bergabung {memberSince}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Divider -->
	<div class="h-px bg-border"></div>

	<!-- Form -->
	<div class="p-4 space-y-3">
		<div class="space-y-1.5">
			<Label for="p-name">Nama</Label>
			<Input id="p-name" bind:value={name} placeholder="Masukkan nama" />
		</div>
		<div class="space-y-1.5">
			<Label>Email</Label>
			<Input value={email} disabled />
		</div>
		<div class="flex items-center justify-end pt-1 min-h-5 text-xs text-muted-foreground">
			{saving ? 'Menyimpan…' : 'Perubahan tersimpan otomatis'}
		</div>
	</div>
</PanelCard>
