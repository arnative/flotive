<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import { listCategories, createCategory, deleteCategory } from '$lib/storage';
	import { defaultCategories } from '$lib/data/default-categories';
	import CategoryCard from '$lib/components/category-card.svelte';
	import CategoryForm from '$lib/components/category-form.svelte';
	import PanelCard from '$lib/components/panel-card.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import type { Category } from '$lib/db/schema';
	import { listenFlotiveEvents } from '$lib/client-events';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PageHeaderAction from '$lib/components/page-header-action.svelte';
	import SearchInput from '$lib/components/search-input.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let loadError = $state(false);
	let showForm = $state(false);
	let editing = $state<Category | null>(null);
	let toDelete = $state<Category | null>(null);
	let confirmOpen = $state(false);
	let search = $state('');
	let activeFilter = $state<'all' | 'expense' | 'income' | 'both'>('all');

	onMount(() => {
		void loadPage();
		return listenFlotiveEvents(['Flotive:synced', 'Flotive:new-category'], (event) => {
			if (event === 'Flotive:new-category') {
				editing = null;
				showForm = true;
				return;
			}
			void refresh().catch((error) =>
				console.error(
					JSON.stringify({ message: 'categories refresh failed', error: String(error) })
				)
			);
		});
	});

	async function loadPage() {
		loading = true;
		loadError = false;
		try {
			await load();
		} catch (error) {
			loadError = true;
			console.error(JSON.stringify({ message: 'categories load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function load() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		let list = await listCategories(uid, wid);
		if (list.length === 0) {
			for (const category of defaultCategories) {
				await createCategory(uid, wid, { ...category, isDefault: true });
			}
			list = await listCategories(uid, wid);
		}
		categories = list;
	}

	async function refresh() {
		if (auth.user) categories = await listCategories(auth.user.id, auth.activeWorkspaceId ?? '');
	}
	function onedit(c: Category) {
		editing = c;
		showForm = true;
	}
	function ondelete(c: Category) {
		toDelete = c;
		confirmOpen = true;
	}
	async function confirmDelete() {
		if (!toDelete) return;
		await deleteCategory(toDelete.id);
		toDelete = null;
		confirmOpen = false;
		await refresh();
	}

	const groups = [
		{ kind: 'expense' as const, label: 'Pengeluaran', description: 'Kategori untuk pengeluaran' },
		{ kind: 'income' as const, label: 'Pemasukan', description: 'Kategori untuk pemasukan' },
		{
			kind: 'both' as const,
			label: 'Keduanya',
			description: 'Kategori untuk pemasukan & pengeluaran'
		}
	];

	let filtered = $derived(
		categories
			.filter((c) => activeFilter === 'all' || c.kind === activeFilter)
			.filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
	);

	let byKind = $derived(
		groups.map((g) => ({
			...g,
			items: filtered.filter((c) => c.kind === g.kind)
		}))
	);
</script>

<svelte:head><title>Kategori — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Kategori"
		description="Kelola pengelompokan kategori transaksi sesuai kebutuhan Anda."
	>
		<PageHeaderAction
			label="Tambah Kategori"
			icon="grid-circle-plus"
			onclick={() => {
				editing = null;
				showForm = true;
			}}
		/>
	</PageHeader>

	{#if loading}
		<PageSkeleton
			count={6}
			containerClass="grid grid-cols-1 gap-2 sm:grid-cols-2"
			itemClass="h-14 rounded-xl"
		/>
	{:else if loadError}
		<PageLoadError onretry={() => void loadPage()} />
	{:else if categories.length === 0}
		<EmptyState
			title="Belum ada kategori"
			description="Tambahkan kategori pertama untuk mulai mengelola transaksi Anda."
			icon="category-2"
		/>
	{:else}
		<!-- Filter + Search -->
		<div class="flex items-center gap-2">
			{#if categories.length > 8}
				<SearchInput
					bind:value={search}
					placeholder="Cari kategori..."
					class="flex-1"
					inputClass="h-9 text-sm"
				/>
			{/if}
			<Select type="single" bind:value={activeFilter}>
				<SelectTrigger class="w-36 shrink-0">
					{activeFilter === 'all'
						? 'Semua jenis'
						: activeFilter === 'expense'
							? 'Pengeluaran'
							: activeFilter === 'income'
								? 'Pemasukan'
								: 'Keduanya'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua jenis</SelectItem>
					<SelectItem value="expense">Pengeluaran</SelectItem>
					<SelectItem value="income">Pemasukan</SelectItem>
					<SelectItem value="both">Keduanya</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<!-- Groups by kind -->
		{#each byKind as group (group.kind)}
			{#if group.items.length > 0}
				<PanelCard title={group.label} bodyClass="bg-background">
					{#snippet action()}
						<Badge variant="outline" class="h-5 px-2 text-[0.65rem] font-normal">
							{group.items.length} kategori
						</Badge>
					{/snippet}
					<div class="divide-y divide-border">
						{#each group.items as c (c.id)}
							<CategoryCard category={c} onedit={() => onedit(c)} ondelete={() => ondelete(c)} />
						{/each}
					</div>
				</PanelCard>
			{/if}
		{/each}

		{#if filtered.length === 0}
			<div class="py-8 text-center text-xs text-muted-foreground">
				Tidak ada kategori yang cocok dengan "{search}".
			</div>
		{/if}
	{/if}
</div>

{#if auth.user}
	<Dialog
		bind:open={showForm}
		onOpenChange={(open) => {
			if (!open) editing = null;
		}}
	>
		<DialogContent class="sm:max-w-lg">
			<DialogHeader>
				<DialogTitle>{editing ? 'Edit kategori' : 'Kategori baru'}</DialogTitle>
				<DialogDescription>Atur nama, jenis, dan ikon kategori.</DialogDescription>
			</DialogHeader>
			<CategoryForm
				userId={auth.user.id}
				workspaceId={auth.activeWorkspaceId ?? ''}
				{editing}
				onSaved={() => {
					showForm = false;
					refresh();
				}}
				onCancel={() => {
					showForm = false;
				}}
			/>
		</DialogContent>
	</Dialog>
{/if}

<ConfirmDialog
	bind:open={confirmOpen}
	title="Hapus kategori?"
	description="Kategori dihapus; transaksi lama tetap utuh."
	onconfirm={confirmDelete}
/>
