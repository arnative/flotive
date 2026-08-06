import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gabungkan class Tailwind dengan aman (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, U = HTMLElement> = T & { ref?: U | null };
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<T> extends { child?: any }
	? Omit<WithoutChildren<T>, 'child'>
	: WithoutChildren<T>;
