// Workspaces: sub-scope data dalam satu akun (userId). Tiap workspace punya data
// sendiri (accounts, categories, transactions, debts, todos) yang ditandai
// workspaceId. Switch workspace = ganti activeWorkspaceId (state klien, per perangkat).
// Sync tetap per-user: semua workspace ikut tersinkronisasi.

import type { Workspace } from '$lib/db/schema';
import { genId, getAllByIndex, getAll, get, openDB, put, softDelete, update, now } from './idb';
import { track } from './offline-queue';

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
	const all = await getAllByIndex<Workspace>('workspaces', 'userId', userId);
	const sorted = all.filter((w) => !w.deletedAt).sort((a, b) => a.createdAt - b.createdAt);
	// Workspace pribadi (default) selalu di urutan pertama (pin), tidak terpengaruh sort.
	const defId = `ws-default:${userId}`;
	const def = sorted.find((w) => w.id === defId);
	const rest = sorted.filter((w) => w.id !== defId);
	return def ? [def, ...rest] : rest;
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
	return get<Workspace>('workspaces', id);
}

export async function createWorkspace(userId: string, input: { name: string }): Promise<Workspace> {
	const full: Workspace = {
		id: genId(),
		userId,
		name: input.name.trim(),
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	const saved = await put<Workspace>('workspaces', full);
	track('workspaces', 'upsert', saved.id);
	return saved;
}

export async function updateWorkspace(
	id: string,
	patch: Partial<Workspace>
): Promise<Workspace | undefined> {
	const r = await update<Workspace>('workspaces', id, patch);
	if (r) track('workspaces', 'upsert', id);
	return r;
}

export async function deleteWorkspace(id: string): Promise<void> {
	await softDelete('workspaces', id);
	track('workspaces', 'delete', id);
}

/** Remove local workspace rows that no longer exist after an authoritative full pull. */
export async function reconcileWorkspaces(
	userId: string,
	remoteIds: Set<string>,
	pendingIds: Set<string>
): Promise<void> {
	// Full pull tanpa workspace apa pun kemungkinan server kosong/belum terisi,
	// bukan bukti bahwa workspace lokal sudah terhapus. Jangan sampai menimpa data lokal.
	if (remoteIds.size === 0) return;
	const local = await getAllByIndex<Workspace>('workspaces', 'userId', userId);
	const staleIds = local
		.filter((workspace) => !remoteIds.has(workspace.id) && !pendingIds.has(workspace.id))
		.map((workspace) => workspace.id);
	if (!staleIds.length) return;

	const db = await openDB();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction('workspaces', 'readwrite');
		const store = tx.objectStore('workspaces');
		for (const id of staleIds) store.delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

/**
 * Buat/ambil workspace default memakai nama akun (mis. "Bisma"). Memakai id deterministik (`ws-default:{userId}`)
 * agar setiap perangkat membuat workspace default yang sama dan data lama (pra-fitur workspace)
 * ter-backfill ke id yang sama -> konvergen saat sync. Workspace default lama bernama
 * hardcode "Pribadi"/"Bisma" ikut di-rename mengikuti nama akun.
 */
export async function ensureDefaultWorkspace(
	userId: string,
	userName?: string
): Promise<Workspace> {
	const id = `ws-default:${userId}`;
	const existing = await getWorkspace(id);
	const display = userName?.trim() || existing?.name || 'Pribadi';
	if (existing) {
		if (!existing.deletedAt) {
			// Ikuti nama akun; tidak perlu di-update jika sudah cocok.
			return existing.name === display
				? existing
				: ((await updateWorkspace(id, { name: display })) ?? existing);
		}
		const restored = await updateWorkspace(id, { deletedAt: null, name: display });
		if (restored) return restored;
	}
	const full: Workspace = {
		id,
		userId,
		name: display,
		createdAt: now(),
		updatedAt: now(),
		deletedAt: null
	};
	const saved = await put<Workspace>('workspaces', full);
	track('workspaces', 'upsert', saved.id);
	return saved;
}

/**
 * Tugaskan semua record tanpa workspaceId (data pra-fitur workspace) ke workspace
 * default. Idempoten: hanya menyentuh record dengan workspaceId null/undefined.
 */
export async function backfillWorkspaceId(userId: string, workspaceId: string): Promise<void> {
	const stores = ['accounts', 'categories', 'transactions', 'debts', 'bills', 'todos'] as const;
	for (const store of stores) {
		const all = await getAllByIndex<{ id: string; userId: string; workspaceId?: string | null }>(
			store,
			'userId',
			userId
		);
		const stale = all.filter((r) => r.workspaceId === undefined || r.workspaceId === null);
		for (const r of stale) {
			await put(store, { ...r, workspaceId, updatedAt: now() });
			track(store, 'upsert', r.id);
		}
	}
}

/**
 * Menghubungkan kembali semua data lokal (pra-autentikasi/penyesuaian user ID)
 * ke userId yang sedang aktif agar data transaksi/akun lama tidak tersembunyi.
 */
export async function adoptOrphanData(newUserId: string): Promise<void> {
	const stores = [
		'workspaces',
		'accounts',
		'categories',
		'transactions',
		'debts',
		'bills',
		'todos',
		'budgets',
		'settings'
	] as const;

	const newDefaultWsId = `ws-default:${newUserId}`;
	const db = await openDB();

	for (const storeName of stores) {
		const all = await getAll<any>(storeName);
		for (const record of all) {
			if (!record || typeof record !== 'object') continue;
			let modified = false;

			if (record.userId && record.userId !== newUserId) {
				record.userId = newUserId;
				modified = true;
			}

			if (record.workspaceId && typeof record.workspaceId === 'string' && record.workspaceId.startsWith('ws-default:')) {
				if (record.workspaceId !== newDefaultWsId) {
					record.workspaceId = newDefaultWsId;
					modified = true;
				}
			}

			if (storeName === 'workspaces' && typeof record.id === 'string' && record.id.startsWith('ws-default:')) {
				if (record.id !== newDefaultWsId) {
					const oldId = record.id;
					await new Promise<void>((res) => {
						const tx = db.transaction('workspaces', 'readwrite');
						tx.objectStore('workspaces').delete(oldId);
						tx.oncomplete = () => res();
						tx.onerror = () => res();
					});
					record.id = newDefaultWsId;
					modified = true;
				}
			}

			if (modified) {
				record.updatedAt = now();
				await put(storeName, record);
				track(storeName as any, 'upsert', record.id);
			}
		}
	}
}

/**
 * Pastikan user punya workspace default dan semua record lama sudah di-scope.
 * Aman dipanggil berulang. Dipanggil setelah auth.init (lokal) dan setelah sync pull.
 */
export async function ensureWorkspaceMigrated(
	userId: string,
	userName?: string
): Promise<Workspace> {
	await adoptOrphanData(userId);
	const ws = await ensureDefaultWorkspace(userId, userName);
	await backfillWorkspaceId(userId, ws.id);
	return ws;
}
