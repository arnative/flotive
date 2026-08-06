<script lang="ts">
	import { untrack } from 'svelte';
	import { createCategory, updateCategory } from '$lib/storage';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import { DialogFooter } from '$lib/components/ui/dialog';
	import IconPicker from './icon-picker.svelte';
	import { toast } from 'svelte-sonner';
	import type { Category, CategoryKind } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		editing = null,
		onSaved,
		onCancel
	}: {
		userId: string;
		workspaceId: string;
		editing?: Category | null;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let name = $state(untrack(() => editing?.name ?? ''));
	let icon = $state(untrack(() => editing?.icon ?? 'dots'));
	let kind = $state<string>(untrack(() => editing?.kind ?? 'both'));
	let saving = $state(false);

	async function submit(ev: SubmitEvent) {
		ev.preventDefault();
		if (!name.trim()) return toast.error('Nama kategori wajib');
		saving = true;
		const payload = { name: name.trim(), icon, kind: kind as CategoryKind };
		const r = editing
			? await updateCategory(editing.id, payload)
			: await createCategory(userId, workspaceId, { ...payload, isDefault: false });
		saving = false;
		if (r) {
			toast.success(editing ? 'Kategori diperbarui' : 'Kategori ditambahkan');
			onSaved?.();
		} else {
			toast.error('Gagal menyimpan kategori');
		}
	}
</script>

<form onsubmit={submit}>
	<div class="space-y-4 px-5 py-4">
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="cat-name">Nama</Label>
				<Input id="cat-name" bind:value={name} placeholder="Nama kategori" />
			</div>
			<div class="space-y-1.5">
				<Label>Jenis</Label>
				<Select type="single" bind:value={kind}>
					<SelectTrigger class="w-full">
						{kind === 'expense' ? 'Pengeluaran' : kind === 'income' ? 'Pemasukan' : 'Keduanya'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="expense">Pengeluaran</SelectItem>
						<SelectItem value="income">Pemasukan</SelectItem>
						<SelectItem value="both">Keduanya</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
		<div class="space-y-2">
			<div>
				<Label>Ikon</Label>
				<p class="mt-0.5 text-xs text-muted-foreground">Pilih ikon yang mudah dikenali.</p>
			</div>
			<IconPicker bind:value={icon} />
		</div>
	</div>
	<DialogFooter>
		<Button type="button" variant="outline" onclick={onCancel}>Batal</Button>
		<Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambah'}</Button>
	</DialogFooter>
</form>
