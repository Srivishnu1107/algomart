import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';

// In Node.js (local dev), WebSocket is not globally available,
// so we need to provide the ws package. On Vercel serverless,
// globalThis.WebSocket is already available natively.
try {
    if (!globalThis.WebSocket) {
        const ws = require('ws');
        neonConfig.webSocketConstructor = ws;
    }
} catch (_) {
    // ws not available — running in an environment with native WebSocket
}

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
neonConfig.poolQueryViaFetch = true;

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaNeon({ connectionString });
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;