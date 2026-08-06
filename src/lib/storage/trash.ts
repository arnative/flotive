// Trash / Recycle bin: list soft-deleted items, restore, permanent delete, auto-purge.
import type { Debt, Transaction } from '$lib/db/schema';
import { getAllByIndex, get, put, update, now } from './idb';
import { track } from './offline-queue';

const PURGE_DAYS = 30;
const PURGE_MS = PURGE_DAYS * 24 * 60 * 60 * 1000;

export interface TrashItem {
	id: string;
	type: 'transaction' | 'debt';
	label: string;
	sub: string;
	amountCents: number;
	deletedAt: number;
	daysLeft: number;
	raw: Transaction | Debt;
}

export async function listTrashedTransactions(
	userId: string,
	workspaceId: string
): Promise<Transaction[]> {
	const all = await getAllByIndex<Transaction>('transactions', 'userId', userId);
	return all
		.filter(
			(t) => t.deletedAt !== null && t.deletedAt !== undefined && t.workspaceId === workspaceId
		)
		.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

export async function listTrashedDebts(userId: string, workspaceId: string): Promise<Debt[]> {
	const all = await getAllByIndex<Debt>('debts', 'userId', userId);
	return all
		.filter(
			(d) => d.deletedAt !== null && d.deletedAt !== undefined && d.workspaceId === workspaceId
		)
		.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

export async function restoreTransaction(id: string): Promise<void> {
	await update<Transaction>('transactions', id, { deletedAt: null });
	track('transactions', 'upsert', id);
}

export async function restoreDebt(id: string): Promise<void> {
	await update<Debt>('debts', id, { deletedAt: null });
	track('debts', 'upsert', id);
}

export async function permanentDeleteTransaction(id: string): Promise<void> {
	const db = await import('./idb').then((m) => m.openDB());
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction('transactions', 'readwrite');
		tx.objectStore('transactions').delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	track('transactions', 'purge', id);
}

export async function permanentDeleteDebt(id: string): Promise<void> {
	const db = await import('./idb').then((m) => m.openDB());
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction('debts', 'readwrite');
		tx.objectStore('debts').delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	track('debts', 'purge', id);
}

/** Auto-purge items older than 30 days. Call on app load. */
export async function purgeOldTrash(userId: string, workspaceId: string): Promise<void> {
	const cutoff = now() - PURGE_MS;
	const txs = await listTrashedTransactions(userId, workspaceId);
	const debts = await listTrashedDebts(userId, workspaceId);

	for (const t of txs) {
		if ((t.deletedAt ?? 0) < cutoff) {
			await permanentDeleteTransaction(t.id);
		}
	}
	for (const d of debts) {
		if ((d.deletedAt ?? 0) < cutoff) {
			await permanentDeleteDebt(d.id);
		}
	}
}

export { PURGE_DAYS };
