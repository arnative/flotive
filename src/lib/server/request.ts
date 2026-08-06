import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from '$lib/db/schema';
import { clearSession, getSessionUserId } from './auth';
import { getDatabase } from './database';

export class RequestError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requestErrorResponse(error: unknown): Response | null {
	return error instanceof RequestError
		? json({ error: error.message }, { status: error.status })
		: null;
}

export async function requireUser(event: RequestEvent): Promise<string | Response> {
	try {
		const userId = await getSessionUserId(event.cookies, event.platform?.env);
		if (!userId) {
			clearSession(event.cookies);
			return json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 });
		}
		const { db } = getDatabase(event.platform?.env);
		const [user] = await db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.id, userId), isNull(users.deletedAt)))
			.limit(1);
		if (user) return userId;
		clearSession(event.cookies);
		return json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 });
	} catch (error) {
		console.error(JSON.stringify({ message: 'session validation failed', error: String(error) }));
		return json({ error: 'Layanan autentikasi sedang tidak tersedia.' }, { status: 503 });
	}
}

export async function readJson<T>(request: Request, maxBytes = 1_000_000): Promise<T> {
	const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
	if (mediaType !== 'application/json' && !mediaType?.endsWith('+json')) {
		throw new RequestError('Content-Type harus application/json.', 415);
	}
	const rawLength = request.headers.get('content-length');
	if (rawLength) {
		const length = Number(rawLength);
		if (!Number.isSafeInteger(length) || length < 0)
			throw new RequestError('Content-Length tidak valid.', 400);
		if (length > maxBytes) throw new RequestError('Payload terlalu besar.', 413);
	}
	if (!request.body) throw new RequestError('Body JSON wajib diisi.', 400);

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			throw new RequestError('Payload terlalu besar.', 413);
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return JSON.parse(new TextDecoder().decode(bytes)) as T;
	} catch {
		throw new RequestError('Body JSON tidak valid.', 400);
	}
}
