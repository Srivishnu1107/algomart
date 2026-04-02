import React from 'react'
import Title from './Title'
import { ourSpecsData } from '@/assets/assets'

const OurSpecs = () => {
    return (
        <div className="px-4 sm:px-6 py-12 max-w-7xl mx-auto">
            <Title
                visibleButton={false}
                title="Our Specifications"
                description="We offer top-tier service and convenience to ensure your shopping experience is smooth, secure and hassle-free."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                {ourSpecsData.map((spec, index) => (
                    <div
                        key={index}
                        className="relative h-44 px-6 flex flex-col items-center justify-center w-full text-center rounded-xl border border-zinc-700/80 bg-zinc-900/60 group hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 transition backdrop-blur-sm"
                    >
                        <div
                            className="absolute -top-5 size-12 flex items-center justify-center rounded-xl text-white group-hover:scale-105 transition"
                            style={{ backgroundColor: spec.accent }}
                        >
                            <spec.icon size={24} />
                        </div>
                        <h3 className="text-zinc-100 font-semibold mt-2">{spec.title}</h3>
                        <p className="text-sm text-zinc-500 mt-2 px-2">{spec.description}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default OurSpecs
