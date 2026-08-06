import type { Todo } from '$lib/db/schema';

/** Urutkan to-do berdasarkan sortOrder (asc). */
export function sortTodos(todos: Todo[]): Todo[] {
	return [...todos].sort((a, b) => a.sortOrder - b.sortOrder);
}
