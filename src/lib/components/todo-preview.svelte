<script lang="ts">
	import { createTodo, updateTodo, deleteTodo } from '$lib/storage';
	import { auth } from '$lib/auth/store.svelte';
	import { cn } from '$lib/utils';
	import PanelCard from '$lib/components/panel-card.svelte';
	import CardPaginationFooter from '$lib/components/card-pagination-footer.svelte';
	import CardEmptyState from '$lib/components/card-empty-state.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Icon } from '$lib/components/ui/icon';
	import type { Todo } from '$lib/db/schema';

	let {
		todos = [],
		onChange,
		class: className
	}: { todos: Todo[]; onChange?: () => void; class?: string } = $props();

	let newText = $state('');
	let adding = $state(false);
	let page = $state(0);

	const PAGE_SIZE = 4;
	const ROW_HEIGHT = 44;

	let totalPages = $derived(Math.max(1, Math.ceil(todos.length / PAGE_SIZE)));
	let currentPage = $derived(Math.min(page, totalPages - 1));
	let pagedTodos = $derived(todos.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE));

	async function handleAdd(e?: Event) {
		e?.preventDefault();
		if (!newText.trim() || !auth.user || !auth.activeWorkspaceId) return;
		adding = true;
		await createTodo(auth.user.id, auth.activeWorkspaceId, { text: newText.trim() });
		newText = '';
		adding = false;
		page = 0;
		onChange?.();
	}

	async function toggle(t: Todo) {
		await updateTodo(t.id, { completed: !t.completed });
		onChange?.();
	}

	async function remove(t: Todo, e: MouseEvent) {
		e.stopPropagation();
		await deleteTodo(t.id);
		if (currentPage >= totalPages) page = totalPages - 1;
		onChange?.();
	}

	function prev() {
		if (currentPage > 0) page = currentPage - 1;
	}
	function next() {
		if (currentPage < totalPages - 1) page = currentPage + 1;
	}
</script>

<PanelCard title="To-Do" class={cn('h-full', className)} bodyClass="bg-background flex flex-col">
	{#snippet action()}
		{#if todos.length > 0}
			<Badge variant="outline" class="h-5 px-2 text-[0.65rem] font-normal">
				{todos.filter((t) => t.completed).length}/{todos.length}
			</Badge>
		{/if}
	{/snippet}

	<!-- Quick Add Input -->
	<form onsubmit={handleAdd} class="flex items-center gap-2 border-b border-border px-4 py-3">
		<Input bind:value={newText} placeholder="Tambah to-do…" class="h-8 text-xs" />
		<Button
			type="submit"
			size="icon-sm"
			class="shrink-0"
			disabled={!newText.trim() || adding}
			aria-label="Tambah"
		>
			<Icon name="plus" class="text-base" />
		</Button>
	</form>

	{#if todos.length === 0}
		<CardEmptyState icon="check-circle" message="Belum ada to-do." />
	{:else}
		<ul
			class="divide-y divide-border"
			style="min-height:{PAGE_SIZE * ROW_HEIGHT}px; max-height:{PAGE_SIZE * ROW_HEIGHT}px"
		>
			{#each pagedTodos as t (t.id)}
				<li
					class="group flex items-center gap-2.5 px-4 transition-colors hover:bg-muted/40"
					style="height:{ROW_HEIGHT}px"
				>
					<Checkbox
						checked={t.completed}
						onCheckedChange={() => toggle(t)}
						aria-label="Toggle to-do"
					/>
					<span
						role="button"
						tabindex="0"
						onclick={() => toggle(t)}
						onkeydown={(e) => e.key === 'Enter' && toggle(t)}
						class="flex-1 cursor-pointer truncate text-sm {t.completed
							? 'text-muted-foreground line-through'
							: 'text-foreground'}"
					>
						{t.text}
					</span>
					<Button
						variant="ghost"
						size="icon-xs"
						onclick={(e) => remove(t, e)}
						class="text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
						aria-label="Hapus to-do"
					>
						<Icon name="trash-4" class="text-sm" />
					</Button>
				</li>
			{/each}
		</ul>

		<CardPaginationFooter {currentPage} {totalPages} onprev={prev} onnext={next} />
	{/if}
</PanelCard>
