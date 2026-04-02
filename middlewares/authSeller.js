import prisma from '@/lib/prisma';


const authSeller = async (userId, storeType = 'electronics') => {
    try {
        const store = await prisma.store.findFirst({
            where: { userId, storeType },
        })

        if (store && store.status === 'approved') {
            return store.id
        }
        return false
    } catch (error) {
        console.error(error)
        return false
    }
}

export default authSeller