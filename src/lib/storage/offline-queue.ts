// Antrian operasi sync (two-way ke Cloudflare D1). Dipakai oleh sync layer:
// setiap write lokal → enqueue; saat online → flush.

import { genId } from './idb';
import { isSyncTableName, type SyncOperationKind, type SyncTableName } from '$lib/sync-contract';

export interface SyncOp {
	id: string;
	userId?: string;
	table: SyncTableName;
	op: SyncOperationKind;
	recordId: string;
	ts: number;
}

const KEY = 'flotive-sync-queue';

function load(): SyncOp[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		const value: unknown = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(value)) return [];
		return value.filter(
			(item): item is SyncOp =>
				typeof item === 'object' &&
				item !== null &&
				typeof item.id === 'string' &&
				(item.userId === undefined || typeof item.userId === 'string') &&
				isSyncTableName(item.table) &&
				['upsert', 'delete', 'purge'].includes(String(item.op)) &&
				typeof item.recordId === 'string' &&
				typeof item.ts === 'number'
		);
	} catch {
		return [];
	}
}

function save(q: SyncOp[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(q));
	} catch (error) {
		console.error(JSON.stringify({ message: 'sync queue save failed', error: String(error) }));
	}
}

export function enqueue(op: Omit<SyncOp, 'id' | 'ts'>): void {
	const q = load();
	const existingIndex = q.findIndex(
		(existing) =>
			existing.userId === op.userId &&
			existing.table === op.table &&
			existing.recordId === op.recordId
	);
	const next = { ...op, id: genId(), ts: Date.now() };
	if (existingIndex >= 0) q[existingIndex] = next;
	else q.push(next);
	save(q);
}

export function getQueue(userId = currentUserId): SyncOp[] {
	if (!userId) return [];
	return load().filter((operation) => !operation.userId || operation.userId === userId);
}

export function removeOp(id: string): void {
	save(load().filter((o) => o.id !== id));
}

export function clearQueue(): void {
	if (!currentUserId) return;
	save(load().filter((operation) => operation.userId && operation.userId !== currentUserId));
}

export function queueSize(userId = currentUserId): number {
	return getQueue(userId).length;
}

export function assignOpUser(id: string, userId: string): void {
	save(load().map((operation) => (operation.id === id ? { ...operation, userId } : operation)));
}

let _syncEnabled = false;
let currentUserId: string | null = null;
let syncRequested: (() => void) | null = null;

/** Aktif/nonaktifkan enqueue tanpa membuang perubahan yang belum terkirim. */
export function setSyncEnabled(v: boolean, userId: string | null = null): void {
	_syncEnabled = v;
	currentUserId = v ? userId : null;
}

export function syncEnabled(): boolean {
	return _syncEnabled;
}

export function onSyncRequested(callback: (() => void) | null): void {
	syncRequested = callback;
}

/** Enqueue sync op hanya jika sync aktif. */
export function track(table: SyncTableName, op: SyncOperationKind, recordId: string): void {
	if (_syncEnabled && currentUserId) {
		enqueue({ userId: currentUserId, table, op, recordId });
		syncRequested?.();
	}
}

export function isOnline(): boolean {
	return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
