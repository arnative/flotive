import { json } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	clearSession(cookies);
	return json({ ok: true });
};
