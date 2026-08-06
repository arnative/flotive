// Todos (checklist sederhana, urutan via sortOrder).

import type { Todo } from '$lib/db/schema';
import { genId, getAllByIndex, put, softDelete, update, now } from './idb';
import { track } from './offline-queue';

export async function listTodos(userId: string, workspaceId: string): Promise<Todo[]> {
	const all = await getAllByIndex<Todo>('todos', 'userId', userId);
	return all.filter((t) => !t.deletedAt && t.workspaceId === workspaceId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createTodo(userId: string, workspaceId: string, input: { text: string; sortOrder?: number }): Promise<Todo> {
	const full: Todo = {
		id: genId(),
		userId,
		workspaceId,
		text: input.text,
		completed: false,
		sortOrder: input.sortOrder ?? now(),
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	const saved = await put<Todo>('todos', full);
	track('todos', 'upsert', saved.id);
	return saved;
}

export async function updateTodo(id: string, patch: Partial<Todo>): Promise<Todo | undefined> {
	const r = await update<Todo>('todos', id, patch);
	if (r) track('todos', 'upsert', id);
	return r;
}

export async function deleteTodo(id: string): Promise<void> {
	await softDelete('todos', id);
	track('todos', 'delete', id);
}
