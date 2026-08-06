import {
	listAccounts,
	listCategories,
	listTransactions,
	listDebts,
	listTodos,
	getSettings
} from '$lib/storage';

export async function exportJson(userId: string, workspaceId: string): Promise<string> {
	const [accounts, categories, transactions, debts, todos, settings] = await Promise.all([
		listAccounts(userId, workspaceId),
		listCategories(userId, workspaceId),
		listTransactions(userId, workspaceId),
		listDebts(userId, workspaceId),
		listTodos(userId, workspaceId),
		getSettings(userId)
	]);
	return JSON.stringify(
		{ exportedAt: new Date().toISOString(), accounts, categories, transactions, debts, todos, settings },
		null,
		2
	);
}

export async function exportCsv(userId: string, workspaceId: string): Promise<string> {
	const [txs, cats, accs] = await Promise.all([
		listTransactions(userId, workspaceId),
		listCategories(userId, workspaceId),
		listAccounts(userId, workspaceId)
	]);
	const esc = (s: string | null) => `"${(s ?? '').replace(/"/g, '""')}"`;
	const rows = ['date,type,amountCents,category,account,note,counterparty,debtType'];
	for (const t of txs) {
		const cat = cats.find((c) => c.id === t.categoryId)?.name ?? '';
		const acc = accs.find((a) => a.id === t.accountId)?.name ?? '';
		rows.push(
			[t.date, t.type, t.amountCents, esc(cat), esc(acc), esc(t.note), esc(t.counterparty), t.debtType ?? ''].join(',')
		);
	}
	return rows.join('\n');
}

export function download(filename: string, content: string, type = 'text/plain'): void {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
