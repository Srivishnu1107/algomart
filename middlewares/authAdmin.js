import { clerkClient } from "@clerk/nextjs/server"


const authAdmin = async (userId) => {
    try {
        if (!userId) return false

        const adminEmails = (process.env.ADMIN_EMAIL || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
        if (adminEmails.length === 0) return false

        const client = await clerkClient()
        const user = await client.users.getUser(userId)
        const userEmails = (user.emailAddresses || [])
            .map((e) => (e?.emailAddress || "").trim().toLowerCase())
            .filter(Boolean)

        return userEmails.some((email) => adminEmails.includes(email))
    } catch (error) {
        console.error(error)
        return false
    }
}

export default authAdmin