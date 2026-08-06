<script lang="ts">
	import { auth } from '$lib/auth/store.svelte';
	import { createWorkspace, updateWorkspace, deleteWorkspace } from '$lib/storage';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
	import PanelCard from '$lib/components/panel-card.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import type { Workspace } from '$lib/db/schema';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';

	let workspaces = $derived(auth.workspaces);
	let showCreate = $state(false);
	let newName = $state('');
	let creating = $state(false);
	let editing = $state<Workspace | null>(null);
	let editName = $state('');
	let showEdit = $state(false);
	let toDelete = $state<Workspace | null>(null);
	let showDelete = $state(false);

	function initials(name: string): string {
		return (name.trim() || 'F')
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}

	function isDefault(w: Workspace): boolean {
		return auth.user ? w.id === `ws-default:${auth.user.id}` : false;
	}

	async function refresh() {
		if (!auth.user) return;
		await auth.refreshWorkspaces(auth.user.id);
	}

	function setActive(w: Workspace) {
		auth.setActiveWorkspace(w.id);
		toast.success(`Workspace "${w.name}" aktif`);
	}

	async function createNew() {
		if (!newName.trim() || !auth.user) return;
		creating = true;
		await createWorkspace(auth.user.id, { name: newName.trim() });
		await refresh();
		creating = false;
		showCreate = false;
		newName = '';
		toast.success('Workspace dibuat');
	}

	function openEdit(w: Workspace) {
		editing = w;
		editName = w.name;
		showEdit = true;
	}
	async function saveEdit() {
		if (!editing || !editName.trim()) return;
		await updateWorkspace(editing.id, { name: editName.trim() });
		await refresh();
		showEdit = false;
		editing = null;
		toast.success('Nama workspace diperbarui');
	}

	function openDelete(w: Workspace) {
		toDelete = w;
		showDelete = true;
	}
	async function confirmDelete() {
		if (!toDelete || !auth.user) return;
		await deleteWorkspace(toDelete.id);
		// Jika yang dihapus adalah workspace aktif, alihkan ke workspace utama.
		if (auth.activeWorkspaceId === toDelete.id) {
			auth.setActiveWorkspace(`ws-default:${auth.user.id}`);
		}
		await refresh();
		toDelete = null;
		showDelete = false;
		toast.success('Workspace dihapus');
	}
</script>

<PanelCard
	title="Workspace"
	description="Kelola beberapa workspace dalam satu akun"
	bodyClass="p-0"
>
	<div class="divide-y divide-border">
		{#each workspaces as w (w.id)}
			<div class="flex items-center gap-3 px-4 py-3">
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary select-none"
				>
					{initials(w.name)}
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="truncate text-sm font-medium text-foreground">{w.name}</span>
						{#if w.id === auth.activeWorkspaceId}
							<Badge variant="outline" class="shrink-0 px-1.5 text-[0.6rem]">Aktif</Badge>
						{/if}
						{#if isDefault(w)}
							<Badge variant="secondary" class="shrink-0 px-1.5 text-[0.6rem]">Utama</Badge>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-1">
					{#if w.id !== auth.activeWorkspaceId}
						<Button
							variant="ghost"
							size="icon-sm"
							onclick={() => setActive(w)}
							title="Jadikan aktif"
						>
							<Icon name="check" class="text-base" />
						</Button>
					{/if}
					<Button variant="ghost" size="icon-sm" onclick={() => openEdit(w)} title="Ganti nama">
						<Icon name="pen" class="text-base" />
					</Button>
					{#if !isDefault(w)}
						<Button variant="ghost" size="icon-sm" onclick={() => openDelete(w)} title="Hapus">
							<Icon name="trash-4" class="text-base text-destructive" />
						</Button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	<div class="border-t border-border p-4">
		<Button variant="outline" size="sm" onclick={() => (showCreate = true)}>
			<Icon name="plus" class="text-base" />Buat workspace
		</Button>
	</div>
</PanelCard>

<Dialog bind:open={showCreate}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Workspace Baru</DialogTitle>
			<DialogDescription
				>Buat ruang terpisah untuk mengelola keuangan secara berbeda.</DialogDescription
			>
		</DialogHeader>
		<div class="space-y-4 p-5">
			<div class="space-y-1.5">
				<Label for="ws-name">Nama Workspace</Label>
				<Input id="ws-name" bind:value={newName} placeholder="Mis. Bisnis Kuliner" />
			</div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showCreate = false)}>Batal</Button>
			<Button onclick={createNew} disabled={!newName.trim() || creating}>
				{creating ? 'Membuat…' : 'Buat Workspace'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<Dialog bind:open={showEdit}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Ganti Nama Workspace</DialogTitle>
			<DialogDescription>Ubah nama workspace "{editing?.name}".</DialogDescription>
		</DialogHeader>
		<div class="space-y-4 p-5">
			<div class="space-y-1.5">
				<Label for="ws-edit">Nama Workspace</Label>
				<Input id="ws-edit" bind:value={editName} />
			</div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (showEdit = false)}>Batal</Button>
			<Button onclick={saveEdit} disabled={!editName.trim()}>Simpan</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<ConfirmDialog
	bind:open={showDelete}
	title="Hapus workspace?"
	description={`Workspace "${toDelete?.name ?? ''}" dan seluruh datanya akan dihapus dan tidak dapat dikembalikan.`}
	onconfirm={confirmDelete}
/>
