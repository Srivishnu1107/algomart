import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import {getAuth} from "@clerk/nextjs/server"
import { NextResponse } from "next/server";

// Get all draft products for a seller
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if(!storeId){
            return NextResponse.json({error: 'not authorized'}, { status: 401 } )
        }

        const drafts = await prisma.product.findMany({ 
            where: { 
                storeId,
                // Only show products that are EXPLICITLY marked as drafts
                // Must have status='draft' (most explicit check)
                status: 'draft'
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                description: true,
                mrp: true,
                price: true,
                actual_price: true,
                offer_price: true,
                cost_price: true,
                stock_quantity: true,
                low_stock_threshold: true,
                sku: true,
                commission_rate: true,
                commission_amount: true,
                net_earnings: true,
                net_profit: true,
                is_draft: true,
                status: true,
                category: true,
                images: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        return NextResponse.json({drafts})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Delete a draft product or all drafts
export async function DELETE(request){
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if(!storeId){
            return NextResponse.json({error: 'not authorized'}, { status: 401 } )
        }

        const deleteAll = searchParams.get('deleteAll') === 'true'
        
        if (deleteAll) {
            // Delete all drafts for this store
            const allDrafts = await prisma.product.findMany({
                where: {
                    storeId,
                    status: 'draft'
                },
                select: { id: true }
            })

            const draftIds = allDrafts.map(d => d.id)

            if (draftIds.length === 0) {
                return NextResponse.json({ message: 'No drafts to delete' })
            }

            // Delete OrderItems first (must be deleted before products due to foreign key constraint)
            await prisma.orderItem.deleteMany({ 
                where: { productId: { in: draftIds } } 
            })

            // Delete related data for all drafts
            await prisma.wishlist.deleteMany({ where: { productId: { in: draftIds } } })
            await prisma.rating.deleteMany({ where: { productId: { in: draftIds } } })

            // Remove from user carts
            const users = await prisma.user.findMany({ select: { id: true, cart: true } })
            for (const user of users) {
                const cart = user.cart && typeof user.cart === 'object' ? user.cart : {}
                let updated = false
                const newCart = { ...cart }
                
                draftIds.forEach(draftId => {
                    if (newCart[draftId]) {
                        delete newCart[draftId]
                        updated = true
                    }
                })

                if (updated) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { cart: newCart },
                    })
                }
            }

            // Delete all drafts (after OrderItems are deleted)
            await prisma.product.deleteMany({ 
                where: { 
                    storeId,
                    status: 'draft'
                } 
            })

            return NextResponse.json({ 
                message: `${draftIds.length} draft(s) deleted successfully`,
                deleted: draftIds.length
            })
        }

        // Single draft deletion
        const draftId = searchParams.get('draftId')
        if(!draftId){
            return NextResponse.json({error: 'draftId required or use deleteAll=true'}, { status: 400 } )
        }

        const draft = await prisma.product.findFirst({
            where: { 
                id: draftId, 
                storeId,
                status: 'draft' // Only allow deleting products explicitly marked as drafts
            },
            include: { orderItems: true },
        })

        if(!draft){
            return NextResponse.json({error: 'Draft not found'}, { status: 404 } )
        }

        // Check if draft has any orders (shouldn't happen, but safety check)
        if(draft.orderItems?.length > 0){
            return NextResponse.json({error: 'Cannot delete draft with order history'}, { status: 400 } )
        }

        // Delete related data
        await prisma.wishlist.deleteMany({ where: { productId: draftId } })
        await prisma.rating.deleteMany({ where: { productId: draftId } })

        // Remove from user carts
        const users = await prisma.user.findMany({ select: { id: true, cart: true } })
        for (const user of users) {
            const cart = user.cart && typeof user.cart === 'object' ? user.cart : {}
            if (cart[draftId]) {
                const { [draftId]: _, ...rest } = cart
                await prisma.user.update({
                    where: { id: user.id },
                    data: { cart: rest },
                })
            }
        }

        await prisma.product.delete({ where: { id: draftId, storeId } })

        return NextResponse.json({ message: 'Draft deleted successfully' })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
