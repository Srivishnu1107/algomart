import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export const metadata = {
    title: "AlgoMart - AI Marketplace ",
    description: "AlgoMart - Explore, try and download AI models",
};

export const viewport = {
    width: "device-width",
    initialScale: 1, // ✅ fixed (0.9 can cause issues)
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body className={`${inter.className} antialiased bg-[#0a0a0b] text-zinc-100`}>
                    <StoreProvider>
                        <Toaster />
                        {children}
                    </StoreProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}