/** Registry ikon (key -> nama ikon Reicon). */
export const iconMap: Record<string, string> = {
	soup: 'fork-knife',
	car: 'car',
	'shopping-bag': 'bag-shopping',
	receipt: 'bill-list',
	heart: 'health',
	movie: 'video-frame-2',
	school: 'mortarboard-square',
	cash: 'money',
	'chart-line': 'graph',
	dots: 'gamepad-buttons',
	wallet: 'wallet',
	bank: 'bank',
	'credit-card': 'credit-card',
	coffee: 'coffee',
	cart: 'shopping-cart',
	bus: 'bus',
	plane: 'airplane',
	pill: 'pill',
	music: 'music-notes',
	book: 'mortarboard-square',
	'chart-bar': 'chart-pie',
	'chart-pie': 'chart-pie',
	building: 'buildings',
	home: 'home-smile',
	briefcase: 'briefcase',
	gift: 'gift',
	'piggy-bank': 'piggy-bank',
	coins: 'coins',
	tag: 'tag',
	coin: 'money'
};

export const iconKeys: string[] = Object.keys(iconMap);

/** Ambil nama ikon berdasarkan key; fallback ke 'more' bila tidak dikenal. */
export function getIcon(key?: string | null): string {
	if (key && iconMap[key]) return iconMap[key];
	return 'more';
}
