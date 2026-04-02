import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

const emptyBucket = () => ({ productIds: [], items: [] })

export const fetchWishlist = createAsyncThunk('wishlist/fetchWishlist',
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const [electronicsRes, fashionRes] = await Promise.all([
                axios.get('/api/wishlist?storeType=electronics', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/wishlist?storeType=fashion', { headers: { Authorization: `Bearer ${token}` } }),
            ])
            return {
                electronics: electronicsRes.data,
                fashion: fashionRes.data,
            }
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data)
        }
    }
)

export const addToWishlist = createAsyncThunk('wishlist/addToWishlist',
    async ({ productId, storeType, getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/wishlist', { productId }, { headers: { Authorization: `Bearer ${token}` } })
            return { ...data, storeType: data.storeType || storeType }
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data)
        }
    }
)

export const removeFromWishlist = createAsyncThunk('wishlist/removeFromWishlist',
    async ({ productId, storeType, getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            await axios.delete(`/api/wishlist/${productId}`, { headers: { Authorization: `Bearer ${token}` } })
            return { productId, storeType }
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data)
        }
    }
)

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState: {
        electronics: emptyBucket(),
        fashion: emptyBucket(),
    },
    reducers: {
        optimisticAdd: (state, action) => {
            const { productId, product, storeType = 'electronics' } = typeof action.payload === 'object'
                ? action.payload
                : { productId: action.payload, product: null, storeType: 'electronics' }
            const bucket = state[storeType] || emptyBucket()
            if (!bucket.productIds.includes(productId)) {
                bucket.productIds.push(productId)
                if (product) {
                    bucket.items.push({ productId, product, storeType })
                }
            }
        },
        optimisticRemove: (state, action) => {
            const { productId, storeType = 'electronics' } = typeof action.payload === 'object'
                ? action.payload
                : { productId: action.payload, storeType: 'electronics' }
            const bucket = state[storeType]
            if (bucket) {
                bucket.productIds = bucket.productIds.filter(id => id !== productId)
                bucket.items = bucket.items.filter(item => item.productId !== productId)
            }
        },
        clearWishlist: (state) => {
            state.electronics = emptyBucket()
            state.fashion = emptyBucket()
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWishlist.fulfilled, (state, action) => {
                const { electronics = [], fashion = [] } = action.payload
                state.electronics = {
                    items: electronics,
                    productIds: electronics.map(item => item.productId),
                }
                state.fashion = {
                    items: fashion,
                    productIds: fashion.map(item => item.productId),
                }
            })
            .addCase(addToWishlist.fulfilled, (state, action) => {
                const payload = action.payload
                const storeType = payload.storeType || 'electronics'
                const bucket = state[storeType]
                if (!bucket) return
                const productId = payload.productId
                if (!bucket.productIds.includes(productId)) {
                    bucket.productIds.push(productId)
                    bucket.items.push(payload)
                } else {
                    bucket.items = bucket.items.map(item =>
                        item.productId === productId ? payload : item
                    )
                }
            })
            .addCase(addToWishlist.rejected, (state, action) => {
                const storeType = action.meta.arg.storeType || 'electronics'
                const productId = action.meta.arg.productId
                const bucket = state[storeType]
                if (bucket) {
                    bucket.productIds = bucket.productIds.filter(id => id !== productId)
                    bucket.items = bucket.items.filter(item => item.productId !== productId)
                }
            })
            .addCase(removeFromWishlist.fulfilled, (state, action) => {
                const { productId, storeType = 'electronics' } = action.payload
                const bucket = state[storeType]
                if (bucket) {
                    bucket.productIds = bucket.productIds.filter(id => id !== productId)
                    bucket.items = bucket.items.filter(item => item.productId !== productId)
                }
            })
            .addCase(removeFromWishlist.rejected, (state, action) => {
                const storeType = action.meta.arg?.storeType || 'electronics'
                const productId = action.meta.arg?.productId
                if (!productId) return
                if (!state[storeType].productIds.includes(productId)) {
                    state[storeType].productIds.push(productId)
                }
            })
    }
})

export const { optimisticAdd, optimisticRemove, clearWishlist } = wishlistSlice.actions

export const selectElectronicsWishlist = (state) => state.wishlist.electronics
export const selectFashionWishlist = (state) => state.wishlist.fashion
export const selectWishlistByStoreType = (storeType) => (state) => state.wishlist[storeType] || { productIds: [], items: [] }

export default wishlistSlice.reducer
