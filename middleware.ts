import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes for unauthenticated users
const PUBLIC_PATHS = [
	"/",
	"/auth/login",
	"/auth/callback",
	"/features",
	"/pricing",
	"/guides",
	"/faq",
	"/inquiry",
	"/changelog",
	"/milestones",
];

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// Skip assets and Next.js internals
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon.ico") ||
		pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
	) {
		return NextResponse.next();
	}

	// Initialize Supabase auth client with SSR helper
	const res = NextResponse.next();
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL || "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
		{
			cookies: {
				getAll: () =>
					req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
				setAll: (cookiesToSet) => {
					for (const { name, value, options } of cookiesToSet) {
						res.cookies.set(name, value, options);
					}
				},
			},
		},
	);
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const isAuthenticated = Boolean(session);

	const isPublicPath = PUBLIC_PATHS.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);

	// Unauthenticated users trying to access private routes
	if (!isAuthenticated && !isPublicPath) {
		return NextResponse.redirect(new URL("/auth/login", req.url));
	}

	return res;
}

export const config = {
	matcher: ["/:path*"],
};
