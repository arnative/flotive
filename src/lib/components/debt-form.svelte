<script lang="ts">
	import { untrack } from 'svelte';
	import { createDebt, updateDebt } from '$lib/storage';
	import { parseToCents, formatInputInteger, formatLiveInput } from '$lib/utils/currency';
	import { todayISO } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { DialogFooter } from '$lib/components/ui/dialog';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { toast } from 'svelte-sonner';
	import type { Debt, DebtType } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		editing = null,
		defaultType = 'hutang',
		onSaved,
		onCancel
	}: {
		userId: string;
		workspaceId: string;
		editing?: Debt | null;
		defaultType?: DebtType;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let type = $state<DebtType>(untrack(() => editing?.type ?? defaultType));
	let counterparty = $state(untrack(() => editing?.counterparty ?? ''));
	let amountRaw = $state(untrack(() => editing ? formatInputInteger(editing.amountCents) : ''));
	let date = $state(untrack(() => editing?.date ?? todayISO()));
	let dueDate = $state(untrack(() => editing?.dueDate ?? ''));
	let note = $state(untrack(() => editing?.note ?? ''));
	let saving = $state(false);

	function onAmountInput(e: Event) {
		amountRaw = formatLiveInput((e.target as HTMLInputElement).value);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const amountCents = parseToCents(amountRaw);
		if (!counterparty.trim()) return toast.error('Nama pihak wajib');
		if (amountCents <= 0) return toast.error('Nominal harus lebih dari 0');
		saving = true;
		const payload = {
			type,
			counterparty: counterparty.trim(),
			amountCents,
			date,
			dueDate: dueDate || null,
			note: note.trim() || null
		};
		const r = editing ? await updateDebt(editing.id, payload) : await createDebt(userId, workspaceId, payload);
		saving = false;
		if (r) {
			toast.success(editing ? 'Diperbarui' : 'Ditambahkan');
			onSaved?.();
		} else {
			toast.error('Gagal menyimpan');
		}
	}
</script>

<form onsubmit={submit}>
	<div class="p-5 space-y-4">
		<Tabs bind:value={type} class="w-full">
			<TabsList class="grid w-full grid-cols-2 h-11 p-1">
				<TabsTrigger value="hutang">Hutang</TabsTrigger>
				<TabsTrigger value="piutang">Piutang</TabsTrigger>
			</TabsList>
		</Tabs>
		<div class="space-y-2"><Label for="d-party">Pihak</Label><Input id="d-party" bind:value={counterparty} placeholder="Nama" /></div>
		<div class="space-y-2"><Label for="d-amount">Nominal</Label><Input id="d-amount" inputmode="numeric" value={amountRaw} oninput={onAmountInput} placeholder="0" class="tabular-nums" /></div>
		<div class="grid grid-cols-2 gap-2.5">
			<div class="space-y-2"><Label for="d-date">Tanggal</Label><DatePicker id="d-date" bind:value={date} placeholder={todayISO()} /></div>
			<div class="space-y-2"><Label for="d-due">Jatuh tempo</Label><DatePicker id="d-due" bind:value={dueDate} placeholder={todayISO()} /></div>
		</div>
		<div class="space-y-2"><Label for="d-note">Catatan</Label><Textarea id="d-note" bind:value={note} rows={2} /></div>
	</div>

	<DialogFooter>
		<Button type="button" variant="outline" onclick={onCancel}>Batal</Button>
		<Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambah'}</Button>
	</DialogFooter>
</form>
