<script lang="ts">
	import WorkspaceSwitcher from '$lib/components/workspace-switcher.svelte';
	import Logo from '$lib/components/logo.svelte';
</script>

<header
	class="flex h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)] md:hidden"
>
	<div class="flex items-center">
		<Logo class="h-6 w-auto text-foreground" />
	</div>
	<div class="flex items-center gap-2">
		<WorkspaceSwitcher align="end" />
	</div>
</header>
