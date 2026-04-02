/**
 * One-time script: merge Conversation rows by vendorId so there is at most one per vendor.
 * Messages are moved into the kept conversation; each message keeps its senderId and senderRole,
 * so which admin sent which message is preserved (no merge of admin IDs on messages).
 *
 * Run once before applying the migration. Then run: npx prisma migrate deploy
 *
 * Usage: node scripts/merge-admin-vendor-conversations.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { messages: true } } },
  });

  const byVendor = new Map();
  for (const c of conversations) {
    if (!byVendor.has(c.vendorId)) byVendor.set(c.vendorId, []);
    byVendor.get(c.vendorId).push(c);
  }

  let merged = 0;
  for (const [vendorId, rows] of byVendor) {
    if (rows.length <= 1) continue;
    const [keep, ...remove] = rows;
    const removeIds = remove.map((r) => r.id);
    const moved = await prisma.message.updateMany({
      where: { conversationId: { in: removeIds } },
      data: { conversationId: keep.id },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: removeIds } },
    });
    merged += remove.length;
    console.log(`Vendor ${vendorId}: kept ${keep.id}, merged ${remove.length} conversations (${moved.count} messages)`);
  }

  if (merged === 0) {
    console.log('No duplicate vendorIds found. Safe to run: npx prisma db push');
  } else {
    console.log(`Merged ${merged} duplicate conversation(s). Run: npx prisma db push`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
