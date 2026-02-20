# Database Migrations Guide

This document explains how database migrations work in this project and how to run them in production.

## Automatic Migrations on Startup

The following migration runs automatically when the backend server starts:

- **Table Number Migration** - Converts `Table.number`, `Order.tableNumber`, and `Reservation.tableNumber` from Number to String to support alphanumeric table identifiers (e.g., "A1", "B2", "Terrace-1")

### Controlling Migrations

You can skip migrations on startup using the `RUN_MIGRATIONS` environment variable:

```bash
# Run migrations automatically (default)
RUN_MIGRATIONS=true

# Skip migrations on startup
RUN_MIGRATIONS=false
```

**Note:** The table number migration is idempotent and safe to run multiple times. After the first run, it finds 0 documents to convert and exits quickly.

## Production Deployment

On deploy, the migration runs automatically once the server starts. No manual steps required.

## Migration Safety

The table number migration is:

- **Idempotent:** Safe to run multiple times
- **Non-destructive:** Only converts type, preserves values (e.g., 1 → "1")
- **Resumable:** Can be interrupted and rerun safely
