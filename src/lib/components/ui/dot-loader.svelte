<script lang="ts">
	import { onMount } from 'svelte';

	let {
		label = 'Memuat',
		size = 'md',
		class: className = ''
	}: {
		label?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	// Sequence titik berputar (CLI braille dots)
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let frameIndex = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			frameIndex = (frameIndex + 1) % frames.length;
		}, 85);
		return () => clearInterval(interval);
	});

	const textSize = $derived(
		size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'
	);
</script>

<div class="inline-flex items-center gap-2 font-mono select-none {className}">
	<span class="inline-block w-4 text-center font-medium text-primary font-mono transition-none {textSize}">
		{frames[frameIndex]}
	</span>
	{#if label}
		<span class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
	{/if}
</div>
