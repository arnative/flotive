<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Hapus',
		cancelLabel = 'Batal',
		onconfirm,
		onOpenChange
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm: () => void | Promise<void>;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	let pending = $state(false);

	function change(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}

	async function confirm() {
		if (pending) return;
		pending = true;
		try {
			await onconfirm();
		} finally {
			pending = false;
		}
	}
</script>

<Dialog {open} onOpenChange={change}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
			<DialogDescription>{description}</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={() => change(false)} disabled={pending}
				>{cancelLabel}</Button
			>
			<Button variant="destructive" onclick={confirm} disabled={pending}>
				{pending ? 'Memproses...' : confirmLabel}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
