import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'

export const fetchAddress = createAsyncThunk(
  'address/fetchAddress',
  async ({ getToken }, thunkAPI) => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/address', { headers: { Authorization: `Bearer ${token}` } })
      return data ? data.addresses : []
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || { error: error.message })
    }
  }
)

const addressSlice = createSlice({
  name: 'address',
  initialState: {
    list: [],
  },
  reducers: {
    addAddress: (state, action) => {
      state.list.unshift(action.payload)
    },
    updateAddress: (state, action) => {
      const updated = action.payload
      const index = state.list.findIndex((addr) => addr.id === updated.id)
      if (index !== -1) {
        state.list[index] = updated
      }
    },
    removeAddress: (state, action) => {
      const id = action.payload
      state.list = state.list.filter((addr) => addr.id !== id)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAddress.fulfilled, (state, action) => {
      state.list = action.payload
    })
  },
})

export const { addAddress, updateAddress, removeAddress } = addressSlice.actions

export default addressSlice.reducer