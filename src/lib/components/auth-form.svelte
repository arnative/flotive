<script lang="ts">
	import { login, register, type AuthResult } from '$lib/auth/actions';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Icon } from '$lib/components/ui/icon';
	import { Progress } from '$lib/components/ui/progress';
	import Logo from '$lib/components/logo.svelte';

	let mode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let remember = $state(true);
	let loading = $state(false);
	let showPassword = $state(false);

	function togglePassword() {
		showPassword = !showPassword;
	}

	function generatePassword() {
		const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
		const randomIndex = (length: number) => {
			const limit = Math.floor(256 / length) * length;
			const bytes = new Uint8Array(1);
			do crypto.getRandomValues(bytes);
			while (bytes[0] >= limit);
			return bytes[0] % length;
		};
		const ensure = (set: string) => set[randomIndex(set.length)];
		const lower = 'abcdefghijkmnopqrstuvwxyz';
		const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
		const nums = '23456789';
		const sym = '!@#$%&*';
		const generated = [ensure(lower), ensure(upper), ensure(nums), ensure(sym)];
		for (let i = 0; i < 8; i++) generated.push(ensure(chars));
		for (let i = generated.length - 1; i > 0; i--) {
			const j = randomIndex(i + 1);
			[generated[i], generated[j]] = [generated[j], generated[i]];
		}
		password = generated.join('');
		showPassword = true;
	}

	let passwordStrength = $derived.by(() => {
		const p = password;
		if (!p) return { level: 0, label: '', color: '' };
		let score = 0;
		if (p.length >= 4) score++;
		if (p.length >= 8) score++;
		if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
		if (/[0-9]/.test(p)) score++;
		if (/[^a-zA-Z0-9]/.test(p)) score++;
		const levels = [
			{ level: 0, label: '', color: '' },
			{ level: 1, label: 'Lemah', color: 'bg-destructive' },
			{ level: 2, label: 'Cukup', color: 'bg-warning' },
			{ level: 3, label: 'Baik', color: 'bg-info' },
			{ level: 4, label: 'Kuat', color: 'bg-success' },
			{ level: 5, label: 'Sangat kuat', color: 'bg-success' }
		];
		return levels[score];
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;
		loading = true;
		try {
			let res: AuthResult;
			if (mode === 'login') res = await login({ email, password, remember });
			else res = await register({ email, password, name });
			if (res.ok) {
				toast.success(mode === 'login' ? 'Berhasil masuk' : 'Akun dibuat');
				await goto('/', { replaceState: true });
			} else {
				toast.error(res.error);
			}
		} catch (err) {
			console.error('Auth submit error:', err);
			toast.error('Terjadi kesalahan: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
	<div class="mb-6 flex flex-col items-center gap-3">
		<Logo class="h-10 w-auto text-foreground" />
		<p class="text-center text-sm text-muted-foreground">Pengelolaan uang local-first, tersinkron antar perangkat.</p>
	</div>

	<form onsubmit={submit} class="space-y-4">
		{#if mode === 'register'}
			<div class="space-y-1.5">
				<Label for="name">Nama</Label>
				<Input id="name" bind:value={name} placeholder="Nama Anda" autocomplete="name" />
			</div>
		{/if}
		<div class="space-y-1.5">
			<Label for="email">Email</Label>
			<div class="relative">
				<Input
					id="email"
					type="email"
					bind:value={email}
					placeholder="email@contoh.com"
					autocomplete="email"
					required
				/>
				{#if email}
					<button
						type="button"
						onclick={() => (email = '')}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						aria-label="Hapus email"
					>
						<Icon name="x" class="text-base" />
					</button>
				{/if}
			</div>
		</div>
		<div class="space-y-1.5">
			<Label for="password">Password</Label>
			<div class="relative">
				<Input
					id="password"
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					placeholder="••••••••"
					autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
					required
					class="pr-9"
				/>
				<button
					type="button"
					onclick={togglePassword}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
				>
					<Icon name={showPassword ? 'eye-slash' : 'eye'} class="text-base" />
				</button>
			</div>
			{#if mode === 'register' && password}
				<div class="flex items-center gap-2">
					<Progress value={(passwordStrength.level / 5) * 100} class="h-1.5 flex-1" />
					<span class="shrink-0 text-xs text-muted-foreground">{passwordStrength.label}</span>
				</div>
				<button
					type="button"
					onclick={generatePassword}
					class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<Icon name="shuffle" class="text-sm" />
					Generate password
				</button>
			{/if}
		</div>
		{#if mode === 'login'}
			<label for="remember" class="flex items-center gap-2 text-sm cursor-pointer select-none">
				<Checkbox id="remember" bind:checked={remember} />
				<span>Ingat saya</span>
			</label>
		{/if}
		<Button type="submit" class="w-full" disabled={loading}>
			{loading ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
		</Button>
	</form>

	{#if mode === 'login'}
		<button
			type="button"
			class="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
			onclick={() => { mode = 'register'; password = ''; showPassword = false; }}
		>
			Belum punya akun? Daftar
		</button>
	{:else if mode === 'register'}
		<button
			type="button"
			class="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
			onclick={() => { mode = 'login'; password = ''; showPassword = false; }}
		>
			Sudah punya akun? Masuk
		</button>
	{/if}
</div>
