// Helper domain untuk anggaran harian per kategori.
// Realisasi dihitung dari transaksi (lihat src/lib/storage/transactions.ts), bukan disimpan.

import type { Budget, Transaction } from '$lib/db/schema';

export type BudgetStatus = 'aman' | 'waspada' | 'melebihi';

/** Apakah budget berlaku pada tanggal (YYYY-MM-DD) tertentu. */
export function isBudgetActive(budget: Budget, dateISO: string): boolean {
	if (dateISO < budget.startDate) return false;
	if (budget.endDate && dateISO > budget.endDate) return false;
	return true;
}

/** Total pengeluaran pada (tanggal, kategori) dari daftar transaksi workspace. */
export function spentOnDate(
	transactions: Transaction[],
	dateISO: string,
	categoryId: string
): number {
	return transactions
		.filter((t) => t.type === 'expense' && t.date === dateISO && t.categoryId === categoryId)
		.reduce((sum, t) => sum + t.amountCents, 0);
}

/** Status pemakaian terhadap target harian. */
export function budgetStatus(targetCents: number, spentCents: number): BudgetStatus {
	const sisa = targetCents - spentCents;
	if (sisa < 0) return 'melebihi';
	if (targetCents > 0 && sisa <= targetCents * 0.2) return 'waspada';
	return 'aman';
}
