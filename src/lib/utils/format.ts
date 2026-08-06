const DEFAULT_LOCALE = 'id-ID';

function toDate(iso: string): Date | null {
	if (!iso) return null;
	const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
	return isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string, locale = DEFAULT_LOCALE): string {
	const d = toDate(iso);
	if (!d) return iso;
	return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
		d
	);
}

export function formatDateShort(iso: string, locale = DEFAULT_LOCALE): string {
	const d = toDate(iso);
	if (!d) return iso;
	return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(d);
}

export function formatMonthYear(iso: string, locale = DEFAULT_LOCALE): string {
	const d = toDate(iso);
	if (!d) return iso;
	return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
}

export function todayISO(): string {
	const d = new Date();
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
	return local.toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
	return iso.slice(0, 7); // yyyy-mm
}

export function isSameMonth(iso: string, ref: Date = new Date()): boolean {
	const d = toDate(iso);
	if (!d) return false;
	return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function relativeFromNow(iso: string, locale = DEFAULT_LOCALE): string {
	const d = toDate(iso);
	if (!d) return iso;
	const days = Math.round((d.getTime() - Date.now()) / 86400000);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	if (Math.abs(days) < 30) return rtf.format(days, 'day');
	return rtf.format(Math.round(days / 30), 'month');
}
