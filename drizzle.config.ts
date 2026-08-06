import { defineConfig } from 'drizzle-kit';

// Migrations untuk database Cloudflare D1.
// Local source-of-truth memakai IndexedDB (lihat src/lib/storage/manager.ts).
export default defineConfig({
	schema: './src/lib/db/schema.ts',
	out: './src/lib/db/migrations',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		databaseId: '0fd87251-0f03-4323-aa85-0663955484a4',
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
		token: process.env.CLOUDFLARE_TOKEN ?? ''
	}
});
