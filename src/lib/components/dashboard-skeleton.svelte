<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="space-y-3">
	<!-- Summary stat cards skeleton -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-6">
		<Skeleton class="col-span-2 h-24 rounded-2xl lg:col-span-2" />
		<Skeleton class="h-24 rounded-2xl" />
		<Skeleton class="h-24 rounded-2xl" />
		<Skeleton class="h-24 rounded-2xl" />
		<Skeleton class="h-24 rounded-2xl" />
	</div>

	<!-- Main grid row 1 skeleton -->
	<div class="grid grid-cols-1 gap-3 lg:grid-cols-8">
		<Skeleton class="h-56 rounded-2xl lg:col-span-5" />
		<Skeleton class="h-56 rounded-2xl lg:col-span-3" />
	</div>

	<!-- Main grid row 2 skeleton -->
	<div class="grid grid-cols-1 gap-3 lg:grid-cols-8">
		<Skeleton class="h-56 rounded-2xl lg:col-span-5" />
		<Skeleton class="h-56 rounded-2xl lg:col-span-3" />
	</div>
</div>
