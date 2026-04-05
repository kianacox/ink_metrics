# Supabase (Ink Metrics)

## Local CLI workflow

1. Authenticate your CLI:

   ```bash
   npx supabase login
   ```

2. Link this repo to the hosted project:

   ```bash
   npm run supabase:link
   ```

3. Pull hosted schema into versioned migrations:

   ```bash
   npm run supabase:db:pull
   ```

4. Keep local schema synced whenever hosted schema changes:

   ```bash
   npm run supabase:schema:sync
   ```

5. Start local services and print env values:

   ```bash
   npm run supabase:start
   npm run supabase:status:env
   ```

Use `API_URL` and `API_PUBLISHABLE_KEY` from `supabase:status:env` in `.env.local`.
