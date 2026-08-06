<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth/store.svelte';
	import {
		listTrashedTransactions,
		listTrashedDebts,
		restoreTransaction,
		restoreDebt,
		permanentDeleteTransaction,
		permanentDeleteDebt,
		purgeOldTrash,
		listAccounts,
		listCategories,
		getSettings,
		PURGE_DAYS
	} from '$lib/storage';
	import { formatCurrency } from '$lib/utils/currency';
	import { formatDate } from '$lib/utils/format';
	import { getIcon } from '$lib/data/icons';
	import PanelCard from '$lib/components/panel-card.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import CardEmptyState from '$lib/components/card-empty-state.svelte';
	import IconBadge from '$lib/components/icon-badge.svelte';
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
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
	import { Badge } from '$lib/components/ui/badge';
	import { Icon } from '$lib/components/ui/icon';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import type { Account, Category, Debt, Transaction } from '$lib/db/schema';
	import { listenFlotiveEvents } from '$lib/client-events';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import SearchInput from '$lib/components/search-input.svelte';
	import PageSkeleton from '$lib/components/page-skeleton.svelte';
	import PageLoadError from '$lib/components/page-load-error.svelte';

	type TrashItem = { kind: 'transaction'; record: Transaction } | { kind: 'debt'; record: Debt };

	let typeFilter = $state<'all' | 'transaction' | 'debt'>('all');
	let loading = $state(true);
	let loadError = $state(false);
	let trashedTxs = $state<Transaction[]>([]);
	let trashedDebts = $state<Debt[]>([]);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let currency = $state('IDR');
	let search = $state('');
	let selected = $state<TrashItem | null>(null);
	let toDelete = $state<{ id: string; type: 'transaction' | 'debt'; label: string } | null>(null);
	let confirmOpen = $state(false);

	onMount(() => {
		void loadPage();
		return listenFlotiveEvents(['Flotive:synced'], () => {
			void refresh().catch((error) =>
				console.error(JSON.stringify({ message: 'trash refresh failed', error: String(error) }))
			);
		});
	});

	async function loadPage() {
		loading = true;
		loadError = false;
		try {
			await load();
		} catch (error) {
			loadError = true;
			console.error(JSON.stringify({ message: 'trash load failed', error: String(error) }));
		} finally {
			loading = false;
		}
	}

	async function load() {
		if (!auth.user) return;
		await purgeOldTrash(auth.user.id, auth.activeWorkspaceId ?? '');
		await refresh();
	}

	async function refresh() {
		if (!auth.user) return;
		const uid = auth.user.id;
		const wid = auth.activeWorkspaceId ?? '';
		const [settings, nextTransactions, nextDebts, nextAccounts, nextCategories] = await Promise.all(
			[
				getSettings(uid),
				listTrashedTransactions(uid, wid),
				listTrashedDebts(uid, wid),
				listAccounts(uid, wid),
				listCategories(uid, wid)
			]
		);
		currency = settings?.currency ?? auth.user.defaultCurrency;
		trashedTxs = nextTransactions;
		trashedDebts = nextDebts;
		accounts = nextAccounts;
		categories = nextCategories;
	}

	function daysLeft(deletedAt: number | null): number {
		if (!deletedAt) return PURGE_DAYS;
		const elapsed = Date.now() - deletedAt;
		const remaining = PURGE_DAYS * 24 * 60 * 60 * 1000 - elapsed;
		return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
	}

	async function handleRestore(id: string, type: 'transaction' | 'debt') {
		if (type === 'transaction') await restoreTransaction(id);
		else await restoreDebt(id);
		selected = null;
		await refresh();
	}

	function openPermanentDelete(id: string, type: 'transaction' | 'debt', label: string) {
		selected = null;
		toDelete = { id, type, label };
		confirmOpen = true;
	}

	async function confirmPermanentDelete() {
		if (!toDelete) return;
		if (toDelete.type === 'transaction') await permanentDeleteTransaction(toDelete.id);
		else await permanentDeleteDebt(toDelete.id);
		toDelete = null;
		confirmOpen = false;
		await refresh();
	}

	function txLabel(t: Transaction): string {
		const cat = categories.find((c) => c.id === t.categoryId);
		return cat?.name ?? (t.type === 'transfer' ? 'Transfer' : (t.note ?? 'Transaksi'));
	}

	function txSub(t: Transaction): string {
		const acc = accounts.find((a) => a.id === t.accountId);
		return `${acc?.name ?? 'Akun'} · ${formatDate(t.date)}`;
	}

	function txIcon(t: Transaction): string {
		const cat = categories.find((c) => c.id === t.categoryId);
		if (cat) return getIcon(cat.icon);
		if (t.type === 'transfer') return 'transfer-h';
		return t.type === 'income' ? 'trend-up' : 'trend-down';
	}

	function itemLabel(item: TrashItem): string {
		return item.kind === 'transaction' ? txLabel(item.record) : item.record.counterparty;
	}

	function itemDescription(item: TrashItem): string {
		if (item.kind === 'transaction') return txSub(item.record);
		return `${item.record.type === 'hutang' ? 'Hutang' : 'Piutang'} · ${formatDate(item.record.date)}`;
	}

	function itemAmount(item: TrashItem): number {
		return item.kind === 'transaction'
			? item.record.amountCents
			: item.record.amountCents - item.record.paidCents;
	}

	function itemNote(item: TrashItem): string {
		return item.record.note?.trim() || '-';
	}

	let items = $derived.by(() =>
		[
			...trashedTxs.map((record) => ({ kind: 'transaction' as const, record })),
			...trashedDebts.map((record) => ({ kind: 'debt' as const, record }))
		].sort((a, b) => (b.record.deletedAt ?? 0) - (a.record.deletedAt ?? 0))
	);

	let filteredItems = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return items.filter((item) => {
			if (typeFilter !== 'all' && item.kind !== typeFilter) return false;
			return (
				!query ||
				`${itemLabel(item)} ${itemDescription(item)} ${itemNote(item)}`
					.toLowerCase()
					.includes(query)
			);
		});
	});
</script>

<svelte:head><title>Tong Sampah — Flotive</title></svelte:head>

<div class="space-y-4">
	<PageHeader
		title="Tong Sampah"
		description="Item yang berada di sini akan dihapus otomatis secara permanen setelah {PURGE_DAYS} hari."
	/>

	{#if loading}
		<PageSkeleton count={4} itemClass="h-14 rounded-lg" />
	{:else if loadError}
		<PageLoadError onretry={() => void loadPage()} />
	{:else}
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<SearchInput
				bind:value={search}
				placeholder="Cari item terhapus..."
				class="flex-1"
				inputClass="h-9 text-sm"
			/>
			<Select type="single" bind:value={typeFilter}>
				<SelectTrigger class="w-full shrink-0 sm:w-48">
					{typeFilter === 'all'
						? 'Semua tipe'
						: typeFilter === 'transaction'
							? 'Transaksi'
							: 'Hutang & Piutang'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Semua tipe</SelectItem>
					<SelectItem value="transaction">Transaksi</SelectItem>
					<SelectItem value="debt">Hutang & Piutang</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<PanelCard bodyClass="bg-background">
			{#if filteredItems.length === 0}
				<CardEmptyState
					icon="trash-3"
					message={search ? 'Tidak ada item yang cocok.' : 'Tong sampah kosong.'}
					class="py-12"
				/>
			{:else}
				<div class="hidden md:block">
					<Table>
						<TableHeader>
							<TableRow class="hover:bg-transparent">
								<TableHead>Item</TableHead>
								<TableHead class="w-36">Tipe</TableHead>
								<TableHead class="w-32 text-right">Nominal</TableHead>
								<TableHead class="w-24">Sisa</TableHead>
								<TableHead class="w-16 text-right">Aksi</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each filteredItems as item (`${item.kind}:${item.record.id}`)}
								<TableRow>
									<TableCell>
										<div class="flex items-center gap-2.5">
											{#if item.kind === 'transaction'}<IconBadge
													name={txIcon(item.record)}
												/>{:else}<IconBadge name="scales" />{/if}
											<div class="min-w-0">
												<div class="truncate text-sm font-medium text-foreground">
													{itemLabel(item)}
												</div>
												<div class="truncate text-xs text-muted-foreground">
													{itemDescription(item)}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell
										><Badge variant={item.kind === 'transaction' ? 'info' : 'purple'}
											>{item.kind === 'transaction' ? 'Transaksi' : 'Hutang/Piutang'}</Badge
										></TableCell
									>
									<TableCell class="text-right text-sm font-medium tabular-nums"
										>{formatCurrency(itemAmount(item), currency)}</TableCell
									>
									<TableCell
										><Badge variant="outline" class="h-5 px-1.5 text-[0.65rem] font-normal"
											>{daysLeft(item.record.deletedAt)} hari</Badge
										></TableCell
									>
									<TableCell class="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger
												class="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
												aria-label="Aksi"
											>
												<Icon name="more-h" class="text-base" weight="fill" />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" class="w-40">
												<DropdownMenuItem
													onclick={() => handleRestore(item.record.id, item.kind)}
													class="cursor-pointer"
													><Icon
														name="arrow-counter-clockwise"
														class="mr-2 text-base"
													/>Pulihkan</DropdownMenuItem
												>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onclick={() =>
														openPermanentDelete(item.record.id, item.kind, itemLabel(item))}
													variant="destructive"
													class="cursor-pointer"
													><Icon name="trash-4" class="mr-2 text-base" />Hapus permanen</DropdownMenuItem
												>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>

				<div class="divide-y divide-border md:hidden">
					{#each filteredItems as item (`mobile:${item.kind}:${item.record.id}`)}
						<button
							type="button"
							onclick={() => (selected = item)}
							class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
						>
							{#if item.kind === 'transaction'}<IconBadge
									name={txIcon(item.record)}
								/>{:else}<IconBadge name="scales" />{/if}
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<span class="truncate text-sm font-medium text-foreground">{itemLabel(item)}</span
									>
									<Badge
										variant={item.kind === 'transaction' ? 'info' : 'purple'}
										class="shrink-0 text-[0.6rem]"
										>{item.kind === 'transaction' ? 'Transaksi' : 'Hutang/Piutang'}</Badge
									>
								</div>
								<div class="mt-0.5 text-xs text-muted-foreground">
									{formatCurrency(itemAmount(item), currency)} · {daysLeft(item.record.deletedAt)} hari
								</div>
							</div>
							<Icon name="chevron-right" class="shrink-0 text-sm text-muted-foreground" />
						</button>
					{/each}
				</div>
			{/if}
		</PanelCard>
	{/if}
</div>

<Dialog open={selected !== null} onOpenChange={(open) => !open && (selected = null)}>
	<DialogContent class="sm:max-w-md">
		{#if selected}
			<DialogHeader>
				<DialogTitle>{itemLabel(selected)}</DialogTitle>
				<DialogDescription
					>{selected.kind === 'transaction'
						? 'Detail transaksi terhapus'
						: 'Detail hutang/piutang terhapus'}</DialogDescription
				>
			</DialogHeader>
			<div class="space-y-3 p-5 text-sm">
				<div class="flex justify-between gap-4">
					<span class="text-muted-foreground">Tipe</span><Badge
						variant={selected.kind === 'transaction' ? 'info' : 'purple'}
						>{selected.kind === 'transaction' ? 'Transaksi' : 'Hutang/Piutang'}</Badge
					>
				</div>
				<div class="flex justify-between gap-4">
					<span class="text-muted-foreground">Tanggal</span><span
						>{formatDate(selected.record.date)}</span
					>
				</div>
				<div class="flex justify-between gap-4">
					<span class="text-muted-foreground">Nominal</span><span class="font-medium tabular-nums"
						>{formatCurrency(itemAmount(selected), currency)}</span
					>
				</div>
				<div class="flex justify-between gap-4">
					<span class="text-muted-foreground">Dihapus permanen</span><span
						>{daysLeft(selected.record.deletedAt)} hari lagi</span
					>
				</div>
				<div class="space-y-2 pt-1">
					<span class="block text-muted-foreground">Catatan</span>
					<p class="rounded-lg bg-muted p-3 text-foreground">{itemNote(selected)}</p>
				</div>
			</div>
			<DialogFooter class="grid grid-cols-2 gap-2.5 sm:flex-row sm:justify-stretch">
				<Button onclick={() => handleRestore(selected!.record.id, selected!.kind)} class="w-full"
					><Icon name="arrow-counter-clockwise" />Pulihkan</Button
				>
				<Button
					variant="destructive"
					onclick={() =>
						openPermanentDelete(selected!.record.id, selected!.kind, itemLabel(selected!))}
					class="w-full">Hapus permanen</Button
				>
			</DialogFooter>
		{/if}
	</DialogContent>
</Dialog>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Hapus permanen?"
	description={`"${toDelete?.label ?? ''}" akan dihapus selamanya dan tidak dapat dikembalikan.`}
	confirmLabel="Hapus permanen"
	onconfirm={confirmPermanentDelete}
/>
