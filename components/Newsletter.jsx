import React from 'react'
import Title from './Title'

const Newsletter = () => {
    return (
        <div className="flex flex-col items-center mx-4 my-16 py-12 px-6 rounded-2xl bg-zinc-900/60 border border-zinc-700/80 max-w-4xl mx-auto backdrop-blur-sm">
            <Title title="Join Newsletter" description="Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week." visibleButton={false} />
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl mt-6">
                <input
                    className="flex-1 px-5 py-3.5 rounded-xl bg-zinc-800/80 border border-zinc-600/80 text-zinc-100 placeholder-zinc-500 outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition"
                    type="email"
                    placeholder="Enter your email address"
                />
                <button className="font-bold bg-teal-400 text-zinc-900 px-8 py-3.5 rounded-xl hover:bg-teal-300 transition shadow-xl shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98]">
                    Get Updates
                </button>
            </div>
        </div>
    )
}

export default Newsletter
