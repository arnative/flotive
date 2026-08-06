<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import TransactionForm from './transaction-form.svelte';
	import type { Account, Category, Transaction } from '$lib/db/schema';

	let {
		userId,
		workspaceId,
		accounts,
		categories,
		currency = 'IDR',
		editing = null,
		onSaved,
		onclose
	}: {
		userId: string;
		workspaceId: string;
		accounts: Account[];
		categories: Category[];
		currency?: string;
		editing?: Transaction | null;
		onSaved?: (tx: Transaction) => void;
		onclose?: () => void;
	} = $props();

	let open = $state(true);

	function handleOpenChange(v: boolean) {
		open = v;
		if (!v) {
			setTimeout(() => {
				onclose?.();
			}, 160);
		}
	}

	function handleSaved(tx: Transaction) {
		open = false;
		onSaved?.(tx);
		setTimeout(() => {
			onclose?.();
		}, 160);
	}

	function handleCancel() {
		open = false;
		setTimeout(() => {
			onclose?.();
		}, 160);
	}
</script>

<Dialog open={open} onOpenChange={handleOpenChange}>
	<DialogContent class="p-0 sm:max-w-md">
		<DialogHeader class="p-5 pb-0 shrink-0">
			<DialogTitle>{editing ? 'Edit transaksi' : 'Transaksi baru'}</DialogTitle>
		</DialogHeader>
		<div class="flex-1 overflow-y-auto min-h-0">
			<TransactionForm
				{userId}
				{workspaceId}
				{accounts}
				{categories}
				{currency}
				{editing}
				onSaved={handleSaved}
				onCancel={handleCancel}
			/>
		</div>
	</DialogContent>
</Dialog>
