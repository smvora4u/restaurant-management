# Database Migrations Guide

This document explains how database migrations work in this project and how to run them in production.

## Automatic Migrations on Startup

Some migrations run automatically when the backend server starts:

- **Table Index Fixes** - Ensures proper database indexes
- **paidAt Backfill** - Backfills `paidAt` dates for old salary payments

### Controlling Automatic Migrations

You can control whether migrations run on startup using the `RUN_MIGRATIONS` environment variable:

```bash
# Run migrations automatically (default)
RUN_MIGRATIONS=true

# Skip migrations on startup
RUN_MIGRATIONS=false
```

**Note:** Even if migrations are skipped on startup, they are idempotent and safe to run multiple times.

## Manual Migration Scripts

### Backfill paidAt Dates

This migration backfills the `paidAt` field for salary payments that have status 'paid' but no `paidAt` date.

**Local Development:**
```bash
npm run migration:backfill-paidat
```

**Production (via SSH/CLI):**
```bash
# If using npm scripts
npm run migration:backfill-paidat

# Or directly with tsx/node
tsx src/scripts/runMigration.ts
# or
node dist/scripts/runMigration.js
```

**Production (via Docker):**
```bash
# Execute migration in running container
docker exec -it <container-name> npm run migration:backfill-paidat

# Or run as one-off container
docker run --rm --env-file .env <image-name> npm run migration:backfill-paidat
```

### Backfill purchaseDate Values

This migration backfills the `purchaseDate` field for purchases where it is missing or invalid by using `createdAt`.

**Local Development:**
```bash
npm run migration:backfill-purchase-date
```

**Production (via SSH/CLI):**
```bash
# If using npm scripts
npm run migration:backfill-purchase-date

# Or directly with tsx/node
tsx src/scripts/runPurchaseDateMigration.ts
# or
node dist/scripts/runPurchaseDateMigration.js
```

**Production (via Docker):**
```bash
# Execute migration in running container
docker exec -it <container-name> npm run migration:backfill-purchase-date

# Or run as one-off container
docker run --rm --env-file .env <image-name> npm run migration:backfill-purchase-date
```

## Production Deployment Strategy

### Option 1: Automatic (Recommended for First Deployment)

1. **First deployment:** Let migrations run automatically on startup
   - Set `RUN_MIGRATIONS=true` (or leave unset, defaults to true)
   - Deploy the new version
   - Migrations will run once on first server startup
   - Check logs to confirm migration completed

2. **Subsequent deployments:** Migrations are idempotent, so they're safe to run again
   - They'll only update records that need updating
   - No duplicate work or data corruption

### Option 2: Manual (Recommended for Large Databases)

1. **Before deployment:** Run migration manually
   ```bash
   npm run migration:backfill-paidat
   ```

2. **Deploy with migrations disabled:**
   ```bash
   RUN_MIGRATIONS=false
   ```

3. **Deploy the new version**

### Option 3: Controlled (Recommended for Zero-Downtime)

1. **Deploy new version** with `RUN_MIGRATIONS=false`
2. **Run migration manually** during low-traffic period
3. **Verify migration** completed successfully
4. **Optionally enable** `RUN_MIGRATIONS=true` for future deployments

## Migration Safety

All migrations are designed to be:

- **Idempotent:** Safe to run multiple times
- **Non-destructive:** Never delete or modify existing valid data
- **Backward compatible:** Old code continues to work during migration
- **Resumable:** Can be interrupted and rerun safely

## Monitoring Migrations

Check your server logs for migration status:

```
✅ No payments need paidAt backfill
# or
✅ Successfully backfilled paidAt for X payment(s)
```

If you see errors, migrations won't crash the server in production (they'll log and continue).

## Troubleshooting

### Migration not running?

1. Check `RUN_MIGRATIONS` environment variable
2. Check server logs for migration messages
3. Verify MongoDB connection is working
4. Run migration manually to test

### Migration failed?

1. Check MongoDB connection and permissions
2. Review error logs for specific issues
3. Run migration manually to get detailed error output
4. Migrations are non-destructive, so retrying is safe

### Need to rollback?

Migrations don't remove data, so there's nothing to rollback. If needed:
- Old code will continue to work (it handles missing `paidAt`)
- New code gracefully handles both cases
- You can always re-run migrations

## Adding New Migrations

When adding new migrations:

1. Create migration function in `src/utils/`
2. Make it idempotent and safe
3. Add to startup sequence in `src/index.ts`
4. Create standalone script in `src/scripts/` if needed
5. Update this document


