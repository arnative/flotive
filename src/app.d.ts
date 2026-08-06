// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface D1Database {
		prepare(query: string): {
			bind(...values: any[]): any;
			first<T = unknown>(colName?: string): Promise<T | null>;
			run<T = Record<string, unknown>>(): Promise<{ success: boolean; meta: any; results?: T[] }>;
			all<T = Record<string, unknown>>(): Promise<{ success: boolean; meta: any; results: T[] }>;
			raw<T = unknown[]>(): Promise<T[]>;
		};
		dump(): Promise<ArrayBuffer>;
		batch<T = Record<string, unknown>>(statements: any[]): Promise<Array<{ success: boolean; meta: any; results?: T[] }>>;
		exec(query: string): Promise<{ count: number; duration: number }>;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				DB?: D1Database;
				[key: string]: any;
			};
			cf?: Record<string, any>;
			ctx?: {
				waitUntil(promise: Promise<any>): void;
			};
		}
	}
}

export {};
