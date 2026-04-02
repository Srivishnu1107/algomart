/**
 * Run the reset SQL for admin-vendor messages (empty messages, apply new schema).
 * Usage: node scripts/run-reset-admin-vendor-messages.js
 * Requires: DATABASE_URL in .env (from project root)
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(__dirname, 'reset-admin-vendor-messages.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.replace(/--.*$/gm, '').trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement + ';');
  }
  console.log('Reset done. Run: npx prisma migrate resolve --applied 20250214000000_shared_admin_vendor_conversation');
  console.log('Then: npx prisma generate');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
