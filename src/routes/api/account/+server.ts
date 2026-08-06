import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { users } from '$lib/db/schema';
import { getDatabase } from '$lib/server/database';
import { publicUser } from '$lib/server/auth';
import { isRecord, readJson, requestErrorResponse, requireUser } from '$lib/server/request';
import { isSupportedCurrency } from '$lib/utils/currency';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async (event) => {
	const userId = await requireUser(event);
	if (userId instanceof Response) return userId;
	try {
		const input = await readJson<unknown>(event.request, 20_000);
		if (!isRecord(input)) return json({ error: 'Data akun tidak valid.' }, { status: 400 });
		const patch: Record<string, unknown> = {};
		if (input.name !== undefined) {
			if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) {
				return json({ error: 'Nama wajib diisi dan maksimal 100 karakter.' }, { status: 400 });
			}
			patch.name = input.name.trim();
		}
		if (input.defaultCurrency !== undefined) {
			if (!isSupportedCurrency(input.defaultCurrency)) {
				return json({ error: 'Mata uang tidak didukung.' }, { status: 400 });
			}
			patch.defaultCurrency = input.defaultCurrency;
		}
		if (input.onboardingDone !== undefined) {
			if (typeof input.onboardingDone !== 'boolean') {
				return json({ error: 'Status onboarding tidak valid.' }, { status: 400 });
			}
			patch.onboardingDone = input.onboardingDone;
		}
		if (!Object.keys(patch).length)
			return json({ error: 'Tidak ada perubahan yang valid.' }, { status: 400 });
		patch.updatedAt = Date.now();
		const { db } = getDatabase(event.platform?.env);
		const [user] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
		if (!user) return json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
		return json({ user: publicUser(user) });
	} catch (error) {
		const response = requestErrorResponse(error);
		if (response) return response;
		console.error(
			JSON.stringify({ message: 'account update failed', error: String(error), userId })
		);
		return json({ error: 'Gagal memperbarui akun.' }, { status: 500 });
	}
};
