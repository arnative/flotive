import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import type { PublicUser, User } from '$lib/db/schema';

const COOKIE = 'flotive-session';
const SESSION_AGE = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
	let difference = a.length ^ b.length;
	for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
	return difference === 0;
}

async function sessionKey(platformEnv?: Record<string, any>): Promise<CryptoKey> {
	const secret =
		env.SESSION_SECRET ||
		platformEnv?.SESSION_SECRET ||
		(typeof process !== 'undefined' ? process.env?.SESSION_SECRET : undefined);
	if (!secret || secret.length < 32) {
		throw new Error('SESSION_SECRET minimal 32 karakter belum dikonfigurasi.');
	}
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

export async function assertSessionConfigured(platformEnv?: Record<string, any>): Promise<void> {
	await sessionKey(platformEnv);
}

export async function setSession(
	cookies: Cookies,
	userId: string,
	remember = true,
	platformEnv?: Record<string, any>
): Promise<void> {
	const payload = bytesToBase64(
		encoder.encode(JSON.stringify({ userId, expiresAt: Date.now() + SESSION_AGE * 1000 }))
	);
	const signature = bytesToBase64(
		new Uint8Array(
			await crypto.subtle.sign('HMAC', await sessionKey(platformEnv), encoder.encode(payload))
		)
	);
	cookies.set(COOKIE, `${payload}.${signature}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: remember ? SESSION_AGE : undefined
	});
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: '/' });
}

export async function getSessionUserId(
	cookies: Cookies,
	platformEnv?: Record<string, any>
): Promise<string | null> {
	const token = cookies.get(COOKIE);
	if (!token) return null;
	const [payload, signature] = token.split('.');
	if (!payload || !signature) return null;
	const key = await sessionKey(platformEnv);
	try {
		const valid = await crypto.subtle.verify(
			'HMAC',
			key,
			base64ToBytes(signature),
			encoder.encode(payload)
		);
		if (!valid) return null;
		const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(payload))) as {
			userId?: string;
			expiresAt?: number;
		};
		return parsed.userId && parsed.expiresAt && parsed.expiresAt > Date.now()
			? parsed.userId
			: null;
	} catch {
		return null;
	}
}

export function publicUser(user: User): PublicUser {
	const { passwordHash: _, ...publicFields } = user;
	return publicFields;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const iterations = 100_000;
	const hash = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		key,
		256
	);
	return `pbkdf2-sha256$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(hash))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	if (!stored.startsWith('pbkdf2-sha256$')) {
		const legacy = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(password)));
		return equalBytes(
			legacy,
			Uint8Array.from(stored.match(/.{2}/g) ?? [], (x) => parseInt(x, 16))
		);
	}
	const [, rawIterations, rawSalt, rawHash] = stored.split('$');
	const iterations = Number(rawIterations);
	if (
		!Number.isSafeInteger(iterations) ||
		iterations < 10_000 ||
		iterations > 1_000_000 ||
		!rawSalt ||
		!rawHash
	)
		return false;
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const actual = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(rawSalt), iterations },
		key,
		256
	);
	return equalBytes(new Uint8Array(actual), base64ToBytes(rawHash));
}
