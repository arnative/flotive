<script lang="ts">
	import { goto } from '$app/navigation';
	import WorkspaceSwitcher from '$lib/components/workspace-switcher.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icon } from '$lib/components/ui/icon';
	import type { Theme } from '$lib/theme';
	import Logo from '$lib/components/logo.svelte';
	import logoIcon from '$lib/assets/logo-icon.svg';

	let {
		collapsed = $bindable(false),
		navGroups = [],
		pathname = '/',
		user = null,
		initials = '',
		theme = 'system',
		ontogglesidebar,
		ontoggletheme,
		onnewtransaction,
		onlogout
	}: {
		collapsed?: boolean;
		navGroups: { label: string; items: { href: string; label: string; icon: string }[] }[];
		pathname?: string;
		user?: { name?: string | null; email?: string | null } | null;
		initials?: string;
		theme?: Theme;
		ontogglesidebar: () => void;
		ontoggletheme: () => void;
		onnewtransaction: () => void;
		onlogout: () => void;
	} = $props();

	function isActive(href: string): boolean {
		return href === '/' ? pathname === '/' : pathname.startsWith(href);
	}
</script>

<aside
	class="hidden md:flex {collapsed
		? 'md:w-[68px]'
		: 'md:w-[240px]'} shrink-0 flex-col justify-between rounded-2xl border border-border bg-card/40 transition-all duration-300 select-none md:h-full"
>
	<div class="flex min-h-0 flex-col">
		<!-- Header: Logo + Toggle -->
		<div
			class="flex h-14 items-center {collapsed
				? 'group/header relative justify-center'
				: 'justify-between px-4'}"
		>
			{#if collapsed}
				<div class="relative flex size-9 items-center justify-center">
					<img
						src={logoIcon}
						alt="Flotive"
						class="size-6 object-contain transition-opacity duration-200 group-hover/header:opacity-0"
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={ontogglesidebar}
						aria-label="Expand Sidebar"
						class="absolute inset-0 size-9 p-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/header:opacity-100 hover:text-foreground"
					>
						<Icon name="sidebar-2" class="text-2xl" />
					</Button>
				</div>
			{:else}
				<div class="flex items-center">
					<Logo class="h-5 w-auto text-foreground" />
				</div>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={ontogglesidebar}
					aria-label="Collapse Sidebar"
					class="text-muted-foreground hover:text-foreground"
				>
					<Icon name="sidebar-2" class="text-2xl" />
				</Button>
			{/if}
		</div>

		<!-- Menu + Navigation -->
		<div class="flex flex-col gap-3 overflow-y-auto {collapsed ? 'px-2 py-3' : 'p-3'}">
			<WorkspaceSwitcher {collapsed} />

			{#if collapsed}
				<Button
					variant="outline"
					size="icon-lg"
					onclick={onnewtransaction}
					title="Transaksi Baru"
					class="w-full"
				>
					<Icon name="plus" class="text-lg text-secondary-foreground" />
				</Button>
			{:else}
				<Button variant="outline" size="lg" onclick={onnewtransaction} class="w-full justify-start">
					<Icon name="plus" class="shrink-0 text-base text-secondary-foreground" />
					<span>Transaksi Baru</span>
				</Button>
			{/if}

			{#each navGroups as group (group.label)}
				<div class="flex flex-col gap-1">
					{#if !collapsed && group.label}
						<span
							class="px-2 text-[0.65rem] font-semibold tracking-wider text-muted-foreground/70 uppercase"
							>{group.label}</span
						>
					{/if}
					<nav class="flex flex-col gap-0.5">
						{#each group.items as item (item.href)}
							{@const active = isActive(item.href)}
							<a
								href={item.href}
								title={collapsed ? item.label : undefined}
								data-sveltekit-preload-data="hover"
								class="flex items-center {collapsed
									? 'justify-center px-0 py-2.5'
									: 'gap-3 px-3 py-2'} rounded-lg border border-transparent text-sm font-medium transition-all duration-200 ease-out {active
									? 'bg-secondary text-secondary-foreground shadow-xs'
									: 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}"
							>
								<Icon
									name={item.icon}
									weight={active ? 'fill' : 'regular'}
									class="shrink-0 text-xl {active
										? 'scale-110'
										: 'scale-100 text-muted-foreground/60'}"
								/>
								{#if !collapsed}
									<span>{item.label}</span>
								{/if}
							</a>
						{/each}
					</nav>
				</div>
			{/each}
		</div>
	</div>

	<!-- Footer: Profile Card -->
	<div class={collapsed ? 'p-2' : 'p-3'}>
		{#if !collapsed}
			<div class="space-y-1.5 rounded-xl border border-border bg-muted/30 p-2">
				<!-- Profile row -->
				<div class="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
					<div
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20 select-none"
					>
						{initials}
					</div>
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium text-foreground">
							{user?.name || 'User'}
						</div>
						<div class="truncate text-[0.65rem] text-muted-foreground">
							{user?.email ?? ''}
						</div>
					</div>
				</div>

				<!-- Action row -->
				<div class="flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={ontoggletheme}
						aria-label="Ganti tema"
						class="size-7 flex-1 p-0 text-muted-foreground hover:bg-muted hover:text-secondary-foreground"
					>
						{#if theme === 'light'}
							<Icon name="sun" class="text-base" />
						{:else if theme === 'dark'}
							<Icon name="moon" class="text-base" />
						{:else}
							<Icon name="monitor" class="text-base" />
						{/if}
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={() => goto('/settings')}
						aria-label="Pengaturan"
						class="size-7 flex-1 p-0 text-muted-foreground hover:bg-muted hover:text-secondary-foreground"
					>
						<Icon name="gear" class="text-base" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={onlogout}
						aria-label="Keluar"
						class="size-7 flex-1 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
					>
						<Icon name="logout-4" class="text-base" />
					</Button>
				</div>
			</div>
		{:else}
			<div class="flex flex-col items-center gap-1.5 py-1">
				<Button
					variant="ghost"
					size="icon"
					onclick={() => goto('/settings')}
					title="Profil ({user?.name || 'User'})"
					class="size-9 rounded-lg text-muted-foreground hover:text-foreground"
				>
					<span
						class="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary select-none"
						>{initials}</span
					>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onclick={ontoggletheme}
					title="Ganti tema"
					class="size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-secondary-foreground"
				>
					{#if theme === 'light'}
						<Icon name="sun" class="text-base" />
					{:else if theme === 'dark'}
						<Icon name="moon" class="text-base" />
					{:else}
						<Icon name="monitor" class="text-base" />
					{/if}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => goto('/settings')}
					title="Pengaturan"
					class="size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-secondary-foreground"
				>
					<Icon name="gear" class="text-xl" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onclick={onlogout}
					title="Keluar"
					class="size-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
				>
					<Icon name="logout-4" class="text-xl" />
				</Button>
			</div>
		{/if}
	</div>
</aside>
