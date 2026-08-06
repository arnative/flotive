import type { Account, AccountType, Transaction } from '$lib/db/schema';

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: string }> = {
	cash: { label: 'Tunai', icon: 'wallet' },
	bank: { label: 'Bank', icon: 'bank' },
	ewallet: { label: 'E-wallet', icon: 'mobile' },
	other: { label: 'Lainnya', icon: 'more' }
};

export function accountBalance(account: Account, transactions: Transaction[]): number {
	return transactions.reduce((balance, transaction) => {
		if (transaction.type === 'income' && transaction.accountId === account.id) {
			return balance + transaction.amountCents;
		}
		if (transaction.type === 'expense' && transaction.accountId === account.id) {
			return balance - transaction.amountCents;
		}
		if (transaction.type === 'transfer' && transaction.accountId === account.id) {
			return balance - transaction.amountCents - (transaction.adminFeeCents ?? 0);
		}
		if (transaction.type === 'transfer' && transaction.toAccountId === account.id) {
			return balance + transaction.amountCents;
		}
		return balance;
	}, account.initialBalanceCents);
}

export function totalAccountBalance(accounts: Account[], transactions: Transaction[]): number {
	return accounts.reduce((total, account) => total + accountBalance(account, transactions), 0);
}
