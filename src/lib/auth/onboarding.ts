import { updateUser } from '$lib/storage';
import { auth } from './store.svelte';

export interface OnboardingInput {
	name?: string;
	defaultCurrency?: string;
	storageMode?: 'local' | 'cloud';
}

/** Tandai onboarding selesai + simpan preferensi awal. */
export async function completeOnboarding(input: OnboardingInput): Promise<void> {
	if (!auth.user) return;
	const updated = await updateUser(auth.user.id, { ...input, onboardingDone: true });
	if (updated) {
		const response = await fetch('/api/account', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				name: updated.name,
				defaultCurrency: updated.defaultCurrency,
				onboardingDone: true
			})
		});
		if (!response.ok) throw new Error('Gagal menyimpan onboarding ke server.');
		auth.setUser(updated);
	}
}

export function needsOnboarding(): boolean {
	return auth.user !== null && !auth.user.onboardingDone;
}
