-- Reset admin–vendor messages and apply new schema (one conversation per vendor, no adminId).
-- Run this in your DB (psql, pgAdmin, or: psql $DATABASE_URL -f scripts/reset-admin-vendor-messages.sql)
-- Then run: npx prisma migrate resolve --applied 20250214000000_shared_admin_vendor_conversation
-- Then: npx prisma generate

-- 1. Empty messages and hidden refs, then conversations
DELETE FROM "Message";
DELETE FROM "HiddenConversation" WHERE type = 'admin_vendor';
DELETE FROM "Conversation";

-- 2. Apply new schema: drop adminId, add unique on vendorId
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_vendorId_adminId_key";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "adminId";
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_vendorId_key";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_vendorId_key" UNIQUE ("vendorId");
