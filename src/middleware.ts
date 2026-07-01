import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login',
  '/login/(.*)',
  '/driver-app/login',
  '/driver-app/login/(.*)',
  '/api/integrations/telegram/webhook',
  '/api/integrations/gmail/webhook',
  '/api/integrations/ringcentral/webhook',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
