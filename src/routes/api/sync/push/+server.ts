import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import * as schema from '$lib/db/schema';
import {
	isSyncTableName,
	SYNC_BATCH_SIZE,
	type SyncOperationKind,
	type SyncTableName
} from '$lib/sync-contract';
import { getDatabase } from '$lib/server/database';
import { isRecord, readJson, requestErrorResponse, requireUser } from '$lib/server/request';
import { isSupportedCurrency } from '$lib/utils/currency';
import type { RequestHandler } from './$types';

const TABLES = {
	accounts: schema.accounts,
	categories: schema.categories,
	transactions: schema.transactions,
	debts: schema.debts,
	bills: schema.bills,
	budgets: schema.budgets,
	todos: schema.todos,
	settings: schema.settings,
	workspaces: schema.workspaces
} as const satisfies Record<SyncTableName, unknown>;

const RECORD_FIELDS: Record<SyncTableName, readonly string[]> = {
	accounts: [
		'id',
		'userId',
		'workspaceId',
		'name',
		'type',
		'initialBalanceCents',
		'isDefault',
		'icon',
		'createdAt',
		'updatedAt',
		'deletedAt'
	],
	categories: [
		'id',
		'userId',
		'workspaceId',
		'name',
		'icon',
		'isDefault',
		'kind',
		'createdAt',
		'updatedAt',
		'deletedAt'
	],
	transactions: [
		'id',
		'userId',
		'workspaceId',
		'accountId',
		'toAccountId',
		'type',
		'amountCents',
		'adminFeeCents',
		'inBudget',
		'categoryId',
		'date',
		'note',
		'debtType',
		'counterparty',
		'debtId',
		'createdAt',
		'updatedAt',
		'deletedAt',
		'syncedAt'
	],
	debts: [
		'id',
		'userId',
		'workspaceId',
		'type',
		'counterparty',
		'amountCents',
		'paidCents',
		'dueDate',
		'note',
		'status',
		'date',
		'createdAt',
		'updatedAt',
		'deletedAt'
	],
	bills: [
		'id',
		'userId',
		'workspaceId',
		'name',
		'amountCents',
		'dueDay',
		'reminderDays',
		'note',
		'payments',
		'createdAt',
		'updatedAt',
		'deletedAt'
	],
	todos: [
		'id',
		'userId',
		'workspaceId',
		'text',
		'completed',
		'sortOrder',
		'createdAt',
		'updatedAt',
		'deletedAt'
	],
	budgets: [
		'id',
		'userId',
		'workspaceId',
		'categoryId',
		'amountCents',
		'startDate',
		'endDate',
		'note',
		'createdAt',
		'updatedAt',
		'deletedAt'
	],
	settings: [
		'id',
		'userId',
		'currency',
		'syncEnabled',
		'monthlyIncomeCents',
		'monthlyIncomeByWorkspace',
		'updatedAt'
	],
	workspaces: ['id', 'userId', 'name', 'createdAt', 'updatedAt', 'deletedAt']
};

const TOMBSTONE_TABLES = new Set<SyncTableName>([
	'accounts',
	'categories',
	'transactions',
	'debts',
	'bills',
	'budgets',
	'todos',
	'workspaces'
]);

function sanitizeRecord(
	table: SyncTableName,
	record: Record<string, unknown>,
	recordId: string,
	userId: string
): Record<string, unknown> {
	const sanitized = Object.fromEntries(
		RECORD_FIELDS[table].filter((field) => field in record).map((field) => [field, record[field]])
	);
	if (table === 'transactions' && sanitized.inBudget === undefined) sanitized.inBudget = false;
	return { ...sanitized, id: recordId, userId, updatedAt: Date.now() };
}

const isString = (value: unknown, max = 500): value is string =>
	typeof value === 'string' && value.length > 0 && value.length <= max;
const isNullableString = (value: unknown, max = 500): boolean =>
	value === null || value === undefined || (typeof value === 'string' && value.length <= max);
const isInteger = (
	value: unknown,
	min = Number.MIN_SAFE_INTEGER,
	max = Number.MAX_SAFE_INTEGER
): value is number =>
	Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
const isNullableInteger = (value: unknown, min = Number.MIN_SAFE_INTEGER): boolean =>
	value === null || value === undefined || isInteger(value, min);
const isTimestamp = (value: unknown): value is number => isInteger(value, 0);
const isNullableTimestamp = (value: unknown): boolean =>
	value === null || value === undefined || isTimestamp(value);
const isWorkspaceId = (value: unknown): boolean => value === null || isString(value, 100);
const isDate = (value: unknown): value is string =>
	typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function hasCommonFields(record: Record<string, unknown>, withCreatedAt = true): boolean {
	return (
		isString(record.id, 100) &&
		isString(record.userId, 100) &&
		isTimestamp(record.updatedAt) &&
		(!withCreatedAt || isTimestamp(record.createdAt))
	);
}

function isValidSyncRecord(table: SyncTableName, record: Record<string, unknown>): boolean {
	if (!hasCommonFields(record, table !== 'settings')) return false;
	switch (table) {
		case 'accounts':
			return (
				isWorkspaceId(record.workspaceId) &&
				isString(record.name, 100) &&
				['cash', 'bank', 'ewallet', 'other'].includes(String(record.type)) &&
				isInteger(record.initialBalanceCents) &&
				typeof record.isDefault === 'boolean' &&
				isString(record.icon, 100) &&
				isNullableTimestamp(record.deletedAt)
			);
		case 'categories':
			return (
				isWorkspaceId(record.workspaceId) &&
				isString(record.name, 100) &&
				isString(record.icon, 100) &&
				typeof record.isDefault === 'boolean' &&
				['expense', 'income', 'both'].includes(String(record.kind)) &&
				isNullableTimestamp(record.deletedAt)
			);
		case 'transactions':
			return (
				isWorkspaceId(record.workspaceId) &&
				isString(record.accountId, 100) &&
				isNullableString(record.toAccountId, 100) &&
				['income', 'expense', 'transfer'].includes(String(record.type)) &&
				isInteger(record.amountCents, 0) &&
				isNullableInteger(record.adminFeeCents, 0) &&
				(record.inBudget === undefined || typeof record.inBudget === 'boolean') &&
				isNullableString(record.categoryId, 100) &&
				isDate(record.date) &&
				isNullableString(record.note, 2_000) &&
				(record.debtType == null || ['hutang', 'piutang'].includes(String(record.debtType))) &&
				isNullableString(record.counterparty, 200) &&
				isNullableString(record.debtId, 100) &&
				isNullableTimestamp(record.deletedAt) &&
				isNullableTimestamp(record.syncedAt)
			);
		case 'debts':
			return (
				isWorkspaceId(record.workspaceId) &&
				['hutang', 'piutang'].includes(String(record.type)) &&
				isString(record.counterparty, 200) &&
				isInteger(record.amountCents, 1) &&
				isInteger(record.paidCents, 0) &&
				isNullableString(record.dueDate, 10) &&
				isNullableString(record.note, 2_000) &&
				['unpaid', 'partial', 'paid'].includes(String(record.status)) &&
				isDate(record.date) &&
				isNullableTimestamp(record.deletedAt)
			);
		case 'bills':
			return (
				isWorkspaceId(record.workspaceId) &&
				isString(record.name, 100) &&
				isInteger(record.amountCents, 1) &&
				isInteger(record.dueDay, 1, 31) &&
				isInteger(record.reminderDays, 0, 365) &&
				isNullableString(record.note, 2_000) &&
				isRecord(record.payments) &&
				isNullableTimestamp(record.deletedAt)
			);
		case 'todos':
			return (
				isWorkspaceId(record.workspaceId) &&
				isString(record.text, 500) &&
				typeof record.completed === 'boolean' &&
				isInteger(record.sortOrder) &&
				isNullableTimestamp(record.deletedAt)
			);
		case 'budgets':
			return (
				isWorkspaceId(record.workspaceId) &&
				isString(record.categoryId, 100) &&
				isInteger(record.amountCents, 0) &&
				isDate(record.startDate) &&
				isNullableString(record.endDate, 10) &&
				isNullableString(record.note, 2_000) &&
				isNullableTimestamp(record.deletedAt)
			);
		case 'settings':
			return (
				isSupportedCurrency(record.currency) &&
				typeof record.syncEnabled === 'boolean' &&
				isInteger(record.monthlyIncomeCents, 0) &&
				isRecord(record.monthlyIncomeByWorkspace) &&
				Object.values(record.monthlyIncomeByWorkspace).every((value) => isInteger(value, 0))
			);
		case 'workspaces':
			return isString(record.name, 100) && isNullableTimestamp(record.deletedAt);
	}
}

function reject(
	rejected: Array<{ operationId: string; reason: string }>,
	operationId: unknown,
	reason: string
): void {
	if (typeof operationId === 'string' && operationId) rejected.push({ operationId, reason });
}

export const POST: RequestHandler = async (event) => {
	const userId = await requireUser(event);
	if (userId instanceof Response) return userId;
	try {
		const input = await readJson<unknown>(event.request);
		if (!isRecord(input) || !Array.isArray(input.records) || input.records.length > 250) {
			return json({ error: 'Payload sinkronisasi tidak valid.' }, { status: 400 });
		}
		const handle = getDatabase(event.platform?.env);
		const db = handle.db;
		let accepted = 0;
		const operationIds: string[] = [];
		const rejected: Array<{ operationId: string; reason: string }> = [];
		const seen = new Set<string>();
		for (const item of input.records.slice(0, SYNC_BATCH_SIZE)) {
			if (
				!isRecord(item) ||
				typeof item.operationId !== 'string' ||
				!item.operationId ||
				seen.has(item.operationId) ||
				typeof item.recordId !== 'string' ||
				!item.recordId ||
				!isSyncTableName(item.table) ||
				!['upsert', 'delete', 'purge'].includes(String(item.operation))
			) {
				reject(rejected, item?.operationId, 'Operasi tidak valid.');
				continue;
			}
			seen.add(item.operationId);
			const table = TABLES[item.table] as any;
			const operation = item.operation as SyncOperationKind;
			if (operation === 'purge') {
				await db.delete(table).where(and(eq(table.id, item.recordId), eq(table.userId, userId)));
				accepted += 1;
				operationIds.push(item.operationId);
				continue;
			}
			if (operation === 'delete' && item.record === undefined) {
				if (!TOMBSTONE_TABLES.has(item.table)) {
					reject(rejected, item.operationId, 'Tabel tidak mendukung penghapusan.');
					continue;
				}
				const timestamp = Date.now();
				await db
					.update(table)
					.set({ deletedAt: timestamp, updatedAt: timestamp })
					.where(and(eq(table.id, item.recordId), eq(table.userId, userId)));
				accepted += 1;
				operationIds.push(item.operationId);
				continue;
			}
			if (
				!isRecord(item.record) ||
				item.record.userId !== userId ||
				item.record.id !== item.recordId ||
				!isValidSyncRecord(item.table, item.record) ||
				(operation === 'delete' && typeof item.record.deletedAt !== 'number')
			) {
				reject(rejected, item.operationId, 'Record tidak valid.');
				continue;
			}
			const record = sanitizeRecord(item.table, item.record, item.recordId, userId);
			const owned = await db
				.insert(table)
				.values(record)
				.onConflictDoUpdate({ target: table.id, set: record, setWhere: eq(table.userId, userId) })
				.returning({ id: table.id });
			if (!owned.length) {
				reject(rejected, item.operationId, 'Record dimiliki akun lain.');
				continue;
			}
			accepted += 1;
			operationIds.push(item.operationId);
		}
		return json({ accepted, operationIds, rejected, syncedAt: Date.now() });
	} catch (error) {
		const response = requestErrorResponse(error);
		if (response) return response;
		console.error(JSON.stringify({ message: 'sync push failed', error: String(error), userId }));
		return json({ error: 'Gagal mengirim perubahan.' }, { status: 500 });
	}
};
