import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

/** GET: List other admin users (by ADMIN_EMAIL). Excludes current user. Returns { admins: [{ userId, email }] }. */
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const adminEmails = (process.env.ADMIN_EMAIL || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
        if (adminEmails.length === 0) {
            return NextResponse.json({ admins: [] });
        }

        const client = await clerkClient();
        const { data: users } = await client.users.getUserList({ limit: 200 });
        const admins = [];
        for (const u of users) {
            if (u.id === userId) continue;
            const emails = (u.emailAddresses || [])
                .map((e) => (e?.emailAddress || "").trim().toLowerCase())
                .filter(Boolean);
            if (emails.some((email) => adminEmails.includes(email))) {
                admins.push({
                    userId: u.id,
                    email: emails[0] || null,
                    imageUrl: u.imageUrl || null,
                });
            }
        }

        return NextResponse.json({ admins });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
