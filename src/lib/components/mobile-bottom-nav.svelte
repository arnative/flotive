<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Icon } from '$lib/components/ui/icon';
	import { toast } from 'svelte-sonner';
	import type { Theme } from '$lib/theme';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';

	let {
		bottomNav = [],
		moreNav = [],
		pathname = '/',
		theme = 'dark',
		onselecttheme
	}: {
		bottomNav: { href: string; label: string; icon: string }[];
		moreNav: { href: string; label: string; icon: string }[];
		pathname?: string;
		theme?: Theme;
		onselecttheme?: (theme: Theme) => void;
	} = $props();

	function isActive(href: string): boolean {
		return href === '/' ? pathname === '/' : pathname.startsWith(href);
	}

	let isMoreActive = $derived(moreNav.some((item) => isActive(item.href)));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let deferredPrompt = $state<any>(null);
	let isStandalone = $state(false);

	onMount(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			Boolean((window.navigator as any).standalone);

		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e;
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
	});

	async function handleInstallApp() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const promptEvent = deferredPrompt || (window as any).deferredPwaPrompt;
		if (promptEvent) {
			promptEvent.prompt();
			const { outcome } = await promptEvent.userChoice;
			if (outcome === 'accepted') {
				toast.success('Aplikasi berhasil dipasang di layar utama');
			}
			deferredPrompt = null;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(window as any).deferredPwaPrompt = null;
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
			if (isIOS) {
				toast.info('Cara pasang di iPhone/iPad', {
					description: 'Ketuk tombol Bagikan (Share) di browser ➔ pilih "Tambahkan ke Layar Utama".'
				});
			} else {
				toast.info('Cara pasang di HP / Desktop', {
					description:
						'Buka menu browser (titik tiga) ➔ pilih "Install aplikasi" atau "Tambahkan ke Layar Utama".'
				});
			}
		}
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border/50 bg-card/95 pt-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden"
>
	{#each bottomNav as item (item.href)}
		{@const active = isActive(item.href)}
		<a
			href={item.href}
			data-sveltekit-preload-data="hover"
			class="group flex flex-1 flex-col items-center justify-center gap-1 text-center"
		>
			<div
				class="flex h-8 w-16 items-center justify-center rounded-full transition-all duration-200 {active
					? 'bg-secondary text-secondary-foreground shadow-xs'
					: 'text-muted-foreground group-hover:text-foreground'}"
			>
				<Icon
					name={item.icon}
					weight={active ? 'fill' : 'regular'}
					class="text-xl transition-transform duration-200 {active ? 'scale-105' : 'scale-100'}"
				/>
			</div>
			<span
				class="text-[0.72rem] leading-none transition-colors duration-200 {active
					? 'font-semibold text-secondary-foreground'
					: 'font-medium text-muted-foreground'}"
			>
				{item.label}
			</span>
		</a>
	{/each}

	<DropdownMenu>
		<DropdownMenuTrigger
			class="group flex flex-1 flex-col items-center justify-center gap-1 text-center outline-none"
			aria-label="Menu lainnya"
		>
			<div
				class="flex h-8 w-16 items-center justify-center rounded-full transition-all duration-200 {isMoreActive
					? 'bg-secondary text-secondary-foreground shadow-xs'
					: 'text-muted-foreground group-hover:text-foreground'}"
			>
				<Icon
					name="list"
					weight={isMoreActive ? 'fill' : 'regular'}
					class="text-xl transition-transform duration-200 {isMoreActive
						? 'scale-105'
						: 'scale-100'}"
				/>
			</div>
			<span
				class="text-[0.72rem] leading-none transition-colors duration-200 {isMoreActive
					? 'font-semibold text-secondary-foreground'
					: 'font-medium text-muted-foreground'}"
			>
				Lainnya
			</span>
		</DropdownMenuTrigger>
		<DropdownMenuContent
			align="end"
			side="top"
			class="mb-2 w-52 space-y-1 border border-border bg-card p-1.5 shadow-xl"
		>
			{#each moreNav as item (item.href)}
				{@const active = isActive(item.href)}
				<DropdownMenuItem
					onclick={() => goto(item.href)}
					class="cursor-pointer gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors {active
						? 'bg-secondary font-semibold text-secondary-foreground'
						: 'text-foreground hover:bg-muted'}"
				>
					<Icon
						name={item.icon}
						weight={active ? 'fill' : 'regular'}
						class="text-base {active ? 'text-secondary-foreground' : 'text-muted-foreground/60'}"
					/>
					<span>{item.label}</span>
				</DropdownMenuItem>
			{/each}

			{#if !isStandalone}
				<DropdownMenuItem
					onclick={handleInstallApp}
					class="cursor-pointer gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
				>
					<Icon name="upload-3" class="text-base text-muted-foreground/60" />
					<span>Install Aplikasi</span>
				</DropdownMenuItem>
			{/if}

			<DropdownMenuSeparator class="-mx-1.5 my-1.5" />

			<div class="px-1 py-1">
				<div
					class="mb-1.5 px-1 text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase"
				>
					Tema Tampilan
				</div>
				<div class="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1">
					<button
						type="button"
						onclick={() => onselecttheme?.('light')}
						class="flex items-center justify-center rounded-md py-1.5 text-xs transition-all {theme ===
						'light'
							? 'border border-border/50 bg-card font-medium text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						title="Tema Terang"
						aria-label="Tema Terang"
					>
						<Icon name="sun" class="text-sm" />
					</button>

					<button
						type="button"
						onclick={() => onselecttheme?.('dark')}
						class="flex items-center justify-center rounded-md py-1.5 text-xs transition-all {theme ===
						'dark'
							? 'border border-border/50 bg-card font-medium text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						title="Tema Gelap"
						aria-label="Tema Gelap"
					>
						<Icon name="moon" class="text-sm" />
					</button>

					<button
						type="button"
						onclick={() => onselecttheme?.('system')}
						class="flex items-center justify-center rounded-md py-1.5 text-xs transition-all {theme ===
						'system'
							? 'border border-border/50 bg-card font-medium text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						title="Tema Sistem"
						aria-label="Tema Sistem"
					>
						<Icon name="mobile" class="text-sm" />
					</button>
				</div>
			</div>
		</DropdownMenuContent>
	</DropdownMenu>
</nav>
