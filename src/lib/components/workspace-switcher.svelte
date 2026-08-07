<script lang="ts">
	import { auth } from '$lib/auth/store.svelte';
	import { createWorkspace } from '$lib/storage';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuLabel
	} from '$lib/components/ui/dropdown-menu';
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
	import { Icon } from '$lib/components/ui/icon';
	import { toast } from 'svelte-sonner';
	import type { Workspace } from '$lib/db/schema';

	let {
		collapsed = false,
		align = 'start'
	}: {
		collapsed?: boolean;
		align?: 'start' | 'center' | 'end';
	} = $props();

	let showCreate = $state(false);
	let newName = $state('');
	let creating = $state(false);

	function initials(name: string): string {
		return (name.trim() || 'F')
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}

	function switchWorkspace(u: Workspace) {
		if (u.id === auth.activeWorkspaceId) return;
		auth.setActiveWorkspace(u.id);
		toast.success(`Berpindah ke workspace "${u.name}"`);
	}

	async function createNew() {
		if (!newName.trim() || !auth.user) return;
		creating = true;
		const ws = await createWorkspace(auth.user.id, { name: newName.trim() });
		auth.workspaces = [...auth.workspaces, ws];
		auth.setActiveWorkspace(ws.id);
		toast.success('Workspace baru dibuat');
		creating = false;
		showCreate = false;
		newName = '';
	}
</script>

<DropdownMenu>
	<DropdownMenuTrigger
		class={collapsed
			? 'flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-input bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted'
			: 'flex h-11 w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted'}
		title={auth.activeWorkspace?.name ?? 'Workspace'}
	>
		{#if collapsed}
			<span
				class="flex size-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
			>
				{initials(auth.activeWorkspace?.name ?? 'F')}
			</span>
		{:else}
			<div class="flex min-w-0 items-center gap-2">
				<span
					class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary"
				>
					{initials(auth.activeWorkspace?.name ?? 'F')}
				</span>
				<span class="truncate">{auth.activeWorkspace?.name ?? 'Workspace'}</span>
			</div>
			<Icon name="caret-down" class="ml-1 shrink-0 text-sm text-muted-foreground" />
		{/if}
	</DropdownMenuTrigger>
	<DropdownMenuContent {align} class="w-56 bg-card">
		<DropdownMenuLabel class="text-xs text-muted-foreground">Workspace</DropdownMenuLabel>
		<DropdownMenuSeparator />
		{#each auth.workspaces as u (u.id)}
			<DropdownMenuItem onclick={() => switchWorkspace(u)} class="cursor-pointer gap-2.5">
				<span
					class="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground"
				>
					{initials(u.name)}
				</span>
				<span class="truncate">{u.name}</span>
				{#if u.id === auth.activeWorkspaceId}
					<Icon name="check" class="ml-auto text-base text-success" />
				{/if}
			</DropdownMenuItem>
		{/each}
		<DropdownMenuSeparator />
		<DropdownMenuItem onclick={() => (showCreate = true)} class="cursor-pointer gap-2.5">
			<span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
				<Icon name="plus" class="text-sm text-muted-foreground" />
			</span>
			<span>Workspace Baru</span>
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>

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
				<Input
					id="ws-name"
					bind:value={newName}
					placeholder="Mis. Bisnis Kuliner"
					onkeydown={(e) => e.key === 'Enter' && !creating && createNew()}
				/>
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
