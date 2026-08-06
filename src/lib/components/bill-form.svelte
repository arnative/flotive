<script lang="ts">
	import { untrack } from 'svelte';
	import { createBill, updateBill } from '$lib/storage';
	import { formatInputInteger, formatLiveInput, parseToCents } from '$lib/utils/currency';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { FormField } from '$lib/components/ui/form-field';
	import { DialogFooter } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import type { Bill } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		editing = null,
		onSaved,
		onCancel
	}: {
		userId: string;
		workspaceId: string;
		editing?: Bill | null;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let name = $state(untrack(() => editing?.name ?? ''));
	let amountRaw = $state(untrack(() => (editing ? formatInputInteger(editing.amountCents) : '')));
	let dueDay = $state(untrack(() => editing?.dueDay ?? 10));
	let reminderDays = $state(untrack(() => editing?.reminderDays ?? 3));
	let saving = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const amountCents = parseToCents(amountRaw);
		if (!name.trim()) return toast.error('Nama tagihan wajib diisi');
		if (amountCents <= 0) return toast.error('Nominal harus lebih dari 0');
		if (dueDay < 1 || dueDay > 31) return toast.error('Tanggal jatuh tempo harus 1-31');
		if (reminderDays < 0 || reminderDays > 30) return toast.error('Pengingat harus 0-30 hari');

		saving = true;
		const payload = {
			name: name.trim(),
			amountCents,
			dueDay,
			reminderDays,
			note: editing?.note ?? null
		};
		try {
			const saved = editing
				? await updateBill(editing.id, payload)
				: await createBill(userId, workspaceId, payload);
			if (!saved) return toast.error('Gagal menyimpan tagihan');
			toast.success(editing ? 'Tagihan diperbarui' : 'Tagihan ditambahkan');
			onSaved?.();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Gagal menyimpan tagihan');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={submit}>
	<div class="space-y-4 p-5">
		<FormField label="Nama tagihan" for="bill-name">
			<Input id="bill-name" bind:value={name} placeholder="Contoh: Internet" />
		</FormField>
		<FormField label="Nominal per bulan" for="bill-amount">
			<Input
				id="bill-amount"
				inputmode="numeric"
				value={amountRaw}
				oninput={(event) => (amountRaw = formatLiveInput(event.currentTarget.value))}
				placeholder="0"
				class="tabular-nums"
			/>
		</FormField>
		<div class="grid grid-cols-2 gap-3">
			<FormField label="Tanggal jatuh tempo" for="bill-due">
				<Input id="bill-due" type="number" min="1" max="31" bind:value={dueDay} />
			</FormField>
			<FormField label="Ingatkan (hari)" for="bill-reminder">
				<Input id="bill-reminder" type="number" min="0" max="30" bind:value={reminderDays} />
			</FormField>
		</div>
		<p class="text-xs text-muted-foreground">
			Jika tanggal tidak ada pada suatu bulan, jatuh tempo memakai hari terakhir bulan itu.
		</p>
	</div>
	<DialogFooter>
		<Button type="button" variant="outline" onclick={onCancel}>Batal</Button>
		<Button type="submit" disabled={saving}
			>{saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambah'}</Button
		>
	</DialogFooter>
</form>
