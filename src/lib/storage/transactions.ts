// Transactions & debts (with filter/sort).

import type { Debt, DebtStatus, DebtType, Transaction, TransactionType } from '$lib/db/schema';
import { genId, getAllByIndex, openDB, put, softDelete, update, now } from './idb';
import { track } from './offline-queue';

export interface TransactionFilter {
	type?: TransactionType;
	categoryIds?: string[];
	accountIds?: string[];
	startDate?: string;
	endDate?: string;
	debtType?: DebtType;
	search?: string;
}

export async function listTransactions(
	userId: string,
	workspaceId: string,
	filter?: TransactionFilter
): Promise<Transaction[]> {
	const all = await getAllByIndex<Transaction>('transactions', 'userId', userId);
	let items = all.filter((t) => !t.deletedAt && t.workspaceId === workspaceId);
	if (filter) {
		if (filter.type) items = items.filter((t) => t.type === filter.type);
		if (filter.accountIds?.length)
			items = items.filter(
				(t) =>
					filter.accountIds!.includes(t.accountId) ||
					(t.toAccountId ? filter.accountIds!.includes(t.toAccountId) : false)
			);
		if (filter.categoryIds?.length)
			items = items.filter((t) =>
				t.categoryId ? filter.categoryIds!.includes(t.categoryId) : false
			);
		if (filter.startDate) items = items.filter((t) => t.date >= filter.startDate!);
		if (filter.endDate) items = items.filter((t) => t.date <= filter.endDate!);
		if (filter.debtType) items = items.filter((t) => t.debtType === filter.debtType);
		if (filter.search) {
			const q = filter.search.toLowerCase();
			items = items.filter(
				(t) =>
					(t.note ?? '').toLowerCase().includes(q) ||
					(t.counterparty ?? '').toLowerCase().includes(q)
			);
		}
	}
	return items.sort((a, b) =>
		a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
	);
}

export async function createTransaction(
	userId: string,
	workspaceId: string,
	input: {
		accountId: string;
		type: TransactionType;
		amountCents: number;
		categoryId?: string | null;
		date: string;
		note?: string | null;
		debtType?: DebtType | null;
		counterparty?: string | null;
		debtId?: string | null;
		toAccountId?: string | null;
		adminFeeCents?: number | null;
		inBudget?: boolean;
	}
): Promise<Transaction> {
	const full: Transaction = {
		id: genId(),
		userId,
		workspaceId,
		accountId: input.accountId,
		toAccountId: input.toAccountId ?? null,
		type: input.type,
		amountCents: input.amountCents,
		categoryId: input.categoryId ?? null,
		date: input.date,
		note: input.note ?? null,
		debtType: input.debtType ?? null,
		counterparty: input.counterparty ?? null,
		debtId: input.debtId ?? null,
		adminFeeCents: input.adminFeeCents ?? null,
		inBudget: input.inBudget ?? false,
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null,
		syncedAt: null
	};
	const saved = await put<Transaction>('transactions', full);
	track('transactions', 'upsert', saved.id);
	return saved;
}
export async function updateTransaction(
	id: string,
	patch: Partial<Transaction>
): Promise<Transaction | undefined> {
	const r = await update<Transaction>('transactions', id, patch);
	if (r) track('transactions', 'upsert', id);
	return r;
}
export async function deleteTransaction(id: string): Promise<void> {
	await softDelete('transactions', id);
	track('transactions', 'delete', id);
}

/** Removes an internally generated payment without sending it to the trash. */
export async function removeTransaction(id: string): Promise<void> {
	const db = await openDB();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction('transactions', 'readwrite');
		tx.objectStore('transactions').delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	track('transactions', 'delete', id);
}

/* ---------- Debts ---------- */
export async function listDebts(
	userId: string,
	workspaceId: string,
	type?: DebtType
): Promise<Debt[]> {
	const all = await getAllByIndex<Debt>('debts', 'userId', userId);
	return all
		.filter((d) => !d.deletedAt && d.workspaceId === workspaceId && (!type || d.type === type))
		.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}
export async function createDebt(
	userId: string,
	workspaceId: string,
	input: {
		type: DebtType;
		counterparty: string;
		amountCents: number;
		dueDate?: string | null;
		note?: string | null;
		date: string;
		paidCents?: number;
		status?: DebtStatus;
	}
): Promise<Debt> {
	const full: Debt = {
		id: genId(),
		userId,
		workspaceId,
		type: input.type,
		counterparty: input.counterparty,
		amountCents: input.amountCents,
		paidCents: input.paidCents ?? 0,
		dueDate: input.dueDate ?? null,
		note: input.note ?? null,
		status: input.status ?? 'unpaid',
		date: input.date,
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	const saved = await put<Debt>('debts', full);
	track('debts', 'upsert', saved.id);
	return saved;
}
export async function updateDebt(id: string, patch: Partial<Debt>): Promise<Debt | undefined> {
	const r = await update<Debt>('debts', id, patch);
	if (r) track('debts', 'upsert', id);
	return r;
}
export async function deleteDebt(id: string): Promise<void> {
	await softDelete('debts', id);
	track('debts', 'delete', id);
}

export async function recordDebtPayment(
	userId: string,
	workspaceId: string,
	debt: Debt,
	input: {
		amountCents: number;
		accountId: string;
		date: string;
		note?: string | null;
	}
): Promise<{ debt: Debt; transaction: Transaction } | undefined> {
	const remaining = debt.amountCents - debt.paidCents;
	const payAmount = Math.min(input.amountCents, remaining > 0 ? remaining : input.amountCents);
	const newPaid = debt.paidCents + payAmount;
	const newStatus: DebtStatus =
		newPaid >= debt.amountCents ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

	const updatedDebt = await updateDebt(debt.id, {
		paidCents: newPaid,
		status: newStatus
	});

	if (!updatedDebt) return undefined;

	const txType: TransactionType = debt.type === 'hutang' ? 'expense' : 'income';
	const defaultNote =
		debt.type === 'hutang'
			? `Pembayaran hutang ke ${debt.counterparty}`
			: `Penerimaan piutang dari ${debt.counterparty}`;

	const transaction = await createTransaction(userId, workspaceId, {
		accountId: input.accountId,
		type: txType,
		amountCents: payAmount,
		date: input.date,
		note: input.note?.trim() || defaultNote,
		debtType: debt.type,
		counterparty: debt.counterparty,
		debtId: debt.id
	});

	return { debt: updatedDebt, transaction };
}

export async function listDebtPayments(
	userId: string,
	workspaceId: string,
	debtId: string
): Promise<Transaction[]> {
	const all = await listTransactions(userId, workspaceId);
	return all.filter((t) => t.debtId === debtId);
}
