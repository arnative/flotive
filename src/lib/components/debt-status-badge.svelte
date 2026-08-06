<script lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import type { DebtStatus } from '$lib/db/schema';

	let { status }: { status: DebtStatus } = $props();

	const map: Record<DebtStatus, { label: string; variant: BadgeVariant }> = {
		unpaid: { label: 'Belum lunas', variant: 'destructive' },
		partial: { label: 'Sebagian', variant: 'warning' },
		paid: { label: 'Lunas', variant: 'success' }
	};
</script>

<Badge variant={map[status].variant} class="text-[0.65rem] h-auto py-0.5 px-1.5 font-medium">
	{map[status].label}
</Badge>
