declare module 'virtual:pwa-register' {
	export interface RegisterSWOptions {
		immediate?: boolean;
		onNeedRefresh?: () => void;
		onOfflineReady?: () => void;
		onRegisteredSW?: (url: string, registration?: ServiceWorkerRegistration) => void;
		onRegisterError?: (error: unknown) => void;
	}
	export function registerSW(options?: RegisterSWOptions): () => void;
}
