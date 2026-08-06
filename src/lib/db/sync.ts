import { get, put } from '$lib/storage/idb';
import { getSyncState, upsertSyncState } from '$lib/storage/manager';
import { ensureWorkspaceMigrated, reconcileWorkspaces } from '$lib/storage/workspaces';
import {
	assignOpUser,
	getQueue,
	removeOp,
	setSyncEnabled,
	isOnline,
	onSyncRequested,
	queueSize
} from '$lib/storage/offline-queue';
import { isSyncTableName, SYNC_BATCH_SIZE, type SyncPushRecord } from '$lib/sync-contract';

let active = false;
let onlineListener: (() => void) | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let syncGeneration = 0;
let syncRun: {
	userId: string;
	generation: number;
	controller: AbortController;
	promise: Promise<void>;
} | null = null;

export function isSyncActive(): boolean {
	return active;
}

export async function initSync(userId: string): Promise<void> {
	if (active && currentUserId === userId) {
		if (isOnline()) await runSync(userId);
		return;
	}
	if (active) stopSync();
	active = true;
	currentUserId = userId;
	setSyncEnabled(true, userId);
	onSyncRequested(scheduleSync);
	// Login/reload harus menghidrasi ulang seluruh cache lokal, meski cursor lama masih tersimpan.
	if (isOnline()) await runSync(userId, true);
	if (typeof window !== 'undefined') {
		if (onlineListener) window.removeEventListener('online', onlineListener);
		onlineListener = () => runSync(userId).catch(console.error);
		window.addEventListener('online', onlineListener);
	}
}

function scheduleSync(): void {
	if (!active || !currentUserId || !isOnline()) return;
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		syncTimer = null;
		if (currentUserId) runSync(currentUserId).catch(console.error);
	}, 500);
}

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted)
		throw signal.reason ?? new DOMException('Sinkronisasi dibatalkan.', 'AbortError');
}

async function push(userId: string, signal: AbortSignal): Promise<void> {
	const queued = getQueue(userId).slice(0, SYNC_BATCH_SIZE);
	const records: SyncPushRecord[] = [];
	for (const op of queued) {
		throwIfAborted(signal);
		const record = await get<Record<string, unknown>>(op.table, op.recordId);
		if (!op.userId && typeof record?.userId === 'string' && record.userId !== userId) {
			assignOpUser(op.id, record.userId);
			continue;
		}
		if (!op.userId && !record) {
			assignOpUser(op.id, '__legacy-unowned__');
			console.warn(
				JSON.stringify({ message: 'legacy sync operation quarantined', operationId: op.id })
			);
			continue;
		}
		if (op.op === 'purge') {
			records.push({
				operationId: op.id,
				operation: 'purge',
				table: op.table,
				recordId: op.recordId
			});
		} else if (record?.userId === userId) {
			if (!op.userId) assignOpUser(op.id, userId);
			records.push({
				operationId: op.id,
				operation: op.op,
				table: op.table,
				recordId: op.recordId,
				record
			});
		} else if (op.op === 'delete') {
			records.push({
				operationId: op.id,
				operation: 'delete',
				table: op.table,
				recordId: op.recordId
			});
		} else if (!record || op.userId === userId) {
			removeOp(op.id);
		}
	}
	if (!records.length) return;
	const response = await fetch('/api/sync/push', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ records }),
		signal
	});
	throwIfAborted(signal);
	if (!response.ok) {
		const err = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error || `Push sinkronisasi gagal (${response.status})`);
	}
	const result = (await response.json()) as {
		operationIds?: string[];
		rejected?: Array<{ operationId: string; reason: string }>;
	};
	throwIfAborted(signal);
	for (const id of result.operationIds ?? []) removeOp(id);
	for (const rejected of result.rejected ?? []) {
		console.warn(JSON.stringify({ message: 'sync operation rejected', ...rejected }));
		removeOp(rejected.operationId);
	}
}

async function drainPush(userId: string, signal: AbortSignal): Promise<void> {
	while (queueSize(userId) > 0) {
		const before = queueSize(userId);
		await push(userId, signal);
		if (queueSize(userId) >= before) throw new Error('Antrian sinkronisasi tidak dapat diproses.');
	}
}

async function pull(userId: string, signal: AbortSignal, full = false): Promise<void> {
	const state = await getSyncState(userId);
	const pendingChanges = new Set(
		getQueue(userId).map((operation) => `${operation.table}:${operation.recordId}`)
	);
	const response = await fetch(`/api/sync/pull?since=${full ? 0 : (state?.lastPullAt ?? 0)}`, {
		signal
	});
	throwIfAborted(signal);
	if (!response.ok) {
		const err = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(err.error || `Pull sinkronisasi gagal (${response.status})`);
	}
	const result = (await response.json()) as {
		records: Array<{
			table: string;
			record: Record<string, unknown> & { id: string; updatedAt?: number };
		}>;
		cursor: number;
	};
	throwIfAborted(signal);
	for (const item of result.records) {
		if (!isSyncTableName(item.table) || item.record.userId !== userId) continue;
		// Unsynced local writes are newer by intent, regardless of clock skew.
		if (pendingChanges.has(`${item.table}:${item.record.id}`)) continue;
		const local = await get<Record<string, unknown> & { updatedAt?: number }>(
			item.table,
			item.record.id
		);
		if (!local) {
			await put(item.table, item.record);
		} else if ((item.record.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
			const merged = { ...local, ...item.record };
			// Preserve a fee already known locally. Older deployed APIs return null
			// for this newly-added column and would otherwise reset it on every reload.
			if (
				item.table === 'transactions' &&
				local.adminFeeCents != null &&
				item.record.adminFeeCents == null
			)
				merged.adminFeeCents = local.adminFeeCents;
			if (item.table === 'transactions' && merged.inBudget == null) merged.inBudget = false;
			await put(item.table, merged);
		}
	}
	if (full) {
		const remoteWorkspaceIds = new Set(
			result.records.filter((item) => item.table === 'workspaces').map((item) => item.record.id)
		);
		const pendingWorkspaceIds = new Set(
			getQueue(userId)
				.filter((operation) => operation.table === 'workspaces' && operation.op === 'upsert')
				.map((operation) => operation.recordId)
		);
		await reconcileWorkspaces(userId, remoteWorkspaceIds, pendingWorkspaceIds);
	}
	await ensureWorkspaceMigrated(userId);
	await upsertSyncState(userId, { lastPullAt: result.cursor });
}

export async function runSync(userId: string, fullPull = false): Promise<void> {
	if (!active || currentUserId !== userId || !isOnline()) return;
	if (syncRun?.userId === userId) return syncRun.promise;
	if (syncRun) syncRun.controller.abort();
	const generation = syncGeneration;
	const controller = new AbortController();
	const promise = (async () => {
		await drainPush(userId, controller.signal);
		await pull(userId, controller.signal, fullPull);
		await drainPush(userId, controller.signal);
		await upsertSyncState(userId, { lastPushAt: Date.now() });
	})();
	const run = { userId, generation, controller, promise };
	syncRun = run;
	try {
		await promise;
		if (!active || currentUserId !== userId || syncGeneration !== generation) return;
		// Beri tahu UI bahwa data lokal baru saja diperbarui dari Flotive Cloud,
		// agar komponen yang sudah mount (mis. dashboard) me-load ulang dari IDB.
		if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('Flotive:synced'));
	} finally {
		if (syncRun === run) syncRun = null;
		if (active && currentUserId === userId && queueSize(userId) > 0) scheduleSync();
	}
}

export function stopSync(): void {
	syncGeneration += 1;
	syncRun?.controller.abort();
	syncRun = null;
	if (onlineListener && typeof window !== 'undefined')
		window.removeEventListener('online', onlineListener);
	onlineListener = null;
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = null;
	currentUserId = null;
	onSyncRequested(null);
	active = false;
	setSyncEnabled(false);
}
