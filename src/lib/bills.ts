import type { Bill } from '$lib/db/schema';

export type BillStatus = 'paid' | 'overdue' | 'today' | 'soon' | 'upcoming';

export function paymentAmount(bill: Bill, period: string): number {
	const payment = bill.payments[period];
	return typeof payment === 'object' && payment.amountCents != null ? payment.amountCents : bill.amountCents;
}

export function paymentNote(bill: Bill, period: string): string {
	const payment = bill.payments[period];
	if (typeof payment === 'object' && payment?.note) return payment.note;
	return bill.note || '-';
}

export function monthKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function dueDateFor(period: string, dueDay: number): Date {
	const [year, month] = period.split('-').map(Number);
	const lastDay = new Date(year, month, 0).getDate();
	return new Date(year, month - 1, Math.min(dueDay, lastDay));
}

export function billStatus(bill: Bill, period: string, today = new Date()): BillStatus {
	if (bill.payments[period]) return 'paid';
	const due = dueDateFor(period, bill.dueDay);
	const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const days = Math.round((due.getTime() - startToday.getTime()) / 86_400_000);
	if (days < 0) return 'overdue';
	if (days === 0) return 'today';
	if (days <= bill.reminderDays) return 'soon';
	return 'upcoming';
}
