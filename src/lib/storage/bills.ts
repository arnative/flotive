import type { Bill } from '$lib/db/schema';
import { genId, getAllByIndex, now, put, softDelete, update } from './idb';
import { track } from './offline-queue';
import { createTransaction, removeTransaction } from './transactions';
import { listCategories } from './manager';

export async function listBills(userId: string, workspaceId: string): Promise<Bill[]> {
	const all = await getAllByIndex<Bill>('bills', 'userId', userId);
	return all
		.filter((bill) => !bill.deletedAt && bill.workspaceId === workspaceId)
		.sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name));
}

export async function createBill(
	userId: string,
	workspaceId: string,
	input: Pick<Bill, 'name' | 'amountCents' | 'dueDay' | 'reminderDays' | 'note'>
): Promise<Bill> {
	const bill: Bill = {
		id: genId(),
		userId,
		workspaceId,
		...input,
		payments: {},
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	await put('bills', bill);
	track('bills', 'upsert', bill.id);
	return bill;
}

export async function updateBill(id: string, patch: Partial<Bill>): Promise<Bill | undefined> {
	const bill = await update<Bill>('bills', id, patch);
	if (bill) track('bills', 'upsert', id);
	return bill;
}

export async function payBill(
	userId: string,
	workspaceId: string,
	bill: Bill,
	period: string,
	accountId: string,
	date: string,
	amountCents: number,
	note?: string | null
): Promise<Bill | undefined> {
	const transactionNote = note?.trim() || `Pembayaran tagihan ${bill.name} (${period})`;
	const categories = await listCategories(userId, workspaceId);
	const tagihanCategory = categories.find((c) => c.name.toLowerCase() === 'tagihan');

	const transaction = await createTransaction(userId, workspaceId, {
		accountId,
		categoryId: tagihanCategory?.id,
		type: 'expense',
		amountCents,
		date,
		note: transactionNote
	});
	const payments = { ...bill.payments };
	payments[period] = {
		paidAt: new Date().toISOString(),
		transactionId: transaction.id,
		accountId,
		amountCents,
		note: note?.trim() || null
	};
	return updateBill(bill.id, { payments });
}

export async function cancelBillPayment(bill: Bill, period: string): Promise<Bill | undefined> {
	const payment = bill.payments[period];
	if (typeof payment === 'object' && payment.transactionId) await removeTransaction(payment.transactionId);
	const payments = { ...bill.payments };
	delete payments[period];
	return updateBill(bill.id, { payments });
}

export async function deleteBill(id: string): Promise<void> {
	await softDelete('bills', id);
	track('bills', 'delete', id);
}
