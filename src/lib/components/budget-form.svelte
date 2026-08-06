<script lang="ts">
	import { untrack } from 'svelte';
	import { saveDailyBudget } from '$lib/storage';
	import { formatInputInteger, formatLiveInput, parseToCents } from '$lib/utils/currency';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { FormField } from '$lib/components/ui/form-field';
	import { DialogFooter } from '$lib/components/ui/dialog';
	import { todayISO } from '$lib/utils/format';
	import { toast } from 'svelte-sonner';
	import type { Budget } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		currency = 'IDR',
		startDate = todayISO(),
		amountCents = 0,
		isOverride = false,
		onSaved,
		onCancel
	}: {
		userId: string;
		workspaceId: string;
		currency?: string;
		startDate?: string;
		amountCents?: number;
		isOverride?: boolean;
		onSaved?: (budget: Budget) => void;
		onCancel?: () => void;
	} = $props();

	let amountRaw = $state(
		untrack(() => (amountCents ? formatInputInteger(amountCents, currency) : ''))
	);
	let saving = $state(false);
	let dateOnly = $state(untrack(() => isOverride));

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const amountCents = parseToCents(amountRaw);
		if (amountCents < 0) return toast.error('Anggaran per hari tidak boleh negatif');

		saving = true;
		try {
			const saved = await saveDailyBudget(userId, workspaceId, startDate, amountCents, dateOnly);
			if (!saved) return toast.error('Gagal menyimpan anggaran');
			toast.success(
				amountCents === 0 ? 'Anggaran hari ini dibatalkan' : 'Anggaran harian disimpan'
			);
			onSaved?.(saved);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Gagal menyimpan anggaran');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={submit}>
	<div class="space-y-4 p-5">
		<FormField label="Anggaran per hari" for="budget-amount">
			<Input
				id="budget-amount"
				inputmode="numeric"
				value={amountRaw}
				oninput={(event) => (amountRaw = formatLiveInput(event.currentTarget.value, currency))}
				placeholder="0"
				class="tabular-nums"
			/>
		</FormField>
		<label
			for="budget-override"
			class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input p-3 text-sm select-none"
		>
			<Checkbox id="budget-override" bind:checked={dateOnly} />
			<span>
				<span class="block font-medium">Khusus tanggal ini</span>
				<span class="block text-xs text-muted-foreground"
					>Gunakan nominal berbeda hanya untuk {startDate}.</span
				>
			</span>
		</label>
		<p class="text-xs text-muted-foreground">
			{dateOnly
				? `Hanya berlaku pada ${startDate}. Isi 0 untuk membatalkan anggaran tanggal ini.`
				: `Berlaku mulai ${startDate} sampai diubah lagi. Isi 0 untuk membatalkan mulai tanggal ini.`}
		</p>
	</div>
	<DialogFooter>
		<Button type="button" variant="outline" onclick={onCancel}>Batal</Button>
		<Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
	</DialogFooter>
</form>
