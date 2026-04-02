'use client'

import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Brain, Code, Sparkles, Zap, Database, Cpu, Network } from 'lucide-react'

export default function FashionPageClient() {

    const ref = useRef(null)

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    })

    const y = useTransform(scrollYProgress, [0, 1], [0, -120])

    const features = [
        { icon: Brain, title: 'AI Model Discovery', desc: 'Explore a wide range of AI models categorized for real-world applications and intelligent workflows.' },
        { icon: Code, title: 'Developer Integration', desc: 'Easily integrate AI APIs into applications with structured endpoints and modular design.' },
        { icon: Sparkles, title: 'Smart Recommendations', desc: 'Advanced filtering and intelligent suggestions improve user experience and efficiency.' },
        { icon: Zap, title: 'High Performance', desc: 'Optimized backend ensures fast response time and scalable execution of AI models.' },
    ]

    const techStack = [
        { icon: Code, name: 'Next.js / React (Frontend)' },
        { icon: Database, name: 'MongoDB (Database)' },
        { icon: Cpu, name: 'Node.js (Backend)' },
        { icon: Network, name: 'AI APIs & Integrations' },
    ]

    const team = [
        { name: 'Sri Vishnu Y S', role: '◆ Team Lead & Full Stack Developer' },
        { name: 'R Ram', role: '◆ Backend Developer' },
        { name: 'Raghu V', role: '◆ Frontend Developer' },
        { name: 'Rajasekar G', role: '◆ AI Integration Engineer' },
        { name: 'Sachin Acharya', role: '◆ UI/UX Designer' },
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white">

            {/* 🔥 HERO */}
            <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">

                {/* subtle glow */}
                <motion.div
                    style={{ y }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full"
                />

                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

                    {/* TEXT */}
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
                            AlgoMort
                            <span className="block text-gray-400 text-lg mt-3">
                                AI Marketplace for Tomorrow
                            </span>
                        </h1>

                        <p className="mt-6 text-lg text-gray-400 max-w-lg leading-relaxed">
                            AlgoMort is a next-generation AI marketplace designed to simplify the discovery,
                            integration, and deployment of artificial intelligence models. The platform enables
                            developers, businesses, and innovators to access powerful AI tools in one unified ecosystem.
                        </p>
                    </motion.div>

                    {/* LOGO (FIXED SMOOTH ANIMATION) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: [0, -15, 0],
                            rotate: [0, 1, 0, -1, 0]
                        }}
                        transition={{
                            duration: 30, // 🔥 slow smooth animation
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="flex justify-center"
                    >
                        <Image
                            src="/algomort-logo.png"
                            alt="AlgoMort Logo"
                            width={400}
                            height={400}
                            className="object-contain"
                            priority
                        />
                    </motion.div>

                </div>
            </section>

            {/* 🔥 FEATURES */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-bold mb-12">Platform Capabilities</h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05 }}
                            transition={{ delay: i * 0.2 }}
                            className="p-6 bg-[#111] rounded-2xl border border-white/10 hover:border-white/20"
                        >
                            <f.icon className="mb-4 text-white" />
                            <h3 className="font-semibold mb-2">{f.title}</h3>
                            <p className="text-sm text-gray-400">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 🔥 WORKFLOW */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-bold mb-12">System Workflow</h2>

                <div className="grid md:grid-cols-4 gap-6">
                    {["User Input", "Processing Layer", "AI Execution", "Output Delivery"].map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="p-6 bg-[#111] rounded-xl border border-white/10 text-center"
                        >
                            <div className="text-xl font-bold mb-2">{i + 1}</div>
                            <p className="text-gray-400">{step}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 🔥 TECH STACK */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-bold mb-12">Technology Stack</h2>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {techStack.map((t, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.1 }}
                            className="p-6 bg-[#111] rounded-xl border border-white/10 text-center"
                        >
                            <t.icon className="mx-auto mb-3" />
                            <p>{t.name}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 🔥 TEAM */}
            <section className="max-w-7xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-bold mb-12">Core Team</h2>

                <div className="grid md:grid-cols-3 gap-8">
                    {team.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05 }}
                            className="p-6 bg-[#111] rounded-xl border border-white/10 text-center"
                        >
                            <h3 className="font-semibold text-lg">{m.name}</h3>
                            <p className="text-gray-400 mt-2">{m.role}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 🔥 INTERNSHIP */}
            <section className="max-w-7xl mx-auto px-6 py-20 text-center">
                <h2 className="text-3xl font-bold mb-6">Internship & Mentorship</h2>

                <p className="text-gray-400 max-w-2xl mx-auto">
                    This project was developed under the guidance of <strong>Mr. Ranjith Kumar R</strong>,
                    CEO of MR. TECHLAB. The mentorship emphasized real-world AI system design,
                    scalable architecture, and practical implementation strategies.
                </p>

                <p className="text-gray-500 mt-4">
                    ACS College of Engineering
                </p>
            </section>

        </div>
    )
}