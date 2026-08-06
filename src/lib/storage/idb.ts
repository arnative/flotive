// IndexedDB core: open database + generic CRUD helpers.

const DB_NAME = 'flotive';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('users')) {
				db.createObjectStore('users', { keyPath: 'id' }).createIndex('email', 'email', {
					unique: true
				});
			}
			if (!db.objectStoreNames.contains('workspaces')) {
				db.createObjectStore('workspaces', { keyPath: 'id' }).createIndex('userId', 'userId');
			}
			if (!db.objectStoreNames.contains('accounts')) {
				db.createObjectStore('accounts', { keyPath: 'id' }).createIndex('userId', 'userId');
			}
			if (!db.objectStoreNames.contains('categories')) {
				db.createObjectStore('categories', { keyPath: 'id' }).createIndex('userId', 'userId');
			}
			if (!db.objectStoreNames.contains('transactions')) {
				const s = db.createObjectStore('transactions', { keyPath: 'id' });
				s.createIndex('userId', 'userId');
				s.createIndex('userId_date', ['userId', 'date']);
			}
			if (!db.objectStoreNames.contains('debts')) {
				const s = db.createObjectStore('debts', { keyPath: 'id' });
				s.createIndex('userId', 'userId');
				s.createIndex('userId_status', ['userId', 'status']);
			}
			if (!db.objectStoreNames.contains('bills')) {
				const s = db.createObjectStore('bills', { keyPath: 'id' });
				s.createIndex('userId', 'userId');
			}
			if (!db.objectStoreNames.contains('todos')) {
				const s = db.createObjectStore('todos', { keyPath: 'id' });
				s.createIndex('userId', 'userId');
				s.createIndex('userId_sort', ['userId', 'sortOrder']);
			}
			if (!db.objectStoreNames.contains('budgets')) {
				const s = db.createObjectStore('budgets', { keyPath: 'id' });
				s.createIndex('userId', 'userId');
			}

			if (!db.objectStoreNames.contains('settings')) {
				db.createObjectStore('settings', { keyPath: 'id' }).createIndex('userId', 'userId', {
					unique: true
				});
			}
			if (!db.objectStoreNames.contains('sync_state')) {
				db.createObjectStore('sync_state', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('sync_queue')) {
				db.createObjectStore('sync_queue', { keyPath: 'id' });
			}
		};
		req.onsuccess = async () => {
			const db = req.result;
			await checkAndMigrateOldDB(db);
			resolve(db);
		};
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

let migrationAttempted = false;

async function checkAndMigrateOldDB(newDB: IDBDatabase): Promise<void> {
	if (migrationAttempted || typeof window === 'undefined') return;
	migrationAttempted = true;
	try {
		if ('databases' in indexedDB) {
			const dbs = await indexedDB.databases();
			const oldExists = dbs.some((d) => d.name === 'floty');
			if (!oldExists) return;
		}
		const oldReq = indexedDB.open('floty');
		oldReq.onsuccess = async () => {
			const oldDB = oldReq.result;
			const stores = Array.from(oldDB.objectStoreNames);
			if (stores.length === 0) {
				oldDB.close();
				return;
			}
			for (const storeName of stores) {
				if (!newDB.objectStoreNames.contains(storeName)) continue;
				const tx = oldDB.transaction(storeName, 'readonly');
				const records: any[] = await new Promise((res) => {
					const r = tx.objectStore(storeName).getAll();
					r.onsuccess = () => res(r.result || []);
					r.onerror = () => res([]);
				});
				if (records.length > 0) {
					const writeTx = newDB.transaction(storeName, 'readwrite');
					const writeOs = writeTx.objectStore(storeName);
					for (const rec of records) writeOs.put(rec);
				}
			}
			oldDB.close();
		};
	} catch (err) {
		console.warn('Migration from floty IDB skipped:', err);
	}
}

export const now = () => Date.now();

export function genId(): string {
	const webCrypto = globalThis.crypto as
		(Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string }) | undefined;
	if (webCrypto?.randomUUID) return webCrypto.randomUUID();
	if (webCrypto) {
		const bytes = webCrypto.getRandomValues(new Uint8Array(16));
		return `id-${now().toString(36)}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
	}
	throw new Error('Web Crypto tidak tersedia.');
}

async function put<T>(store: string, value: T): Promise<T> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		tx.objectStore(store).put(value);
		tx.oncomplete = () => resolve(value);
		tx.onerror = () => reject(tx.error);
	});
}

async function get<T>(store: string, id: string): Promise<T | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const req = db.transaction(store, 'readonly').objectStore(store).get(id);
		req.onsuccess = () => resolve(req.result as T | undefined);
		req.onerror = () => reject(req.error);
	});
}

async function getAllByIndex<T>(store: string, index: string, query: IDBValidKey): Promise<T[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const req = db.transaction(store, 'readonly').objectStore(store).index(index).getAll(query);
		req.onsuccess = () => resolve(req.result as T[]);
		req.onerror = () => reject(req.error);
	});
}

async function getAll<T>(store: string): Promise<T[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const req = db.transaction(store, 'readonly').objectStore(store).getAll();
		req.onsuccess = () => resolve(req.result as T[]);
		req.onerror = () => reject(req.error);
	});
}

async function update<T extends { id: string; updatedAt: number }>(
	store: string,
	id: string,
	patch: Partial<T>
): Promise<T | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		let result: T | undefined;
		const tx = db.transaction(store, 'readwrite');
		const os = tx.objectStore(store);
		const r = os.get(id);
		r.onsuccess = () => {
			const v = r.result as T | undefined;
			if (v) {
				result = { ...v, ...patch, updatedAt: now() } as T;
				os.put(result);
			}
		};
		tx.oncomplete = () => resolve(result);
		tx.onerror = () => reject(tx.error);
	});
}

async function softDelete(store: string, id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(store, 'readwrite');
		const os = tx.objectStore(store);
		const r = os.get(id);
		r.onsuccess = () => {
			const v = r.result as { deletedAt?: number; updatedAt?: number } | undefined;
			if (v) {
				v.deletedAt = now();
				v.updatedAt = now();
				os.put(v);
			}
		};
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export { put, get, getAllByIndex, getAll, update, softDelete };
