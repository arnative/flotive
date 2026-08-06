import { json } from '@sveltejs/kit';
import { and, eq, gte } from 'drizzle-orm';
import * as schema from '$lib/db/schema';
import { type SyncTableName } from '$lib/sync-contract';
import { getDatabase } from '$lib/server/database';
import { requireUser } from '$lib/server/request';
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

export const GET: RequestHandler = async (event) => {
	const userId = await requireUser(event);
	if (userId instanceof Response) return userId;
	const rawSince = Number(event.url.searchParams.get('since') ?? 0);
	if (!Number.isSafeInteger(rawSince) || rawSince < 0) {
		return json({ error: 'Cursor sinkronisasi tidak valid.' }, { status: 400 });
	}
	const since = rawSince;
	const cursor = Date.now();
	try {
		const handle = getDatabase(event.platform?.env);
		const db = handle.db;
		const records: Array<{ table: SyncTableName; record: unknown }> = [];
		for (const [name, table] of Object.entries(TABLES) as Array<
			[SyncTableName, (typeof TABLES)[SyncTableName]]
		>) {
			const rows = await db
				.select()
				.from(table as any)
				.where(and(eq((table as any).userId, userId), gte((table as any).updatedAt, since)));
			for (const record of rows) records.push({ table: name, record });
		}
		return json({ records, cursor });
	} catch (error) {
		console.error(JSON.stringify({ message: 'sync pull failed', error: String(error), userId }));
		return json({ error: 'Gagal mengambil perubahan.' }, { status: 500 });
	}
};
