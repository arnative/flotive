// Nominal disimpan sebagai integer sen (minor units) untuk akurasi.
// Layer ini mengonversi antara sen, angka desimal, dan tampilan terformat.

export const SUPPORTED_CURRENCIES = [
	'IDR',
	'USD',
	'EUR',
	'GBP',
	'JPY',
	'SGD',
	'AUD',
	'CNY'
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
	IDR: 'id-ID',
	USD: 'en-US',
	EUR: 'de-DE',
	GBP: 'en-GB',
	JPY: 'ja-JP',
	SGD: 'en-SG',
	AUD: 'en-AU',
	CNY: 'zh-CN'
};

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
	return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

const NO_DECIMAL = ['JPY', 'KRW', 'VND', 'CLP'];

export function localeFor(currency: string): string {
	return isSupportedCurrency(currency) ? LOCALE_BY_CURRENCY[currency] : 'en-US';
}

export function decimalsFor(currency: string): number {
	return NO_DECIMAL.includes(currency) ? 0 : 2;
}

export function currencySymbol(currency: string): string {
	try {
		const parts = new Intl.NumberFormat(localeFor(currency), {
			style: 'currency',
			currency
		}).formatToParts(0);
		return parts.find((p) => p.type === 'currency')?.value ?? currency;
	} catch {
		return currency;
	}
}

/** Sen → string mata uang penuh, mis. "Rp10.000,00". */
export function formatCurrency(cents: number, currency = 'IDR'): string {
	const d = decimalsFor(currency);
	try {
		return new Intl.NumberFormat(localeFor(currency), {
			style: 'currency',
			currency,
			minimumFractionDigits: d,
			maximumFractionDigits: d
		}).format(cents / 100);
	} catch {
		return `${currency} ${(cents / 100).toFixed(d)}`;
	}
}

/** Sen → string angka saja dengan pemisah, mis. "10.000". */
export function formatAmount(cents: number, currency = 'IDR'): string {
	const d = decimalsFor(currency);
	try {
		return new Intl.NumberFormat(localeFor(currency), {
			minimumFractionDigits: d,
			maximumFractionDigits: d
		}).format(cents / 100);
	} catch {
		return (cents / 100).toFixed(d);
	}
}

/** Format nilai sen (cents) ke string integer terformat dengan pemisah ribuan (mis. 5000000 sen -> "50.000"). */
export function formatInputInteger(cents: number, currency = 'IDR'): string {
	if (!cents) return '';
	const mainUnits = Math.trunc(Math.abs(cents) / 100);
	try {
		return new Intl.NumberFormat(localeFor(currency), { maximumFractionDigits: 0 }).format(
			mainUnits
		);
	} catch {
		return String(mainUnits);
	}
}

/** Format teks input langsung secara realtime (mis. "50000" -> "50.000"). */
export function formatLiveInput(input: string, currency = 'IDR'): string {
	if (!input) return '';
	const digits = input.replace(/\D/g, '');
	if (!digits) return '';
	const val = parseInt(digits, 10) || 0;
	if (val === 0) return '';
	try {
		return new Intl.NumberFormat(localeFor(currency), { maximumFractionDigits: 0 }).format(val);
	} catch {
		return String(val);
	}
}

/** Parse string bebas ("10.000" / "10.000,50" / "10,000.50" / "10000") → sen. */
export function parseToCents(input: string): number {
	if (!input) return 0;
	const raw = input.trim();
	const negative = /^-/.test(raw);
	const s = raw.replace(/[^0-9.,]/g, '');
	if (!s) return 0;
	const separator = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
	const fraction = separator >= 0 ? s.slice(separator + 1) : '';
	const hasDecimal = separator >= 0 && fraction.length > 0 && fraction.length <= 2;
	const intStr = (hasDecimal ? s.slice(0, separator) : s).replace(/[.,]/g, '');
	const fracStr = hasDecimal ? fraction : '';

	const intVal = parseInt(intStr || '0', 10) || 0;
	const fracVal = fracStr ? parseInt((fracStr + '00').slice(0, 2), 10) : 0;
	const cents = intVal * 100 + fracVal;
	return negative ? -cents : cents;
}

export function centsToDecimal(cents: number): number {
	return cents / 100;
}
