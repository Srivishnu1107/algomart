import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

let debounceTimer = null

export const uploadCart = createAsyncThunk('cart/uploadCart',
    async ({ getToken }, thunkAPI) => {
        try {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(async () => {
                const { cartItems } = thunkAPI.getState().cart;
                const token = await getToken();
                await axios.post('/api/cart', { cart: cartItems }, { headers: { Authorization: `Bearer ${token}` } })
            }, 1000)
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data)
        }
    }
)

export const fetchCart = createAsyncThunk('cart/fetchCart',
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
            return data
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data)
        }
    }
)


const cartSlice = createSlice({
    name: 'cart',
    initialState: {
        total: 0,
        cartItems: {},
        crossVendorSuggestions: {}, // Map of cartItemId -> suggestion (or null if none found)
    },
    reducers: {
        addToCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]++
            } else {
                state.cartItems[productId] = 1
            }
            state.total += 1
        },
        removeFromCart: (state, action) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]--
                if (state.cartItems[productId] === 0) {
                    delete state.cartItems[productId]
                    delete state.crossVendorSuggestions[productId] // Clear suggestion cache
                }
            }
            state.total -= 1
        },
        deleteItemFromCart: (state, action) => {
            const { productId } = action.payload
            state.total -= state.cartItems[productId] ? state.cartItems[productId] : 0
            delete state.cartItems[productId]
            delete state.crossVendorSuggestions[productId] // Clear suggestion cache
        },
        swapCartItem: (state, action) => {
            const { fromProductId, toProductId, quantity } = action.payload
            if (!fromProductId || !toProductId) return
            const qty = quantity ?? state.cartItems[fromProductId] ?? 1
            if (state.cartItems[fromProductId]) {
                state.total -= state.cartItems[fromProductId]
                delete state.cartItems[fromProductId]
                delete state.crossVendorSuggestions[fromProductId] // Clear suggestion cache on swap
            }
            state.cartItems[toProductId] = (state.cartItems[toProductId] || 0) + qty
            state.total += qty
            // Auto-verify swapped items to freeze AI scanning
            state.crossVendorSuggestions[toProductId] = {
                cartItemId: toProductId,
                suggestedProduct: null,
                isAIVerified: true
            }
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
            state.crossVendorSuggestions = {}
        },
        setSuggestions: (state, action) => {
            action.payload.forEach(suggestion => {
                state.crossVendorSuggestions[suggestion.cartItemId] = {
                    ...suggestion,
                    isAIVerified: suggestion.suggestedProduct === null
                };
            });
        },
        removeSuggestion: (state, action) => {
            const { cartItemId } = action.payload;
            delete state.crossVendorSuggestions[cartItemId];
        }
    },
    extraReducers: (builder) => {
        builder.addCase(fetchCart.fulfilled, (state, action) => {
            state.cartItems = action.payload.cart
            state.total = Object.values(action.payload.cart).reduce((acc, item) => acc + item, 0)
        })
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart, swapCartItem, setSuggestions, removeSuggestion } = cartSlice.actions

export default cartSlice.reducer
