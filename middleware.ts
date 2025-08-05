// middleware.ts

// This middleware gates every route except the ones you explicitly list 
// (or that match your regex helpers), letting anonymous users see contract pages,
//  sign contracts, or hit certain API endpoints, while forcing authentication everywhere
//  else and cleanly ignoring static asset requests.


import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    
    // Define public routes that don't require authentication
    const publicPaths = [
      '/contracts/sign',
      '/thank-you',
      '/auth/signin',
      '/auth/signup',
      '/auth/error',
      '/contracts/help',
      '/',
    ];
    
    // Define public API routes
    const publicApiPaths = [
      '/api/contracts/validate-token',
      '/api/contracts/[id]/sign',
      '/api/contracts/[id]/finalize',
      '/api/contracts/[id]/pdf',
      '/api/contracts/[id]',
      '/api/contracts/generate',
    ];
    
    // Check for dynamic sign path
    const isDynamicSignPath = /^\/contracts\/[^\/]+\/sign/.test(pathname);
    
    // Check for contract viewing path (allow anonymous access to view contracts)
    const isContractViewPath = /^\/contracts\/[^\/]+$/.test(pathname) && !pathname.includes('/sign');
    
    // Check if it's a public page route
    const isPublicPage = publicPaths.some(path => pathname.startsWith(path)) || isDynamicSignPath || isContractViewPath;
    
    // Check if it's a public API route
    const isPublicApi = publicApiPaths.some(path => {
      const regex = new RegExp('^' + path.replace(/\[.*?\]/g, '[^/]+') + '$');
      return regex.test(pathname);
    });
    
    if (isPublicPage || isPublicApi) {
      return NextResponse.next();
    }
    
    // For authenticated routes, continue with auth check
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        
        // Public paths
        const publicPaths = [
          '/contracts/sign',
          '/thank-you',
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/',
        ];
        
        // Allow public paths
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true;
        }
        
        // Allow contract viewing paths (anonymous access)
        const isContractViewPath = /^\/contracts\/[^\/]+$/.test(pathname) && !pathname.includes('/sign');
        if (isContractViewPath) {
          return true;
        }
        
        // Require authentication for other routes
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};