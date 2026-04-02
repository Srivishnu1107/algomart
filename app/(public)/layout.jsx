'use client'

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useUser } from "@clerk/nextjs";
import { AskAiProvider, useAskAi } from "@/contexts/AskAiContext";
import { usePathname, useSearchParams } from "next/navigation";

const HEADER_OFFSET = 100;
const NAVBAR_HEIGHT = 80;

function PublicLayoutContent({ children }) {
    const dispatch = useDispatch();
    const { user } = useUser();
    const { isOpen } = useAskAi();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isFashion =
        pathname?.startsWith('/fashion') ||
        searchParams?.get('from') === 'fashion';

    // 🎨 Theme handling (safe)
    useEffect(() => {
        document.body.style.backgroundColor = isFashion ? '#faf5f0' : '#0a0a0b';
        document.body.style.color = isFashion ? '#2d1810' : '';
        return () => {
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
        };
    }, [isFashion]);

    // 🧠 Fetch products ONLY (safe)

    return (
        <>
            <Navbar />

            <div
                className="transition-[padding-top] duration-200"
                style={{ paddingTop: NAVBAR_HEIGHT }}
            >
                {children}
                <Footer />
            </div>

            {/* 🤖 AI Drawer */}
            <aside
                id="ask-ai-drawer"
                className={`fixed right-0 z-[100] w-[420px] border-l backdrop-blur-xl rounded-l-[28px] overflow-hidden
                    transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${isFashion
                        ? 'border-[#d4c4a8]/50 bg-[#faf5f0]/[0.98]'
                        : 'border-zinc-700/50 bg-[#0a0a0b]/[0.98]'
                }`}
                style={{
                    top: HEADER_OFFSET,
                    height: `calc(100vh - ${HEADER_OFFSET}px)`,
                    transform: isOpen ? "translateX(0)" : "translateX(100%)",
                }}
            />
        </>
    );
}

export default function PublicLayout({ children }) {
    return (
        <AskAiProvider>
            <PublicLayoutContent>{children}</PublicLayoutContent>
        </AskAiProvider>
    );
}