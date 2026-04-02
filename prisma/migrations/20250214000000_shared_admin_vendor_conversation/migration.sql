-- One conversation per vendor (shared by all admins). Drop adminId, add unique on vendorId.
-- Run scripts/merge-admin-vendor-conversations.js first so there is at most one row per vendorId.

-- Drop the old composite unique constraint
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_vendorId_adminId_key";

-- Drop the adminId column
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "adminId";

-- Add unique constraint on vendorId (one conversation per vendor)
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_vendorId_key" UNIQUE ("vendorId");
