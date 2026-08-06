import type { CategoryKind } from '$lib/db/schema';

export interface DefaultCategory {
	name: string;
	icon: string; // key di registry ikon (src/lib/data/icons.ts)
	kind: CategoryKind;
}

// 10 kategori default sesuai TODO.md (tidak bisa dihapus, bisa diubah nama/icon).
export const defaultCategories: DefaultCategory[] = [
	{ name: 'Makanan & Minuman', icon: 'fork-knife', kind: 'expense' },
	{ name: 'Transportasi', icon: 'car', kind: 'expense' },
	{ name: 'Belanja', icon: 'bag-shopping', kind: 'expense' },
	{ name: 'Tagihan', icon: 'bill-list', kind: 'expense' },
	{ name: 'Kesehatan', icon: 'health', kind: 'expense' },
	{ name: 'Hiburan', icon: 'movie', kind: 'expense' },
	{ name: 'Pendidikan', icon: 'mortarboard-square', kind: 'expense' },
	{ name: 'Gaji', icon: 'cash', kind: 'income' },
	{ name: 'Investasi', icon: 'graph', kind: 'both' },
	{ name: 'Lainnya', icon: 'dots', kind: 'both' }
];
