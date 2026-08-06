// Theme logic — dark (default awal), light, system.
// Semua manipulasi DOM/localStorage di-guard agar aman saat SSR.

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'flotive-theme';

function prefersDark(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(t: Theme): ResolvedTheme {
	if (t === 'system') return prefersDark() ? 'dark' : 'light';
	return t;
}

let themeTransitionTimer: ReturnType<typeof setTimeout> | null = null;

export function applyTheme(t: Theme): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const dark = resolveTheme(t) === 'dark';
	const changing = root.classList.contains('dark') !== dark;

	const updateDOM = () => {
		root.classList.toggle('dark', dark);
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', dark ? '#202222' : '#f7f7f6');
	};

	if (!changing) {
		updateDOM();
		return;
	}

	// Gunakan View Transitions API (GPU hardware acceleration) agar transisi tema 60FPS tanpa jank DOM
	if (typeof document.startViewTransition === 'function') {
		document.startViewTransition(() => {
			updateDOM();
		});
	} else {
		root.classList.add('theme-transition');
		updateDOM();
		setTimeout(() => root.classList.remove('theme-transition'), 150);
	}
}

export function getStoredTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'dark';
	const t = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('floty-theme');
	return t === 'dark' || t === 'light' || t === 'system' ? t : 'dark';
}

export function setTheme(t: Theme): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, t);
	applyTheme(t);
}

export function toggleTheme(): void {
	const current = resolveTheme(getStoredTheme());
	setTheme(current === 'dark' ? 'light' : 'dark');
}

/** Pasang listener perubahan prefers-color-scheme; kembalikan fungsi cleanup. */
export function watchSystemTheme(onChange: (resolved: ResolvedTheme) => void): () => void {
	if (typeof window === 'undefined') return () => {};
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light');
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
}
