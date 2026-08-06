import { json } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from '$lib/db/schema';
import { ensureSchema, getDatabase } from '$lib/server/database';
import { hashPassword, publicUser, setSession, verifyPassword } from '$lib/server/auth';
import { isRecord, readJson, requestErrorResponse } from '$lib/server/request';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { request, cookies, platform } = event;
	try {
		const input = await readJson<unknown>(request, 20_000);
		if (
			!isRecord(input) ||
			typeof input.email !== 'string' ||
			typeof input.password !== 'string' ||
			(input.remember !== undefined && typeof input.remember !== 'boolean') ||
			input.email.length > 254 ||
			input.password.length < 1 ||
			input.password.length > 128
		) {
			return json({ error: 'Email atau password tidak valid.' }, { status: 400 });
		}
		const email = input.email.trim().toLowerCase();
		if (!/^\S+@\S+\.\S+$/.test(email)) {
			return json({ error: 'Email atau password tidak valid.' }, { status: 400 });
		}
		const handle = getDatabase(platform?.env);
		const db = handle.db;
		await ensureSchema(handle);
		let [user] = await db
			.select()
			.from(users)
			.where(and(eq(users.email, email), isNull(users.deletedAt)))
			.limit(1);

		if (user) {
			if (!(await verifyPassword(input.password, user.passwordHash))) {
				return json({ error: 'Email atau password salah.' }, { status: 401 });
			}
			if (!user.passwordHash.startsWith('pbkdf2-sha256$')) {
				user.passwordHash = await hashPassword(input.password);
				await db
					.update(users)
					.set({ passwordHash: user.passwordHash, updatedAt: Date.now() })
					.where(eq(users.id, user.id));
			}
		} else {
			// Auto-provision user di D1 jika belum ada (misal setelah migrasi/reset D1)
			const now = Date.now();
			const newUser = {
				id: crypto.randomUUID(),
				email,
				passwordHash: await hashPassword(input.password),
				name: email.split('@')[0],
				defaultCurrency: 'IDR',
				storageMode: 'cloud' as const,
				onboardingDone: true,
				createdAt: now,
				updatedAt: now,
				deletedAt: null
			};
			await db.insert(users).values(newUser).onConflictDoNothing({ target: users.email });
			user = newUser;
		}

		await setSession(cookies, user.id, input.remember ?? true, platform?.env);
		return json({ user: publicUser(user) });
	} catch (error) {
		const response = requestErrorResponse(error);
		if (response) return response;
		console.error(JSON.stringify({ message: 'login failed', error: String(error) }));
		return json({ error: 'Login gagal. Silakan coba lagi.' }, { status: 500 });
	}
};
