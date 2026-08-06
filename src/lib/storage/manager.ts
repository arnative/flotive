// Users, accounts, categories, settings, syncState.

import type {
	Account,
	AccountType,
	Category,
	CategoryKind,
	Settings,
	PublicUser
} from '$lib/db/schema';
import { genId, getAllByIndex, get, put, softDelete, update, now } from './idb';
import { track } from './offline-queue';

/* ---------- Users ---------- */
export async function getUser(id: string): Promise<PublicUser | undefined> {
	return get<PublicUser>('users', id);
}
export async function updateUser(
	id: string,
	patch: Partial<PublicUser>
): Promise<PublicUser | undefined> {
	return update<PublicUser>('users', id, patch);
}

export async function cacheUser(user: PublicUser): Promise<PublicUser> {
	return put<PublicUser>('users', user);
}

/* ---------- Accounts ---------- */
const DEFAULT_ACCOUNT_KEY = 'flotive-default-account';

function defaultAccountKey(userId: string, workspaceId: string): string {
	return `${DEFAULT_ACCOUNT_KEY}:${userId}:${workspaceId}`;
}

export async function listAccounts(userId: string, workspaceId: string): Promise<Account[]> {
	const all = await getAllByIndex<Account>('accounts', 'userId', userId);
	const accounts = all
		.filter((a) => !a.deletedAt && a.workspaceId === workspaceId)
		.sort((a, b) => a.createdAt - b.createdAt);
	const storedId =
		typeof localStorage !== 'undefined'
			? (localStorage.getItem(defaultAccountKey(userId, workspaceId)) ??
				localStorage.getItem(`floty-default-account:${userId}:${workspaceId}`))
			: null;
	const selected =
		accounts.find((a) => a.id === storedId) ?? accounts.find((a) => a.isDefault) ?? accounts[0];
	if (selected && accounts.some((a) => a.isDefault !== (a.id === selected.id))) {
		for (const account of accounts) {
			account.isDefault = account.id === selected.id;
			account.updatedAt = now();
			await put('accounts', account);
			track('accounts', 'upsert', account.id);
		}
	}
	if (selected && typeof localStorage !== 'undefined') {
		localStorage.setItem(defaultAccountKey(userId, workspaceId), selected.id);
	}
	return accounts.sort(
		(a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt
	);
}
export async function getAccount(id: string): Promise<Account | undefined> {
	return get<Account>('accounts', id);
}
export async function createAccount(
	userId: string,
	workspaceId: string,
	input: {
		name: string;
		type?: AccountType;
		initialBalanceCents?: number;
		icon?: string;
		isDefault?: boolean;
	}
): Promise<Account> {
	const existing = await listAccounts(userId, workspaceId);
	const isFirst = existing.length === 0;
	const shouldBeDefault = input.isDefault ?? isFirst;

	const full: Account = {
		id: genId(),
		userId,
		workspaceId,
		name: input.name,
		type: input.type ?? 'cash',
		initialBalanceCents: input.initialBalanceCents ?? 0,
		isDefault: shouldBeDefault,
		icon: input.icon ?? 'wallet',
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	const saved = await put<Account>('accounts', full);
	track('accounts', 'upsert', saved.id);

	if (shouldBeDefault) {
		await setDefaultAccount(saved.id);
	}
	return saved;
}

export async function updateAccount(
	id: string,
	patch: Partial<Account>
): Promise<Account | undefined> {
	if (patch.isDefault) {
		await setDefaultAccount(id);
	}
	const r = await update<Account>('accounts', id, patch);
	if (r) track('accounts', 'upsert', id);
	return r;
}

export async function setDefaultAccount(id: string): Promise<Account | undefined> {
	const target = await getAccount(id);
	if (!target) return undefined;
	const all = await getAllByIndex<Account>('accounts', 'userId', target.userId);
	const accounts = all.filter((a) => !a.deletedAt && a.workspaceId === target.workspaceId);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(defaultAccountKey(target.userId, target.workspaceId ?? ''), id);
	}
	let updatedTarget: Account | undefined;
	for (const acc of accounts) {
		const shouldBeDefault = acc.id === id;
		if (acc.isDefault !== shouldBeDefault) {
			acc.isDefault = shouldBeDefault;
			acc.updatedAt = now();
			await put('accounts', acc);
			track('accounts', 'upsert', acc.id);
		}
		if (acc.id === id) updatedTarget = acc;
	}
	return updatedTarget;
}

export async function deleteAccount(id: string): Promise<void> {
	await softDelete('accounts', id);
	track('accounts', 'delete', id);
}

/* ---------- Categories ---------- */
export async function listCategories(userId: string, workspaceId: string): Promise<Category[]> {
	const all = await getAllByIndex<Category>('categories', 'userId', userId);
	return all
		.filter((c) => !c.deletedAt && c.workspaceId === workspaceId)
		.sort((a, b) =>
			a.isDefault === b.isDefault ? a.createdAt - b.createdAt : a.isDefault ? -1 : 1
		);
}
export async function createCategory(
	userId: string,
	workspaceId: string,
	input: { name: string; icon?: string; isDefault?: boolean; kind?: CategoryKind }
): Promise<Category> {
	const full: Category = {
		id: genId(),
		userId,
		workspaceId,
		name: input.name,
		icon: input.icon ?? 'dots',
		isDefault: input.isDefault ?? false,
		kind: input.kind ?? 'both',
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	const saved = await put<Category>('categories', full);
	track('categories', 'upsert', saved.id);
	return saved;
}
export async function updateCategory(
	id: string,
	patch: Partial<Category>
): Promise<Category | undefined> {
	const r = await update<Category>('categories', id, patch);
	if (r) track('categories', 'upsert', id);
	return r;
}
export async function deleteCategory(id: string): Promise<void> {
	await softDelete('categories', id);
	track('categories', 'delete', id);
}

/* ---------- Settings ---------- */
export async function getSettings(userId: string): Promise<Settings | undefined> {
	const list = await getAllByIndex<Settings>('settings', 'userId', userId);
	return list[0];
}
export async function upsertSettings(
	userId: string,
	patch: Partial<Pick<Settings, 'currency' | 'syncEnabled' | 'monthlyIncomeCents'>>
): Promise<Settings> {
	const existing = await getSettings(userId);
	if (existing) {
		const r = await update<Settings>('settings', existing.id, patch);
		track('settings', 'upsert', existing.id);
		return r ?? existing;
	}
	const full: Settings = {
		id: genId(),
		userId,
		currency: patch.currency ?? 'IDR',
		syncEnabled: patch.syncEnabled ?? true,
		monthlyIncomeCents: patch.monthlyIncomeCents ?? 0,
		monthlyIncomeByWorkspace: {},
		updatedAt: now()
	};
	const saved = await put<Settings>('settings', full);
	track('settings', 'upsert', saved.id);
	return saved;
}

export async function getWorkspaceBudget(userId: string, workspaceId: string): Promise<number> {
	const key = `flotive-budget:${userId}:${workspaceId}`;
	if (typeof localStorage !== 'undefined') {
		const local =
			localStorage.getItem(key) ?? localStorage.getItem(`floty-budget:${userId}:${workspaceId}`);
		if (local !== null) return Number(local) || 0;
	}
	const settings = await getSettings(userId);
	const amount = settings?.monthlyIncomeByWorkspace?.[workspaceId] ?? 0;
	if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(amount));
	return amount;
}

export async function upsertWorkspaceBudget(
	userId: string,
	workspaceId: string,
	amountCents: number
): Promise<Settings> {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(`flotive-budget:${userId}:${workspaceId}`, String(amountCents));
	}
	const existing = await getSettings(userId);
	const monthlyIncomeByWorkspace = {
		...(existing?.monthlyIncomeByWorkspace ?? {}),
		[workspaceId]: amountCents
	};
	if (existing) {
		const saved = await update<Settings>('settings', existing.id, { monthlyIncomeByWorkspace });
		track('settings', 'upsert', existing.id);
		return saved ?? existing;
	}
	const saved = await put<Settings>('settings', {
		id: genId(),
		userId,
		currency: 'IDR',
		syncEnabled: true,
		monthlyIncomeCents: 0,
		monthlyIncomeByWorkspace,
		updatedAt: now()
	});
	track('settings', 'upsert', saved.id);
	return saved;
}

/* ---------- Sync state ---------- */
export async function getSyncState(
	userId: string
): Promise<{ id: string; lastPullAt?: number; lastPushAt?: number } | undefined> {
	return get('sync_state', `sync:${userId}`);
}
export async function upsertSyncState(
	userId: string,
	patch: { lastPullAt?: number; lastPushAt?: number }
): Promise<void> {
	const existing = await getSyncState(userId);
	const next = {
		id: `sync:${userId}`,
		userId,
		lastPullAt: patch.lastPullAt ?? existing?.lastPullAt,
		lastPushAt: patch.lastPushAt ?? existing?.lastPushAt,
		updatedAt: now()
	};
	await put('sync_state', next);
}
