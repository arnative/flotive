<script lang="ts">
	import { getStoredTheme, setTheme, type Theme } from '$lib/theme';
	import { Select, SelectTrigger, SelectContent, SelectItem } from '$lib/components/ui/select';
	import { Icon } from '$lib/components/ui/icon';
	import { toast } from 'svelte-sonner';

	let theme = $state<Theme>(getStoredTheme());

	const themeOptions: { value: Theme; label: string; icon: string }[] = [
		{ value: 'light', label: 'Terang', icon: 'sun' },
		{ value: 'dark', label: 'Gelap', icon: 'moon' },
		{ value: 'system', label: 'Ikuti Perangkat', icon: 'desktop' }
	];

	let currentIcon = $derived(themeOptions.find((o) => o.value === theme)?.icon ?? 'monitor');
	let currentLabel = $derived(
		themeOptions.find((o) => o.value === theme)?.label ?? 'Ikuti Perangkat'
	);

	function handleThemeChange(v: string | undefined) {
		if (!v) return;
		const selected = v as Theme;
		theme = selected;
		setTheme(selected);
		const label = themeOptions.find((o) => o.value === selected)?.label ?? selected;
		toast.success(`Tampilan diubah ke ${label}`);
	}
</script>

<div class="max-w-xs">
	<Select type="single" value={theme} onValueChange={handleThemeChange}>
		<SelectTrigger class="w-full cursor-pointer">
			<div class="flex items-center gap-2">
				<Icon name={currentIcon} class="text-base text-muted-foreground" />
				<span>{currentLabel}</span>
			</div>
		</SelectTrigger>
		<SelectContent>
			{#each themeOptions as opt (opt.value)}
				<SelectItem value={opt.value} label={opt.label} class="cursor-pointer">
					<div class="flex items-center gap-2">
						<Icon name={opt.icon} class="text-base text-muted-foreground" />
						<span>{opt.label}</span>
					</div>
				</SelectItem>
			{/each}
		</SelectContent>
	</Select>
</div>
