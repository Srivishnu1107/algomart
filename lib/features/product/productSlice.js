import { createSlice } from '@reduxjs/toolkit'

// 🔥 AI MODELS DATA
const AI_MODELS = [
  {
    id: 1,
    name: "Text Summarization (BART)",
    category: "NLP",
    price: 12,
    image: "/hero-showcase.png",
    rating: 4.8,
  },
  {
    id: 2,
    name: "Question Answering",
    category: "NLP",
    price: 20,
    image: "/hero-showcase.png",
    rating: 4.5,
  },
  {
    id: 3,
    name: "Sentiment Analysis",
    category: "NLP",
    price: 10,
    image: "/hero-showcase.png",
    rating: 4.3,
  },
  {
    id: 4,
    name: "Text Generation (GPT-2)",
    category: "Generative AI",
    price: 25,
    image: "/hero-showcase.png",
    rating: 4.7,
  },
  {
    id: 5,
    name: "Code Generation",
    category: "Generative AI",
    price: 30,
    image: "/hero-showcase.png",
    rating: 4.6,
  },
  {
    id: 6,
    name: "Image Classification",
    category: "Vision",
    price: 18,
    image: "/hero-showcase.png",
    rating: 4.4,
  },
  {
    id: 7,
    name: "Object Detection",
    category: "Vision",
    price: 22,
    image: "/hero-showcase.png",
    rating: 4.5,
  },
]

const productSlice = createSlice({
  name: 'product',
  initialState: {
    list: AI_MODELS, // ✅ directly loaded
  },
  reducers: {
    setProduct: (state, action) => {
      state.list = action.payload
    },
    clearProduct: (state) => {
      state.list = []
    }
  }
})

export const { setProduct, clearProduct } = productSlice.actions

export default productSlice.reducer