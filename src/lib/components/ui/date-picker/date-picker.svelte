<script lang="ts">
	import { untrack } from 'svelte';
	import { DatePicker } from 'bits-ui';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import { cn } from '$lib/utils';
	import { Icon } from '$lib/components/ui/icon';

	interface Props {
		value?: string;
		placeholder?: string;
		label?: string;
		id?: string;
		class?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		placeholder = '',
		label,
		id,
		class: className = '',
		disabled = false,
		onchange
	}: Props = $props();

	function toCalendarDate(iso: string): CalendarDate | undefined {
		if (!iso) return undefined;
		const [y, m, d] = iso.split('-').map(Number);
		if (!y || !m || !d) return undefined;
		return new CalendarDate(y, m, d);
	}

	function toISO(cv: CalendarDate | undefined): string {
		if (!cv) return '';
		return cv.toString();
	}

	let internalValue = $state<DateValue | undefined>(toCalendarDate(value));

	$effect(() => {
		internalValue = toCalendarDate(value);
	});

	function handleValueChange(cv: DateValue | undefined) {
		internalValue = cv;
		value = toISO(cv as CalendarDate | undefined);
		onchange?.(value);
	}

	let placeholderDate = $state<CalendarDate>(
		untrack(() => toCalendarDate(placeholder) ?? new CalendarDate(2026, 1, 1))
	);
</script>

<DatePicker.Root
	value={internalValue}
	onValueChange={handleValueChange}
	placeholder={placeholderDate}
	weekdayFormat="short"
	fixedWeeks={true}
	weekStartsOn={1}
	locale="id-ID"
	{disabled}
>
	{#if label}
		<DatePicker.Label class="block text-xs font-medium text-muted-foreground select-none">
			{label}
		</DatePicker.Label>
	{/if}
	<DatePicker.Input
		{id}
		class={cn(
			'flex h-9 w-full items-center rounded-lg border border-input bg-background px-3 text-sm tabular-nums transition-colors',
			'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 data-[invalid]:border-destructive',
			'disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
	>
		{#snippet children({ segments })}
			{#each segments as { part, value: segValue }, i (part + i)}
				<div class="inline-block select-none">
					{#if part === 'literal'}
						<DatePicker.Segment {part} class="p-0.5 text-muted-foreground">
							{segValue}
						</DatePicker.Segment>
					{:else}
						<DatePicker.Segment
							{part}
							class="rounded px-1 py-0.5 hover:bg-muted focus:bg-muted focus:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 aria-[valuetext=Empty]:text-muted-foreground"
						>
							{segValue}
						</DatePicker.Segment>
					{/if}
				</div>
			{/each}
			<DatePicker.Trigger
				class="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Buka kalender"
			>
				<Icon name="calendar-blank" class="text-base" />
			</DatePicker.Trigger>
		{/snippet}
	</DatePicker.Input>
	<DatePicker.Portal>
		<DatePicker.Content sideOffset={6} class="z-50 w-[260px]">
			<DatePicker.Calendar class="rounded-xl border border-border bg-card p-3 shadow-xl">
				{#snippet children({ months, weekdays })}
					<DatePicker.Header class="flex items-center justify-between">
						<DatePicker.PrevButton
							class="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<Icon name="chevron-left" class="text-base" />
						</DatePicker.PrevButton>
						<DatePicker.Heading class="text-sm font-medium" />
						<DatePicker.NextButton
							class="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<Icon name="chevron-right" class="text-base" />
						</DatePicker.NextButton>
					</DatePicker.Header>
					<div class="mt-3 flex flex-col space-y-4">
						{#each months as month (month.value)}
							<DatePicker.Grid class="w-full border-collapse space-y-1 select-none">
								<DatePicker.GridHead>
									<DatePicker.GridRow class="mb-1 grid grid-cols-7 gap-1">
										{#each weekdays as day (day)}
											<DatePicker.HeadCell class="text-center text-xs text-muted-foreground">
												{day.slice(0, 2)}
											</DatePicker.HeadCell>
										{/each}
									</DatePicker.GridRow>
								</DatePicker.GridHead>
								<DatePicker.GridBody>
									{#each month.weeks as weekDates (weekDates)}
										<DatePicker.GridRow class="grid grid-cols-7 gap-1">
											{#each weekDates as date (date)}
												<DatePicker.Cell
													{date}
													month={month.value}
													class="relative p-0 text-center text-sm"
												>
													<DatePicker.Day
														class="relative inline-flex size-8 w-full items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-sm font-normal whitespace-nowrap text-foreground transition-colors hover:border-border hover:bg-muted data-disabled:pointer-events-none data-disabled:text-muted-foreground/50 data-outside-month:pointer-events-none data-outside-month:text-muted-foreground/40 data-selected:border-transparent data-selected:bg-primary data-selected:font-medium data-selected:text-primary-foreground data-unavailable:text-muted-foreground data-unavailable:line-through"
													>
														{date.day}
													</DatePicker.Day>
												</DatePicker.Cell>
											{/each}
										</DatePicker.GridRow>
									{/each}
								</DatePicker.GridBody>
							</DatePicker.Grid>
						{/each}
					</div>
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</DatePicker.Portal>
</DatePicker.Root>
