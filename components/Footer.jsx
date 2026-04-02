'use client'
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {Zap, Brain, Shield } from "lucide-react";

const Footer = () => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const MailIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.6654 4.66699L8.67136 8.48499C8.46796 8.60313 8.23692 8.66536 8.0017 8.66536C7.76647 8.66536 7.53544 8.60313 7.33203 8.48499L1.33203 4.66699M2.66536 2.66699H13.332C14.0684 2.66699 14.6654 3.26395 14.6654 4.00033V12.0003C14.6654 12.7367 14.0684 13.3337 13.332 13.3337H2.66536C1.92898 13.3337 1.33203 12.7367 1.33203 12.0003V4.00033C1.33203 3.26395 1.92898 2.66699 2.66536 2.66699Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const PhoneIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M9.22003 11.045C9.35772 11.1082 9.51283 11.1227 9.65983 11.086C9.80682 11.0493 9.93692 10.9636 10.0287 10.843L10.2654 10.533C10.3896 10.3674 10.5506 10.233 10.7357 10.1404C10.9209 10.0479 11.125 9.99967 11.332 9.99967H13.332C13.6857 9.99967 14.0248 10.1402 14.2748 10.3902C14.5249 10.6402 14.6654 10.9794 14.6654 11.333V13.333C14.6654 13.6866 14.5249 14.0258 14.2748 14.2758C14.0248 14.5259 13.6857 14.6663 13.332 14.6663C10.1494 14.6663 7.09719 13.4021 4.84675 11.1516C2.59631 8.90119 1.33203 5.84894 1.33203 2.66634C1.33203 2.31272 1.47251 1.97358 1.72256 1.72353C1.9726 1.47348 2.31174 1.33301 2.66536 1.33301H4.66536C5.01899 1.33301 5.35812 1.47348 5.60817 1.72353C5.85822 1.97358 5.9987 2.31272 5.9987 2.66634V4.66634C5.9987 4.87333 5.9505 5.07749 5.85793 5.26263C5.76536 5.44777 5.63096 5.60881 5.46536 5.73301L5.15336 5.96701C5.03098 6.06046 4.94471 6.1934 4.90923 6.34324C4.87374 6.49308 4.89122 6.65059 4.9587 6.78901C5.86982 8.63959 7.36831 10.1362 9.22003 11.045Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const MapPinIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66634C13.3346 9.99501 9.64197 13.4617 8.40197 14.5323C8.28645 14.6192 8.14583 14.6662 8.0013 14.6662C7.85677 14.6662 7.71615 14.6192 7.60064 14.5323C6.36064 13.4617 2.66797 9.99501 2.66797 6.66634C2.66797 5.25185 3.22987 3.8953 4.23007 2.89511C5.23026 1.89491 6.58681 1.33301 8.0013 1.33301C9.41579 1.33301 10.7723 1.89491 11.7725 2.89511C12.7727 3.8953 13.3346 5.25185 13.3346 6.66634Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M8.0013 8.66634C9.10587 8.66634 10.0013 7.77091 10.0013 6.66634C10.0013 5.56177 9.10587 4.66634 8.0013 4.66634C6.89673 4.66634 6.0013 5.56177 6.0013 6.66634C6.0013 7.77091 6.89673 8.66634 8.0013 8.66634Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const FacebookIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.9987 1.66699H12.4987C11.3936 1.66699 10.3338 2.10598 9.55242 2.88738C8.77102 3.66878 8.33203 4.72859 8.33203 5.83366V8.33366H5.83203V11.667H8.33203V18.3337H11.6654V11.667H14.1654L14.9987 8.33366H11.6654V5.83366C11.6654 5.61265 11.7532 5.40068 11.9094 5.2444C12.0657 5.08812 12.2777 5.00033 12.4987 5.00033H14.9987V1.66699Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.5846 5.41699H14.593M5.83464 1.66699H14.168C16.4692 1.66699 18.3346 3.53247 18.3346 5.83366V14.167C18.3346 16.4682 16.4692 18.3337 14.168 18.3337H5.83464C3.53345 18.3337 1.66797 16.4682 1.66797 14.167V5.83366C1.66797 3.53247 3.53345 1.66699 5.83464 1.66699ZM13.3346 9.47533C13.4375 10.1689 13.319 10.8772 12.9961 11.4995C12.6732 12.1218 12.1623 12.6265 11.536 12.9417C10.9097 13.2569 10.2 13.3667 9.50779 13.2553C8.81557 13.1439 8.1761 12.8171 7.68033 12.3213C7.18457 11.8255 6.85775 11.1861 6.74636 10.4938C6.63497 9.80162 6.74469 9.0919 7.05991 8.46564C7.37512 7.83937 7.87979 7.32844 8.50212 7.00553C9.12445 6.68261 9.83276 6.56415 10.5263 6.66699C11.2337 6.7719 11.8887 7.10154 12.3944 7.60725C12.9001 8.11295 13.2297 8.76789 13.3346 9.47533Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const TwitterIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M18.3346 3.33368C18.3346 3.33368 17.7513 5.08368 16.668 6.16701C18.0013 14.5003 8.83464 20.5837 1.66797 15.8337C3.5013 15.917 5.33464 15.3337 6.66797 14.167C2.5013 12.917 0.417969 8.00034 2.5013 4.16701C4.33464 6.33368 7.16797 7.58368 10.0013 7.50034C9.2513 4.00034 13.3346 2.00034 15.8346 4.33368C16.7513 4.33368 18.3346 3.33368 18.3346 3.33368Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)
    const LinkedinIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66699C14.6607 6.66699 15.9325 7.19378 16.8702 8.13146C17.8079 9.06914 18.3346 10.3409 18.3346 11.667V17.5003H15.0013V11.667C15.0013 11.225 14.8257 10.801 14.5131 10.4885C14.2006 10.1759 13.7767 10.0003 13.3346 10.0003C12.8926 10.0003 12.4687 10.1759 12.1561 10.4885C11.8436 10.801 11.668 11.225 11.668 11.667V17.5003H8.33464V11.667C8.33464 10.3409 8.86142 9.06914 9.7991 8.13146C10.7368 7.19378 12.0086 6.66699 13.3346 6.66699Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M5.0013 7.50033H1.66797V17.5003H5.0013V7.50033Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> <path d="M3.33464 5.00033C4.25511 5.00033 5.0013 4.25413 5.0013 3.33366C5.0013 2.41318 4.25511 1.66699 3.33464 1.66699C2.41416 1.66699 1.66797 2.41318 1.66797 3.33366C1.66797 4.25413 2.41416 5.00033 3.33464 5.00033Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> </svg>)

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isFashion = pathname?.startsWith('/fashion') || searchParams?.get('from') === 'fashion';

    const linkSections = [
        {
            title: "MODELS",
            links: [
                { text: "NLP", path: '/shop?category=Earbuds', icon: null },
                { text: "GENERATIVE AI", path: '/shop?category=Headphones', icon: null },
                { text: "VISION AI", path: '/shop', icon: null },
                { text: "ALL", path: '/shop?category=Laptops', icon: null },
            ]
        },
        {
            title: "WEBSITE",
            links: [
                { text: "Home", path: '/', icon: null },
                { text: "Privacy Policy", path: '/', icon: null },
                { text: "Become A Developer", path: '/pricing', icon: null },
                { text: "Buy and Sell Your and Our Models", path: '/create-store', icon: null },
            ]
        },
        {
            title: "CONTACT",
            links: [
                { text: "+7019883621", path: '/', icon: PhoneIcon },
                { text: "vijayadas748@gmail.com", path: '/', icon: MailIcon },
                { text: "Bengaluru, Karnataka", path: '/', icon: MapPinIcon }
            ]
        }
    ];

    const socialIcons = [
        { icon: FacebookIcon, link: "https://www.facebook.com" },
        { icon: InstagramIcon, link: "https://www.instagram.com" },
        { icon: TwitterIcon, link: "https://twitter.com" },
        { icon: LinkedinIcon, link: "https://www.linkedin.com" },
    ];

    const trustBadges = [
        { label: "Fast AI Responses", desc: "Instant Results", Icon: Zap },
        { label: "Advanced Models", desc: "Cutting-edge AI-Tools", Icon: Brain },
        { label: "Secure & Private", desc: "Your Data is protected", Icon: Shield },
    ];

    return (
        <footer className={isFashion ? 'bg-[#f0e8dc] border-t border-[#d4c4a8]/30' : 'bg-[#0a0a0b] border-t border-zinc-800/80'}>
            {/* Brand trust section */}
            <div className={isFashion ? 'border-b border-[#d4c4a8]/30' : 'border-b border-zinc-800/80'}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {trustBadges.map((badge, i) => {
                            const Icon = badge.Icon;
                            return (
                            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl ${isFashion ? 'bg-white border border-[#d4c4a8]/30' : 'bg-zinc-900/50 border border-zinc-800/60'}`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    isFashion ? 'bg-[#8B6914]/10 text-[#8B6914]' : 'bg-teal-500/20 text-teal-400'
                                }`}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>{badge.label}</p>
                                    <p className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>{badge.desc}</p>
                                </div>
                            </div>
                        );})}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className={`flex flex-col md:flex-row items-start justify-between gap-10 py-12 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                    <div className="max-w-md">
                        <Link href={isFashion ? '/fashion' : '/'} className={`text-2xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>
                            <span className={isFashion ? 'text-[#8B6914]' : 'text-teal-400'}>ALgo</span>MOrt<span className={isFashion ? 'text-[#8B6914]' : 'text-teal-400'}>.</span>
                        </Link>
                        <p className={`mt-4 text-sm leading-relaxed ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>
                            {isFashion ? 'Your destination for timeless fashion. From outerwear and dresses to accessories — curated for elegance.' : 'Your destination for the latest gadgets. From smartphones and smartwatches to accessories — all in one place.'}
                        </p>
                        <div className="flex items-center gap-2 mt-5">
                            {socialIcons.map((item, i) => (
                                <Link href={item.link} key={i} className={`flex items-center justify-center w-10 h-10 rounded-xl border transition ${
                                    isFashion ? 'bg-white border-[#d4c4a8]/40 text-[#8B7355] hover:text-[#8B6914] hover:border-[#8B6914]/30' : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-teal-400 hover:border-teal-500/40'
                                }`}>
                                    <item.icon />
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-between w-full md:w-[50%] gap-8 text-sm">
                        {linkSections.map((section, index) => (
                            <div key={index}>
                                <h3 className={`font-semibold mb-4 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>{section.title}</h3>
                                <ul className="space-y-3">
                                    {section.links.map((link, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            {link.icon && <span className={isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}><link.icon /></span>}
                                            <Link href={link.path} className={`transition ${
                                                isFashion ? 'hover:text-[#8B6914]' : 'hover:text-teal-400'
                                            }`}>{link.text}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <p className={`py-6 text-sm ${isFashion ? 'text-[#8B7355]/60 border-t border-[#d4c4a8]/30' : 'text-zinc-500 border-t border-zinc-800/80'}`}>
                    Copyright 2025 © gocart. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
