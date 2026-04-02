import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {Protect, useAuth, useUser} from '@clerk/nextjs'
import axios from 'axios';
import { fetchCart } from '@/lib/features/cart/cartSlice';
import { trackBehavior } from '@/lib/behaviorTracker';

const OrderSummary = ({ totalPrice, items, isFashion = false }) => {

    const {user} = useUser()
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';

    const router = useRouter();

    const addressList = useSelector(state => state.address.list);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [availableCoupons, setAvailableCoupons] = useState([]);

    const storeType = isFashion ? 'fashion' : 'electronics';

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const url = `/api/coupons/available?storeType=${storeType}`;
                const opts = user ? { headers: { Authorization: `Bearer ${await getToken()}` } } : {};
                const { data } = await axios.get(url, opts);
                setAvailableCoupons(data.coupons || []);
            } catch (e) {
                setAvailableCoupons([]);
            }
        };
        fetchCoupons();
    }, [storeType, user, getToken]);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
            if(!user){
                return toast('Please login to proceed')
            }
            const token = await getToken();
            const productIds = Array.isArray(items) ? items.map((i) => i.id).filter(Boolean) : [];
            const { data } = await axios.post('/api/coupon', { code: couponCodeInput, productIds }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCoupon(data.coupon)
            toast.success('Coupon Applied')
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const applyCouponFromList = async (code) => {
        if (!user) {
            toast('Please login to apply a coupon');
            return;
        }
        try {
            const token = await getToken();
            const productIds = Array.isArray(items) ? items.map((i) => i.id).filter(Boolean) : [];
            const { data } = await axios.post('/api/coupon', { code, productIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCoupon(data.coupon);
            setCouponCodeInput(code);
            toast.success('Coupon applied');
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        }
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        try {
            if(!user){
                return toast('Please login to place an order')
            }
            if(!selectedAddress){
                return toast('Please select an address')
            }
            const token = await getToken();

            const orderData = {
                addressId: selectedAddress.id,
                items,
                paymentMethod
            }

            if(coupon){
                orderData.couponCode = coupon.code
            }
           // create order
           const {data} = await axios.post('/api/orders', orderData, {
            headers: { Authorization: `Bearer ${token}` }
           })

           if(paymentMethod === 'STRIPE'){
            window.location.href = data.session.url;
           }else{
            items.forEach((item) => {
              const category = (item.type === 'fashion' ? 'fashion' : 'electronics');
              trackBehavior({ eventType: 'purchase', category, productId: item.id });
            });
            toast.success(data.message)
            router.push(isFashion ? '/orders?from=fashion' : '/orders')
            dispatch(fetchCart({getToken}))
           }

        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }

        
    }

    return (
        <div className={`w-full max-w-lg lg:max-w-[380px] text-sm rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 ${isFashion ? 'bg-white border border-[#d4c4a8]/30 text-[#8B7355] hover:border-[#c4a882]/40 hover:shadow-[0_0_20px_-5px_rgba(139,105,20,0.08)]' : 'bg-zinc-900/40 border border-zinc-700/40 text-zinc-400 hover:border-cyan-500/15 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.08)]'}`}>
            <h2 className={`text-xl font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>Payment Summary</h2>
            <p className={`text-xs my-4 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Payment Method</p>
            <div className='flex gap-2 items-center'>
                <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className={isFashion ? 'accent-[#8B6914]' : 'accent-teal-500'} />
                <label htmlFor="COD" className={`cursor-pointer ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>COD</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className={isFashion ? 'accent-[#8B6914]' : 'accent-teal-500'} />
                <label htmlFor="STRIPE" className={`cursor-pointer ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Stripe Payment</label>
            </div>
            <div className={`my-4 py-4 ${isFashion ? 'border-y border-[#d4c4a8]/30 text-[#8B7355]' : 'border-y border-zinc-700 text-zinc-500'}`}>
                <p className={isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}>Address</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center mt-2'>
                            <p className={`text-sm ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className={`cursor-pointer flex-shrink-0 ${isFashion ? 'text-[#8B7355] hover:text-[#8B6914]' : 'text-zinc-400 hover:text-teal-400'}`} size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className={`p-2.5 w-full my-3 outline-none rounded-lg ${isFashion ? 'border border-[#d4c4a8]/40 bg-[#f5ede3] text-[#2d1810] focus:border-[#8B6914]/40' : 'border border-zinc-600 bg-zinc-800 text-zinc-200 focus:border-teal-500/50'}`} onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className={`flex items-center gap-1 mt-1 transition ${isFashion ? 'text-[#8B6914] hover:text-[#7a5c12]' : 'text-teal-400 hover:text-teal-300'}`} onClick={() => setShowAddressModal(true)}>Add Address <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className={`pb-4 ${isFashion ? 'border-b border-[#d4c4a8]/30' : 'border-b border-zinc-700'}`}>
                <div className='flex justify-between'>
                    <div className={`flex flex-col gap-1 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>
                        <p>Subtotal:</p>
                        <p>Shipping:</p>
                        {coupon && <p>Coupon:</p>}
                    </div>
                    <div className={`flex flex-col gap-1 font-medium text-right ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>
                        <p>{currency}{totalPrice.toLocaleString()}</p>
                        <p><Protect plan={'plus'} fallback={`${currency}5`}>Free</Protect></p>
                        {coupon && <p>{`-${currency}${(coupon.discount / 100 * totalPrice).toFixed(2)}`}</p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <div className="mt-3 space-y-3">
                            <div>
                                <p className={`text-xs mb-1.5 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Available coupons</p>
                                <select
                                    className={`p-2.5 w-full outline-none rounded-lg text-sm ${isFashion ? 'border border-[#d4c4a8]/40 bg-[#f5ede3] text-[#2d1810] focus:border-[#8B6914]/40' : 'border border-zinc-600 bg-zinc-800 text-zinc-200 focus:border-teal-500/50'}`}
                                    value=""
                                    onChange={(e) => {
                                        const code = e.target.value;
                                        if (code) applyCouponFromList(code);
                                    }}
                                >
                                    <option value="">Select a coupon to apply</option>
                                    {availableCoupons.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.code} — {c.discount}% off {c.forMember ? '(Member)' : '(Public)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })} className='flex gap-3'>
                                <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder='Or enter coupon code' className={`p-2 rounded-lg w-full outline-none ${isFashion ? 'border border-[#d4c4a8]/40 bg-[#f5ede3] text-[#2d1810] focus:border-[#8B6914]/40' : 'border border-zinc-600 bg-zinc-800 text-zinc-200 focus:border-teal-500/50'}`} />
                                <button className={`px-4 py-2 rounded-lg font-medium active:scale-95 transition shrink-0 ${isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] text-white' : 'text-zinc-900 bg-teal-500 hover:bg-teal-400'}`}>Apply</button>
                            </form>
                        </div>
                    ) : (
                        <div className={`w-full flex items-center justify-center gap-2 text-xs mt-2 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                            <p>Code: <span className={`font-semibold ml-1 ${isFashion ? 'text-[#8B6914]' : 'text-teal-400'}`}>{coupon.code?.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-400 transition cursor-pointer flex-shrink-0' />
                        </div>
                    )
                }
            </div>
            <div className={`flex justify-between py-4 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>
                <p>Total:</p>
                <p className={`font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>
                    <Protect plan={'plus'} fallback={`${currency}${coupon ? (totalPrice + 5 - (coupon.discount / 100 * totalPrice)).toFixed(2) : (totalPrice + 5).toLocaleString()}`}>
                    {currency}{coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)).toFixed(2) : totalPrice.toLocaleString()}
                    </Protect>
                </p>
            </div>
            <button onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'Placing order...' })} className={`w-full py-3.5 rounded-xl font-bold active:scale-[0.98] transition shadow-lg ${isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] text-white shadow-[#8B6914]/20' : 'text-zinc-900 bg-teal-400 hover:bg-teal-300 shadow-teal-500/20'}`}>Place Order</button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary