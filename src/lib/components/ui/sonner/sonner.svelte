<script lang="ts">
	import { mode } from "mode-watcher";
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme={mode.current}
	class="toaster group"
	mobileOffset={{ bottom: '80px' }}
	style="--normal-bg: var(--color-card); --normal-text: var(--color-card-foreground); --normal-border: var(--color-border);"
	toastOptions={{
		classes: {
			toast: 'group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-medium p-3.5 flex items-center gap-2.5',
			title: 'text-sm font-semibold',
			description: 'text-xs text-muted-foreground mt-0.5 leading-normal',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90 text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 ml-auto cursor-pointer transition-colors',
			cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-lg ml-1 cursor-pointer'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-4" />
	{/snippet}
</Sonner>
