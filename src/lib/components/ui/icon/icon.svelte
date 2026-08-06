<script lang="ts">
	import { cn } from '$lib/utils';
	import { resolveIcon, type ReiconComponent } from './icon-map';

	interface Props {
		name: string;
		class?: string;
		weight?: 'regular' | 'fill';
	}

	let { name, class: customClass = '', weight = 'regular' }: Props = $props();

	let Component = $derived<ReiconComponent | undefined>(resolveIcon(name));
	let reiconWeight = $derived<'Outline' | 'Filled'>(weight === 'fill' ? 'Filled' : 'Outline');

	// Reicon SVG pakai width/height (bukan font-size seperti Phosphor).
	// Parse ukuran dari class Tailwind text-* untuk meneruskan ke prop `size`.
	const TAILWIND_SIZE: Record<string, string> = {
		'text-xs': '12',
		'text-sm': '14',
		'text-base': '16',
		'text-lg': '18',
		'text-xl': '20',
		'text-2xl': '24',
		'text-3xl': '30',
		'text-4xl': '36'
	};

	function resolveSize(cls: string): string {
		for (const [c, px] of Object.entries(TAILWIND_SIZE)) {
			if (cls.includes(c)) return px;
		}
		const m = cls.match(/text-\[([0-9.]+)(px|rem)\]/);
		if (m) {
			if (m[2] === 'rem') return String(parseFloat(m[1]) * 16);
			return m[1];
		}
		return '1.25rem';
	}

	let size = $derived(resolveSize(customClass));
</script>

{#if Component}
	<Component
		weight={reiconWeight}
		{size}
		class={cn(
			'inline-block align-middle leading-none transition-transform duration-150 ease-out select-none',
			customClass
		)}
	/>
{:else}
	<span
		class={cn('inline-block align-middle text-[1.25rem] leading-none select-none', customClass)}
		aria-hidden="true"
	></span>
{/if}
