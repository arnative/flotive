<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import { getSettings } from '$lib/storage';
	import SettingsProfile from '$lib/components/settings-profile.svelte';
	import SettingsCurrency from '$lib/components/settings-currency.svelte';
	import SettingsTheme from '$lib/components/settings-theme.svelte';
	import SettingsExport from '$lib/components/settings-export.svelte';
	import SettingsSync from '$lib/components/settings-sync.svelte';
	import SettingsWorkspaces from '$lib/components/settings-workspaces.svelte';
	import PanelCard from '$lib/components/panel-card.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { Icon } from '$lib/components/ui/icon';
	import { cn } from '$lib/utils';
	import { listenFlotiveEvents } from '$lib/client-events';

	let currency = $state('IDR');
	let activeTab = $state('profile');

	const tabs = [
		{ id: 'profile', label: 'Profil', icon: 'user-circle' },
		{ id: 'preferences', label: 'Preferensi', icon: 'sliders' },
		{ id: 'data', label: 'Data', icon: 'server' },
		{ id: 'about', label: 'Tentang', icon: 'info-square' }
	];

	onMount(() => {
		void refresh().catch((error) =>
			console.error(JSON.stringify({ message: 'settings load failed', error: String(error) }))
		);
		return listenFlotiveEvents(['Flotive:synced'], () => {
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'settings refresh failed', error: String(error) }))
			);
		});
	});

	async function refresh() {
		if (!auth.user) return;
		const settings = await getSettings(auth.user.id);
		currency = settings?.currency ?? auth.user.defaultCurrency;
	}
</script>

<svelte:head><title>Pengaturan — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Pengaturan"
		description="Kelola profil pengguna, preferensi aplikasi, dan sinkronisasi data."
	/>

	<div class="flex flex-col gap-4 md:grid md:grid-cols-[200px_1fr]">
		<!-- Menu Tab (kiri) -->
		<nav
			class="flex gap-1 overflow-x-auto md:sticky md:top-2 md:flex-col md:self-start md:overflow-visible"
		>
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					onclick={() => (activeTab = tab.id)}
					class={cn(
						'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
						activeTab === tab.id
							? 'bg-secondary text-secondary-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-secondary-foreground'
					)}
				>
					<Icon
						name={tab.icon}
						weight={activeTab === tab.id ? 'fill' : 'regular'}
						class="shrink-0 text-base"
					/>
					<span class="whitespace-nowrap">{tab.label}</span>
				</button>
			{/each}
		</nav>

		<!-- Konten (kanan) -->
		<div class="min-w-0 space-y-4">
			{#if activeTab === 'profile'}
				<SettingsProfile />
				<SettingsWorkspaces />
			{:else if activeTab === 'preferences'}
				<PanelCard title="Mata Uang" description="Pilih mata uang default" bodyClass="p-4">
					<SettingsCurrency bind:currency />
				</PanelCard>
				<PanelCard title="Tema" description="Sesuaikan tampilan aplikasi" bodyClass="p-4">
					<SettingsTheme />
				</PanelCard>
			{:else if activeTab === 'data'}
				<PanelCard
					title="Penyimpanan & Sinkronisasi"
					description="Atur data lokal dan sinkronisasi"
					bodyClass="p-4"
				>
					<SettingsSync />
				</PanelCard>
				<PanelCard title="Ekspor Data" description="Cadangkan data Anda" bodyClass="p-4">
					<SettingsExport />
				</PanelCard>
			{:else if activeTab === 'about'}
				<PanelCard title="Tentang" description="Informasi aplikasi" bodyClass="p-4">
					<p class="text-sm text-muted-foreground">
						Flotive v0.1.0 — pengelolaan uang lokal-first.
					</p>
				</PanelCard>
			{/if}
		</div>
	</div>
</div>
