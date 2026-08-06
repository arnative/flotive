export const SYNC_TABLE_NAMES = [
	'accounts',
	'categories',
	'transactions',
	'debts',
	'bills',
	'budgets',
	'todos',
	'settings',
	'workspaces'
] as const;

export type SyncTableName = (typeof SYNC_TABLE_NAMES)[number];
export type SyncOperationKind = 'upsert' | 'delete' | 'purge';
export const SYNC_BATCH_SIZE = 40;

export interface SyncPushRecord {
	operationId: string;
	operation: SyncOperationKind;
	table: SyncTableName;
	recordId: string;
	record?: Record<string, unknown>;
}

export function isSyncTableName(value: unknown): value is SyncTableName {
	return typeof value === 'string' && (SYNC_TABLE_NAMES as readonly string[]).includes(value);
}
