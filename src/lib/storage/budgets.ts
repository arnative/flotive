import type { Budget } from '$lib/db/schema';
import { get, getAllByIndex, now, put, update } from './idb';
import { track } from './offline-queue';

const BASE_CATEGORY_ID = '__workspace_daily__';
const OVERRIDE_CATEGORY_ID = '__workspace_daily_override__';

const budgetId = (kind: 'base' | 'override', userId: string, workspaceId: string, date: string) =>
	`daily-budget:${kind}:${userId}:${workspaceId || '_'}:${date}`;

async function list(userId: string, workspaceId: string): Promise<Budget[]> {
	const records = await getAllByIndex<Budget>('budgets', 'userId', userId);
	return records.filter(
		(record) => !record.deletedAt && (record.workspaceId ?? '') === (workspaceId ?? '')
	);
}

export async function getDailyBudget(
	userId: string,
	workspaceId: string,
	date: string
): Promise<{ budget: Budget; isOverride: boolean } | undefined> {
	const records = await list(userId, workspaceId);
	const override = records.find(
		(record) => record.categoryId === OVERRIDE_CATEGORY_ID && record.startDate === date
	);
	if (override) return { budget: override, isOverride: true };

	const base = records
		.filter((record) => record.categoryId === BASE_CATEGORY_ID && record.startDate <= date)
		.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
	return base ? { budget: base, isOverride: false } : undefined;
}

export async function saveDailyBudget(
	userId: string,
	workspaceId: string,
	date: string,
	amountCents: number,
	isOverride: boolean
): Promise<Budget> {
	const kind = isOverride ? 'override' : 'base';
	const id = budgetId(kind, userId, workspaceId, date);
	const existing = await get<Budget>('budgets', id);
	const competingId = budgetId(isOverride ? 'base' : 'override', userId, workspaceId, date);
	const competing = await get<Budget>('budgets', competingId);
	if (competing && !competing.deletedAt) {
		const removed = await update<Budget>('budgets', competingId, { deletedAt: now() });
		if (removed) track('budgets', 'delete', competingId);
	}
	const categoryId = isOverride ? OVERRIDE_CATEGORY_ID : BASE_CATEGORY_ID;
	const saved = existing
		? await update<Budget>('budgets', id, {
				amountCents,
				categoryId,
				startDate: date,
				endDate: isOverride ? date : null,
				deletedAt: null
			})
		: await put<Budget>('budgets', {
				id,
				userId,
				workspaceId,
				categoryId,
				amountCents,
				startDate: date,
				endDate: isOverride ? date : null,
				note: null,
				createdAt: now(),
				updatedAt: now(),
				deletedAt: null
			});
	if (!saved) throw new Error('Gagal menyimpan anggaran.');
	track('budgets', 'upsert', saved.id);
	return saved;
}

export async function getDailyBudgetEditor(
	userId: string,
	workspaceId: string,
	date: string
): Promise<{ amountCents: number; isOverride: boolean }> {
	const records = await list(userId, workspaceId);
	const override = records.find(
		(record) => record.categoryId === OVERRIDE_CATEGORY_ID && record.startDate === date
	);
	if (override) return { amountCents: override.amountCents, isOverride: true };
	const baseOnDate = records.find(
		(record) => record.categoryId === BASE_CATEGORY_ID && record.startDate === date
	);
	return { amountCents: baseOnDate?.amountCents ?? 0, isOverride: false };
}
