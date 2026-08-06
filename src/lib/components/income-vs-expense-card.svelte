<script lang="ts">
	import { formatAmount } from '$lib/utils/currency';
	import { cn } from '$lib/utils';
	import PanelCard from '$lib/components/panel-card.svelte';

	let {
		monthly = [],
		currency = 'IDR',
		class: className
	}: {
		monthly: { label: string; income: number; expense: number }[];
		currency?: string;
		class?: string;
	} = $props();

	// Income vs Expense — period filter
	let period = $state<'1d' | '7d' | '30d' | '90d'>('30d');

	const periods: { id: '1d' | '7d' | '30d' | '90d'; label: string }[] = [
		{ id: '1d', label: '1H' },
		{ id: '7d', label: '7H' },
		{ id: '30d', label: '30H' },
		{ id: '90d', label: '90H' }
	];

	let barData = $derived(period === '1d' ? monthly.slice(-1) : monthly);

	let totalIncome = $derived(barData.reduce((s, m) => s + m.income, 0));
	let totalExpense = $derived(barData.reduce((s, m) => s + m.expense, 0));
	let maxVal = $derived(Math.max(1, ...barData.map((m) => Math.max(m.income, m.expense))));

	let legend = $derived([
		{ name: 'Pemasukan', value: totalIncome, color: 'var(--color-success)' },
		{ name: 'Pengeluaran', value: totalExpense, color: 'var(--color-destructive)' }
	]);

	let hoverIndex = $state<number | null>(null);

	const PLOT_TOP = 8;
	const PLOT_BOT = 92;

	function xf(i: number): number {
		const n = barData.length;
		return n === 1 ? 50 : (i / (n - 1)) * 100;
	}

	function yf(v: number): number {
		return PLOT_TOP + (PLOT_BOT - PLOT_TOP) * (1 - v / maxVal);
	}

	function smoothPath(key: 'income' | 'expense'): string {
		const pts = barData.map((m, i) => ({ x: xf(i), y: yf(m[key]) }));
		if (pts.length === 0) return '';
		if (pts.length === 1) return `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
		let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] ?? pts[i];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[i + 2] ?? p2;
			const c1x = p1.x + (p2.x - p0.x) / 6;
			const c1y = p1.y + (p2.y - p0.y) / 6;
			const c2x = p2.x - (p3.x - p1.x) / 6;
			const c2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
		}
		return d;
	}

	function areaPath(key: 'income' | 'expense'): string {
		const n = barData.length;
		const line = smoothPath(key);
		if (n < 2) return '';
		return `${line} L ${xf(n - 1).toFixed(2)},${PLOT_BOT} L ${xf(0).toFixed(2)},${PLOT_BOT} Z`;
	}

	let incomeLine = $derived(smoothPath('income'));
	let expenseLine = $derived(smoothPath('expense'));
	let incomeArea = $derived(areaPath('income'));
	let expenseArea = $derived(areaPath('expense'));

	// Gridlines horisontal (4 level) — y dalam koordinat viewBox
	let gridLines = $derived(['0.25', '0.5', '0.75', '1'].map((f) => yf(maxVal * parseFloat(f))));

	function handleMove(e: PointerEvent, el: SVGSVGElement) {
		const n = barData.length;
		if (n <= 1) return;
		const rect = el.getBoundingClientRect();
		const frac = ((e.clientX - rect.left) / rect.width) * 100;
		const pos = Math.max(0, Math.min(n - 1, Math.round((frac / 100) * (n - 1))));
		hoverIndex = pos;
	}
</script>

<PanelCard
	title="Ringkasan"
	class={cn('h-full', className)}
	bodyClass="bg-background p-4 flex flex-col"
>
	{#snippet action()}
		<div class="flex items-center gap-1 rounded-lg border border-input bg-card p-1">
			{#each periods as p (p.id)}
				<button
					type="button"
					onclick={() => (period = p.id)}
					class={cn(
						'rounded-md px-2 py-1 text-[0.65rem] font-medium transition-colors',
						period === p.id
							? 'bg-secondary text-secondary-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					{p.label}
				</button>
			{/each}
		</div>
	{/snippet}

	<!-- Legend (gaya Kumo LargeItem) -->
	<div class="mt-1 flex divide-x divide-border border-b border-border pb-3">
		{#each legend as l (l.name)}
			<div class="min-w-0 flex-1 px-3 first:pl-0">
				<div class="flex items-center gap-1.5">
					<span class="size-2 rounded-sm" style="background:{l.color}"></span>
					<span class="truncate text-[0.7rem] font-medium text-muted-foreground">{l.name}</span>
				</div>
				<div class="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums">
					{formatAmount(l.value, currency)}
				</div>
			</div>
		{/each}
	</div>

	<!-- Wrapper chart untuk crosshair & tooltip -->
	<div class="relative mt-3">
		<!-- Tooltip -->
		{#if hoverIndex !== null}
			<div
				class="pointer-events-none absolute -top-1 z-10 min-w-[8rem] -translate-x-1/2 rounded-lg border border-border bg-card p-2 text-xs shadow-sm"
				style="left:{xf(hoverIndex)}%"
			>
				<div class="mb-1 font-medium text-foreground">{barData[hoverIndex].label}</div>
				{#each legend as l (l.name)}
					<div class="flex items-center gap-1.5">
						<span class="size-1.5 rounded-full" style="background:{l.color}"></span>
						<span class="flex-1 text-muted-foreground">{l.name}</span>
						<span class="font-semibold tabular-nums">
							{formatAmount(
								l.name === 'Pemasukan' ? barData[hoverIndex].income : barData[hoverIndex].expense,
								currency
							)}
						</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- SVG chart -->
		<svg
			viewBox="0 0 100 100"
			class="h-36 w-full"
			preserveAspectRatio="none"
			role="img"
			aria-label="Grafik pemasukan dan pengeluaran"
			onpointermove={(e) => handleMove(e, e.currentTarget)}
			onpointerleave={() => (hoverIndex = null)}
		>
			<!-- Gridlines -->
			{#each gridLines as g (g)}
				<line
					x1="0"
					x2="100"
					y1={g}
					y2={g}
					stroke="var(--color-border)"
					stroke-width="0.4"
					vector-effect="non-scaling-stroke"
				/>
			{/each}

			<!-- Defs gradient -->
			<defs>
				<linearGradient id="grad-success" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--color-success)" stop-opacity="0.25" />
					<stop offset="100%" stop-color="var(--color-success)" stop-opacity="0" />
				</linearGradient>
				<linearGradient id="grad-destructive" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--color-destructive)" stop-opacity="0.25" />
					<stop offset="100%" stop-color="var(--color-destructive)" stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Area gradient -->
			{#if incomeArea}
				<path d={incomeArea} fill="url(#grad-success)" />
				<path d={expenseArea} fill="url(#grad-destructive)" />
			{/if}

			<!-- Garis series -->
			<path
				d={expenseLine}
				fill="none"
				stroke="var(--color-destructive)"
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d={incomeLine}
				fill="none"
				stroke="var(--color-success)"
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			<!-- Titik hover -->
			{#if hoverIndex !== null && barData.length > 1}
				<line
					x1={xf(hoverIndex)}
					x2={xf(hoverIndex)}
					y1="0"
					y2="100"
					class="stroke-muted-foreground/40"
					stroke-width="0.5"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		</svg>

		<!-- Label sumbu X -->
		<div class="mt-1 flex justify-between text-[0.6rem] text-muted-foreground">
			<span>{barData[0]?.label ?? ''}</span>
			<span>{barData[Math.floor((barData.length - 1) / 2)]?.label ?? ''}</span>
			<span>{barData[barData.length - 1]?.label ?? ''}</span>
		</div>
	</div>
</PanelCard>
