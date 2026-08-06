import { put } from '$lib/storage';
import { initSync, stopSync } from '$lib/db/sync';
import { auth } from './store.svelte';
import type { PublicUser } from '$lib/db/schema';

export type AuthResult = { ok: true; user: PublicUser } | { ok: false; error: string };

function networkErrorMessage(error: unknown): string {
	const isAbort =
		(typeof DOMException !== 'undefined' &&
			error instanceof DOMException &&
			error.name === 'AbortError') ||
		(error instanceof Error && /abort/i.test(error.name));
	const msg = error instanceof Error ? error.message : '';
	const lower = msg.toLowerCase();
	if (
		error instanceof TypeError ||
		isAbort ||
		lower.includes('failed to fetch') ||
		lower.includes('networkerror') ||
		lower.includes('load failed')
	) {
		return 'Koneksi terputus atau aplikasi sedang memperbarui. Periksa internet Anda, lalu muat ulang halaman dan coba lagi.';
	}
	return error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.';
}

async function submitAuth(
	path: 'login' | 'register',
	input: Record<string, unknown>
): Promise<AuthResult> {
	try {
		const response = await fetch(`/api/auth/${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(input)
		});
		const result = (await response.json().catch(() => ({}))) as {
			user?: PublicUser;
			error?: string;
		};
		if (!response.ok || !result.user)
			return { ok: false, error: result.error ?? 'Autentikasi gagal.' };
		await put<PublicUser>('users', result.user);
		auth.setUser(result.user);
		await auth.initWorkspaces(result.user.id);
		await initSync(result.user.id);
		return { ok: true, user: result.user };
	} catch (error) {
		return { ok: false, error: networkErrorMessage(error) };
	}
}

export function register(input: {
	email: string;
	password: string;
	name: string;
}): Promise<AuthResult> {
	return submitAuth('register', input);
}

export function login(input: {
	email: string;
	password: string;
	remember?: boolean;
}): Promise<AuthResult> {
	return submitAuth('login', input);
}

export async function logout(): Promise<void> {
	const response = await fetch('/api/auth/logout', { method: 'POST' });
	if (!response.ok) throw new Error('Gagal keluar. Coba lagi.');
	stopSync();
	auth.logout();
}
