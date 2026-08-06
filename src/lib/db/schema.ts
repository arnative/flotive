// Skema Drizzle (SQLite/D1) — sumber kanonik tipe + basis sync Cloudflare D1.
// Local-first: data disimpan di IndexedDB (src/lib/storage/manager.ts) dengan
// tipe yang diturunkan dari sini. Sync two-way: last-write-wins via updatedAt,
// penghapusan via deletedAt (tombstone).

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type StorageMode = 'local' | 'cloud';
export type AccountType = 'cash' | 'bank' | 'ewallet' | 'other';
export type CategoryKind = 'expense' | 'income' | 'both';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type DebtType = 'hutang' | 'piutang';
export type DebtStatus = 'unpaid' | 'partial' | 'paid';
export type BillPayment =
	| string
	| {
			paidAt: string;
			transactionId: string;
			accountId?: string;
			amountCents?: number;
			note?: string | null;
	  };
export type BillPayments = Record<string, BillPayment>;

const createdAt = () => integer('created_at').notNull();
const updatedAt = () => integer('updated_at').notNull();
const deletedAt = () => integer('deleted_at');

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name').notNull(),
	defaultCurrency: text('default_currency').notNull().default('IDR'),
	storageMode: text('storage_mode', { enum: ['local', 'cloud'] })
		.notNull()
		.default('local'),
	onboardingDone: integer('onboarding_done', { mode: 'boolean' }).notNull().default(false),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const workspaces = sqliteTable('workspaces', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const accounts = sqliteTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	name: text('name').notNull(),
	type: text('type', { enum: ['cash', 'bank', 'ewallet', 'other'] })
		.notNull()
		.default('cash'),
	initialBalanceCents: integer('initial_balance_cents').notNull().default(0),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	icon: text('icon').notNull().default('wallet'),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const categories = sqliteTable('categories', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	name: text('name').notNull(),
	icon: text('icon').notNull().default('dots'),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	kind: text('kind', { enum: ['expense', 'income', 'both'] })
		.notNull()
		.default('both'),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const transactions = sqliteTable('transactions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	accountId: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	toAccountId: text('to_account_id'),
	type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
	amountCents: integer('amount_cents').notNull(),
	adminFeeCents: integer('admin_fee_cents'),
	inBudget: integer('in_budget', { mode: 'boolean' }).notNull().default(false),
	categoryId: text('category_id'),
	date: text('date').notNull(),
	note: text('note'),
	debtType: text('debt_type', { enum: ['hutang', 'piutang'] }),
	counterparty: text('counterparty'),
	debtId: text('debt_id'),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt(),
	syncedAt: integer('synced_at')
});

export const debts = sqliteTable('debts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	type: text('type', { enum: ['hutang', 'piutang'] }).notNull(),
	counterparty: text('counterparty').notNull(),
	amountCents: integer('amount_cents').notNull(),
	paidCents: integer('paid_cents').notNull().default(0),
	dueDate: text('due_date'),
	note: text('note'),
	status: text('status', { enum: ['unpaid', 'partial', 'paid'] })
		.notNull()
		.default('unpaid'),
	date: text('date').notNull(),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const bills = sqliteTable('bills', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	name: text('name').notNull(),
	amountCents: integer('amount_cents').notNull(),
	dueDay: integer('due_day').notNull(),
	reminderDays: integer('reminder_days').notNull().default(3),
	note: text('note'),
	payments: text('payments', { mode: 'json' }).$type<BillPayments>().notNull().default({}),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const todos = sqliteTable('todos', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	text: text('text').notNull(),
	completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const budgets = sqliteTable('budgets', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workspaceId: text('workspace_id'),
	categoryId: text('category_id').notNull(),
	amountCents: integer('amount_cents').notNull(),
	startDate: text('start_date').notNull(),
	endDate: text('end_date'),
	note: text('note'),
	createdAt: createdAt(),
	updatedAt: updatedAt(),
	deletedAt: deletedAt()
});

export const settings = sqliteTable('settings', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	currency: text('currency').notNull().default('IDR'),
	syncEnabled: integer('sync_enabled', { mode: 'boolean' }).notNull().default(false),
	monthlyIncomeCents: integer('monthly_income_cents').notNull().default(0),
	monthlyIncomeByWorkspace: text('monthly_income_by_workspace', { mode: 'json' })
		.$type<Record<string, number>>()
		.notNull()
		.default({}),
	updatedAt: updatedAt()
});

export const syncState = sqliteTable('sync_state', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	lastPullAt: integer('last_pull_at'),
	lastPushAt: integer('last_push_at'),
	updatedAt: updatedAt()
});

export type User = InferSelectModel<typeof users>;
export type PublicUser = Omit<User, 'passwordHash'>;
export type NewUser = InferInsertModel<typeof users>;
export type Workspace = InferSelectModel<typeof workspaces>;
export type NewWorkspace = InferInsertModel<typeof workspaces>;
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;
export type Debt = InferSelectModel<typeof debts>;
export type NewDebt = InferInsertModel<typeof debts>;
export type Bill = InferSelectModel<typeof bills>;
export type NewBill = InferInsertModel<typeof bills>;
export type Todo = InferSelectModel<typeof todos>;
export type NewTodo = InferInsertModel<typeof todos>;
export type Budget = InferSelectModel<typeof budgets>;
export type NewBudget = InferInsertModel<typeof budgets>;
export type Settings = InferSelectModel<typeof settings>;
export type NewSettings = InferInsertModel<typeof settings>;
