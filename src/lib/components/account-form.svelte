<script lang="ts">
	import { untrack } from 'svelte';
	import { createAccount, updateAccount } from '$lib/storage';
	import { formatInputInteger, formatLiveInput, parseToCents } from '$lib/utils/currency';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { DialogFooter } from '$lib/components/ui/dialog';
	import { Icon } from '$lib/components/ui/icon';
	import { toast } from 'svelte-sonner';
	import type { Account, AccountType } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		editing = null,
		onSaved,
		onCancel
	}: {
		userId: string;
		workspaceId: string;
		editing?: Account | null;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let name = $state(untrack(() => editing?.name ?? ''));
	let type = $state<AccountType>(untrack(() => editing?.type ?? 'cash'));
	let initial = $state(
		untrack(() => (editing ? formatInputInteger(editing.initialBalanceCents) : ''))
	);
	let saving = $state(false);

	const typeLabel: Record<AccountType, string> = {
		cash: 'Tunai',
		bank: 'Bank',
		ewallet: 'E-wallet',
		other: 'Lainnya'
	};

	const typeIcon: Record<AccountType, string> = {
		cash: 'wallet',
		bank: 'bank',
		ewallet: 'device-mobile',
		other: 'dots-three'
	};

	function onInitialInput(e: Event) {
		initial = formatLiveInput((e.target as HTMLInputElement).value);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) return toast.error('Nama akun wajib diisi');
		saving = true;
		const cents = parseToCents(initial);
		try {
			if (editing) {
				await updateAccount(editing.id, { name: name.trim(), type, initialBalanceCents: cents });
				toast.success('Akun diperbarui');
			} else {
				await createAccount(userId, workspaceId, {
					name: name.trim(),
					type,
					initialBalanceCents: cents
				});
				toast.success('Akun ditambahkan');
			}
			onSaved?.();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Gagal menyimpan akun');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={submit}>
	<div class="space-y-4 p-5">
		<div class="space-y-1.5">
			<Label for="ac-name">Nama</Label>
			<Input id="ac-name" bind:value={name} placeholder="Mis. Dompet utama" />
		</div>
		<div class="space-y-1.5">
			<Label>Jenis</Label>
			<div class="grid grid-cols-2 gap-2">
				{#each Object.entries(typeLabel) as [key, label] (key)}
					<Button
						type="button"
						size="sm"
						variant={type === key ? 'default' : 'outline'}
						onclick={() => (type = key as AccountType)}
						class="justify-start"
					>
						<Icon name={typeIcon[key as AccountType]} class="text-base" />
						{label}
					</Button>
				{/each}
			</div>
		</div>
		<div class="space-y-1.5">
			<Label for="ac-init">Saldo Awal</Label>
			<Input
				id="ac-init"
				inputmode="numeric"
				value={initial}
				oninput={onInitialInput}
				placeholder="0"
				class="tabular-nums"
			/>
		</div>
	</div>
	<DialogFooter>
		<Button type="button" variant="outline" onclick={onCancel}>Batal</Button>
		<Button type="submit" disabled={!name.trim() || saving}>
			{saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Tambah'}
		</Button>
	</DialogFooter>
</form>
