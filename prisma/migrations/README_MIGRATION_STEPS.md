# Shared admin–vendor conversation migration

## What this does

- **Merge script**: Combines multiple Conversation rows per vendor into one. Messages are moved into the kept conversation; each message keeps its `senderId` and `senderRole`, so which admin sent which message is unchanged.
- **Migration**: Drops `adminId` from `Conversation` and adds a unique constraint on `vendorId` (one conversation per vendor, shared by all admins).

## Steps (run in order)

### 1. Merge conversations (one-time)

From the project root:

```bash
node scripts/merge-admin-vendor-conversations.js
```

### 2. Apply the schema change

Use migrations from now on (no more “data loss” prompt for this change):

```bash
npx prisma migrate deploy
```

**Important:** Use `migrate deploy`, not `migrate dev`. If you see P3006 / "table does not exist" (shadow database error), you ran `migrate dev` — use `migrate deploy` instead.

If you already applied the same schema with `prisma db push` and the migration fails because the column is already gone, mark this migration as applied:

```bash
npx prisma migrate resolve --applied 20250214000000_shared_admin_vendor_conversation
```

### 3. Regenerate client and restart

```bash
npx prisma generate
```

Then restart your Next.js and socket servers.

## Future schema changes

Use migrations so history is clear and you avoid accidental data loss:

```bash
npx prisma migrate dev --name your_change_description
```

That creates a new migration and applies it. For production, use:

```bash
npx prisma migrate deploy
```
