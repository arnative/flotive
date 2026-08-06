import { json } from '@sveltejs/kit';
import { users } from '$lib/db/schema';
import { ensureSchema, getDatabase } from '$lib/server/database';
import { assertSessionConfigured, hashPassword, publicUser, setSession } from '$lib/server/auth';
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
			typeof input.name !== 'string' ||
			(input.remember !== undefined && typeof input.remember !== 'boolean')
		) {
			return json({ error: 'Data pendaftaran tidak valid.' }, { status: 400 });
		}
		const email = input.email.trim().toLowerCase();
		const name = input.name.trim();
		const password = input.password;
		if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
			return json({ error: 'Format email tidak valid.' }, { status: 400 });
		}
		if (!name || name.length > 100)
			return json({ error: 'Nama wajib diisi dan maksimal 100 karakter.' }, { status: 400 });
		if (password.length < 8)
			return json({ error: 'Password minimal 8 karakter.' }, { status: 400 });
		if (password.length > 128)
			return json({ error: 'Password maksimal 128 karakter.' }, { status: 400 });

		const handle = getDatabase(platform?.env);
		const db = handle.db;
		await ensureSchema(handle);
		await assertSessionConfigured(platform?.env);

		const now = Date.now();
		const user = {
			id: crypto.randomUUID(),
			email,
			passwordHash: await hashPassword(password),
			name,
			defaultCurrency: 'IDR',
			storageMode: 'cloud' as const,
			onboardingDone: false,
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		const inserted = await db
			.insert(users)
			.values(user)
			.onConflictDoNothing({ target: users.email })
			.returning({ id: users.id });
		if (!inserted.length) return json({ error: 'Email sudah terdaftar.' }, { status: 409 });
		await setSession(cookies, user.id, input.remember ?? true, platform?.env);
		return json({ user: publicUser(user) }, { status: 201 });
	} catch (error) {
		const response = requestErrorResponse(error);
		if (response) return response;
		console.error(JSON.stringify({ message: 'register failed', error: String(error) }));
		return json({ error: 'Pendaftaran gagal. Silakan coba lagi.' }, { status: 500 });
	}
};
