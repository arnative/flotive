import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from '$lib/db/schema';

export interface DatabaseHandle {
	db: any;
	d1?: D1Database;
	client?: Client;
}

export function getDatabase(platformEnv?: Record<string, any>): DatabaseHandle {
	// 1. Utamakan Cloudflare D1 jika ada di platformEnv.DB (produksi)
	const d1: D1Database | undefined =
		platformEnv?.DB || (typeof process !== 'undefined' ? (process.env as any)?.DB : undefined);

	if (d1) {
		return { db: drizzleD1(d1, { schema }), d1 };
	}

	// 2. Fallback lokal (libSQL file) untuk Node.js dev server tanpa D1 binding
	if (typeof process !== 'undefined' && process.release) {
		const client = createClient({ url: 'file:flotive-local.db' });
		return { db: drizzleLibSQL(client, { schema }), client };
	}

	// Cloudflare Worker runtime tanpa D1 binding → konfigurasi belum selesai
	throw new Error(
		'D1 Database Binding ("DB") belum dikonfigurasi di Cloudflare Pages Dashboard (Settings -> Functions -> D1 database bindings).'
	);
}

export async function ensureSchema(target?: DatabaseHandle | D1Database | Client): Promise<void> {
	let d1: D1Database | undefined;
	let client: Client | undefined;

	if (target) {
		if ('d1' in target || 'client' in target || 'db' in target) {
			const handle = target as DatabaseHandle;
			d1 = handle.d1;
			client = handle.client;
		} else if ('prepare' in target) {
			d1 = target as D1Database;
		} else {
			client = target as Client;
		}
	}

	const statements = [
		`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT NOT NULL, default_currency TEXT NOT NULL DEFAULT 'IDR', storage_mode TEXT NOT NULL DEFAULT 'local', onboarding_done INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'cash', initial_balance_cents INTEGER NOT NULL DEFAULT 0, is_default INTEGER NOT NULL DEFAULT 0, icon TEXT NOT NULL DEFAULT 'wallet', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'dots', is_default INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT 'both', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, to_account_id TEXT, type TEXT NOT NULL, amount_cents INTEGER NOT NULL, admin_fee_cents INTEGER, in_budget INTEGER NOT NULL DEFAULT 0, category_id TEXT, date TEXT NOT NULL, note TEXT, debt_type TEXT, counterparty TEXT, debt_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, synced_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, type TEXT NOT NULL, counterparty TEXT NOT NULL, amount_cents INTEGER NOT NULL, paid_cents INTEGER NOT NULL DEFAULT 0, due_date TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'unpaid', date TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS bills (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, name TEXT NOT NULL, amount_cents INTEGER NOT NULL, due_day INTEGER NOT NULL, reminder_days INTEGER NOT NULL DEFAULT 3, note TEXT, payments TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS todos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, text TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, workspace_id TEXT, category_id TEXT NOT NULL, amount_cents INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT, note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`,
		`CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, currency TEXT NOT NULL DEFAULT 'IDR', sync_enabled INTEGER NOT NULL DEFAULT 0, monthly_income_cents INTEGER NOT NULL DEFAULT 0, monthly_income_by_workspace TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS sync_state (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, last_pull_at INTEGER, last_push_at INTEGER, updated_at INTEGER NOT NULL)`,

		// Indeks untuk Optimasi Query & Read Quota Cloudflare D1
		`CREATE INDEX IF NOT EXISTS idx_workspaces_user_updated ON workspaces(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_accounts_user_updated ON accounts(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_categories_user_updated ON categories(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_user_updated ON transactions(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_debts_user_updated ON debts(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_bills_user_updated ON bills(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_todos_user_updated ON todos(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_budgets_user_updated ON budgets(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_settings_user_updated ON settings(user_id, updated_at)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_state_user ON sync_state(user_id)`,

		// Migrasi data: ganti nilai storage_mode usang 'local-turso' → 'cloud' (idempoten)
		`UPDATE users SET storage_mode = 'cloud' WHERE storage_mode = 'local-turso'`
	];

	const alterStatements = [
		`ALTER TABLE accounts ADD COLUMN workspace_id TEXT`,
		`ALTER TABLE categories ADD COLUMN workspace_id TEXT`,
		`ALTER TABLE transactions ADD COLUMN workspace_id TEXT`,
		`ALTER TABLE debts ADD COLUMN workspace_id TEXT`,
		`ALTER TABLE bills ADD COLUMN workspace_id TEXT`,
		`ALTER TABLE todos ADD COLUMN workspace_id TEXT`,
		`ALTER TABLE settings ADD COLUMN monthly_income_cents INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE settings ADD COLUMN monthly_income_by_workspace TEXT NOT NULL DEFAULT '{}'`,
		`ALTER TABLE accounts ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN admin_fee_cents INTEGER`,
		`ALTER TABLE transactions ADD COLUMN in_budget INTEGER NOT NULL DEFAULT 0`
	];

	function isDuplicateColumn(error: unknown): boolean {
		return /duplicate column name/i.test(String(error));
	}

	if (d1) {
		for (const sql of [...statements, ...alterStatements]) {
			try {
				await d1.prepare(sql).run();
			} catch (error) {
				if (!isDuplicateColumn(error)) throw error;
			}
		}
	} else if (client) {
		for (const sql of [...statements, ...alterStatements]) {
			try {
				await client.execute(sql);
			} catch (error) {
				if (!isDuplicateColumn(error)) throw error;
			}
		}
	}
}
