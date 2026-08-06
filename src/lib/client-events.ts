export type FlotiveEventName =
	| 'Flotive:synced'
	| 'Flotive:transaction-saved'
	| 'Flotive:new-transaction'
	| 'Flotive:new-account'
	| 'Flotive:new-budget'
	| 'Flotive:new-bill'
	| 'Flotive:new-debt'
	| 'Flotive:new-category';

export function listenFlotiveEvents(
	events: FlotiveEventName[],
	listener: (event: FlotiveEventName) => void
): () => void {
	const wrapped = (e: Event) => listener(e.type as FlotiveEventName);
	for (const event of events) window.addEventListener(event, wrapped);
	return () => {
		for (const event of events) window.removeEventListener(event, wrapped);
	};
}
