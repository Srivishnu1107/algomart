import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't need Clerk authentication
// These routes are excluded from Clerk middleware to prevent timeouts
const isPublicRoute = createRouteMatcher([
  '/',
  '/shop(.*)',
  '/fashion(.*)',
  '/api/stripe(.*)', // Stripe webhooks
  '/api/inngest(.*)', // Inngest webhooks
  '/api/behavior/track(.*)', // Public tracking endpoint
  '/api/recommendations(.*)', // Public recommendations
  '/api/deals-of-the-day(.*)', // Public deals
  '/api/stores(.*)', // Public store listings
  '/api/home-banners(.*)', // Public banners
  '/api/hero-slides(.*)', // Public hero slides
  '/api/wishlist(.*)', // Auth checked inside route; avoid middleware 404
  '/api/admin/notices(.*)', // Admin auth checked inside route; avoid middleware 404
]);

export default clerkMiddleware(async (auth, request) => {
  // Skip Clerk processing for public routes to prevent middleware timeouts
  // Only protect routes that actually need authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Only run for protected API routes (exclude public routes)
    '/(api|trpc)(.*)',
  ],
};