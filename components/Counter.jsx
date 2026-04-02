'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";

const Counter = ({ productId }) => {

    const { cartItems } = useSelector(state => state.cart);

    const dispatch = useDispatch();
    
    const pathname = usePathname();
    const isFashion = pathname?.startsWith('/fashion') || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'fashion');

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ productId }))
    }

    return (
        <div className={`inline-flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl max-sm:text-sm ${isFashion ? 'border border-[#d4c4a8]/40 bg-[#f5ede3] text-[#4a3728]' : 'border border-zinc-700/40 bg-zinc-800/40 text-zinc-300'}`}>
            <button onClick={removeFromCartHandler} className={`w-7 h-7 flex items-center justify-center rounded-lg select-none transition ${isFashion ? 'hover:text-[#2d1810] hover:bg-[#d4c4a8]/40' : 'hover:text-white hover:bg-zinc-700/60'}`}>−</button>
            <span className={`min-w-[1.5rem] text-center font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>{cartItems[productId]}</span>
            <button onClick={addToCartHandler} className={`w-7 h-7 flex items-center justify-center rounded-lg select-none transition ${isFashion ? 'hover:text-[#2d1810] hover:bg-[#d4c4a8]/40' : 'hover:text-white hover:bg-zinc-700/60'}`}>+</button>
        </div>
    )
}

export default Counter