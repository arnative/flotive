import { json } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from '$lib/db/schema';
import { clearSession, getSessionUserId, publicUser } from '$lib/server/auth';
import { getDatabase } from '$lib/server/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { cookies, platform } = event;
	try {
		const userId = await getSessionUserId(cookies, platform?.env);
		if (!userId) {
			clearSession(cookies);
			return json({ user: null }, { status: 401 });
		}
		const { db } = getDatabase(platform?.env);
		const [user] = await db
			.select()
			.from(users)
			.where(and(eq(users.id, userId), isNull(users.deletedAt)))
			.limit(1);
		if (!user) {
			clearSession(cookies);
			return json({ user: null }, { status: 401 });
		}
		return json({ user: publicUser(user) });
	} catch (error) {
		console.error(JSON.stringify({ message: 'session lookup failed', error: String(error) }));
		return json({ user: null }, { status: 503 });
	}
};
