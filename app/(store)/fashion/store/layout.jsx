import StoreLayout from "@/components/store/StoreLayout";
import { SignedIn, SignedOut, SignIn } from "@clerk/nextjs";

export const dynamic = 'force-dynamic'

export const metadata = {
    title: "GoCart. - Fashion Store Dashboard",
    description: "GoCart. - Fashion Store Dashboard",
};

export default function FashionStoreLayout({ children }) {
    return (
        <>
            <SignedIn>
                <StoreLayout>
                    {children}
                </StoreLayout>
            </SignedIn>
            <SignedOut>
                <div className="min-h-screen flex items-center justify-center">
                    <SignIn fallbackRedirectUrl="/fashion/store" routing="hash" />
                </div>
            </SignedOut>
        </>
    );
}
