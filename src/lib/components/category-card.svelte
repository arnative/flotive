<script lang="ts">
	import { getIcon } from '$lib/data/icons';
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
	import IconBadge from '$lib/components/icon-badge.svelte';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';
	import type { Category } from '$lib/db/schema';

	let {
		category,
		onedit,
		ondelete
	}: { category: Category; onedit?: () => void; ondelete?: () => void } = $props();

	let iconName = $derived(getIcon(category.icon));
</script>

<div class="flex min-h-12 items-center gap-2.5 px-4 py-2.5">
	<IconBadge name={iconName} />
	<div class="min-w-0 flex-1">
		<div class="flex min-w-0 items-center gap-1.5">
			<div class="truncate text-sm font-medium">{category.name}</div>
			{#if category.isDefault}
				<Badge variant="outline" class="h-4 px-1.5 text-[0.6rem]">Default</Badge>
			{/if}
		</div>
	</div>
	<DropdownMenu>
		<DropdownMenuTrigger
			class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			aria-label="Aksi kategori"
		>
			<Icon name="more-h" class="text-base" weight="fill" />
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-36">
			<DropdownMenuItem onclick={onedit} class="cursor-pointer">
				<Icon name="pen" class="mr-2 text-base text-muted-foreground" />Edit
			</DropdownMenuItem>
			{#if !category.isDefault}
				<DropdownMenuSeparator />
				<DropdownMenuItem onclick={ondelete} variant="destructive" class="cursor-pointer">
					<Icon name="trash-4" class="mr-2 text-base" />Hapus
				</DropdownMenuItem>
			{/if}
		</DropdownMenuContent>
	</DropdownMenu>
</div>
