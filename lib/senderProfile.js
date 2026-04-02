import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get display name for a user: first name (or last name) as short name.
 * For admins, format as "ShortName(Admin)".
 */
function formatDisplayName(clerkUser, options = {}) {
    if (!clerkUser) return options.fallback || "User";
    const first = (clerkUser.firstName || "").trim();
    const last = (clerkUser.lastName || "").trim();
    const shortName = first || last || options.fallback || "User";
    if (options.suffix) return `${shortName}(${options.suffix})`;
    return shortName;
}

/**
 * Fetch sender profiles (displayName, imageUrl) from Clerk for the given user IDs.
 * Returns a Map: userId -> { displayName, imageUrl }.
 * options: { vendorLabels: { [userId]: string } } to use store name for vendors,
 *           { vendorImageUrls: { [userId]: string } } to use store logo for vendors,
 *           { adminUserIds: [id] } to append " (Admin)" for those senders,
 *           { adminSuffix: "Admin" } to append (Admin) for all (if adminUserIds not used).
 */
export async function getSenderProfiles(userIds, options = {}) {
    const map = new Map();
    if (!userIds?.length) return map;
    const clerk = await clerkClient();
    const { vendorLabels = {}, vendorImageUrls = {}, adminUserIds = [], adminSuffix } = options;
    const isAdmin = (id) => adminUserIds.includes(id);

    for (const id of [...new Set(userIds)]) {
        try {
            const user = await clerk.users.getUser(id);
            const imageUrl = vendorImageUrls[id] ?? user.imageUrl ?? null;
            let displayName;
            if (vendorLabels[id]) {
                displayName = vendorLabels[id];
            } else {
                displayName = formatDisplayName(user, { fallback: "User" });
                if (isAdmin(id)) displayName = `${displayName} (Admin)`;
                else if (adminSuffix) displayName = `${displayName} (${adminSuffix})`;
            }
            map.set(id, { displayName, imageUrl });
        } catch (_) {
            let fallback = options.fallback || "User";
            if (isAdmin(id)) fallback = `${fallback} (Admin)`;
            map.set(id, { displayName: fallback, imageUrl: vendorImageUrls[id] ?? null });
        }
    }
    return map;
}
