import { browser } from '$app/environment';
import type { PublicUser, Workspace } from '$lib/db/schema';
import { put } from '$lib/storage';
import { listWorkspaces, ensureWorkspaceMigrated } from '$lib/storage/workspaces';

const ACTIVE_WS_KEY = 'flotive-active-workspace';

function activeWorkspaceKey(userId: string): string {
	return `${ACTIVE_WS_KEY}:${userId}`;
}

/** State autentikasi reaktif (runes). Akses: `auth.user`, `auth.isAuthenticated`. */
class AuthStore {
	user = $state<PublicUser | null>(null);
	loading = $state(true);
	workspaces = $state<Workspace[]>([]);
	activeWorkspaceId = $state<string | null>(null);

	get isAuthenticated(): boolean {
		return this.user !== null;
	}

	get needsOnboarding(): boolean {
		return this.user !== null && !this.user.onboardingDone;
	}

	get activeWorkspace(): Workspace | undefined {
		return this.workspaces.find((w) => w.id === this.activeWorkspaceId);
	}

	setUser(user: PublicUser | null): void {
		this.user = user;
	}

	setWorkspaces(list: Workspace[]): void {
		this.workspaces = list;
	}

	setActiveWorkspace(id: string): void {
		this.activeWorkspaceId = id;
		if (browser && this.user) {
			localStorage.setItem(activeWorkspaceKey(this.user.id), id);
			window.dispatchEvent(new CustomEvent('Flotive:workspace-changed'));
		}
	}

	async initWorkspaces(userId: string): Promise<void> {
		const ws = await ensureWorkspaceMigrated(userId, this.user?.name);
		const stored =
			localStorage.getItem(activeWorkspaceKey(userId)) ??
			localStorage.getItem(`floty-active-workspace:${userId}`) ??
			localStorage.getItem(ACTIVE_WS_KEY) ??
			localStorage.getItem('floty-active-workspace');
		await this.refreshWorkspaces(userId);
		this.activeWorkspaceId =
			stored && this.workspaces.some((w) => w.id === stored) ? stored : ws.id;
		localStorage.setItem(activeWorkspaceKey(userId), this.activeWorkspaceId);
	}

	async refreshWorkspaces(userId: string): Promise<void> {
		this.workspaces = await listWorkspaces(userId);
		if (!this.workspaces.some((w) => w.id === this.activeWorkspaceId)) {
			this.activeWorkspaceId = this.workspaces[0]?.id ?? null;
			if (browser && this.activeWorkspaceId && this.user) {
				localStorage.setItem(activeWorkspaceKey(this.user.id), this.activeWorkspaceId);
			}
		}
	}

	/** Muat sesi HttpOnly dari server dan hydrate profil + workspace ke IndexedDB. */
	async init(): Promise<void> {
		if (!browser) {
			this.loading = false;
			return;
		}
		try {
			const response = await fetch('/api/auth/session');
			if (response.ok) {
				const { user } = (await response.json()) as { user: PublicUser | null };
				if (user) {
					await put<PublicUser>('users', user);
					this.user = user;
				}
			}
		} catch {
			this.user = null;
		}
		this.loading = false;
	}

	logout(): void {
		this.setUser(null);
		this.workspaces = [];
		this.activeWorkspaceId = null;
		// Keep the per-user preference so the same workspace is restored after login.
		if (browser) localStorage.removeItem(ACTIVE_WS_KEY);
	}
}

export const auth = new AuthStore();
