import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

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
		pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|json)$/)
	) {
		return NextResponse.next();
	}

	// Redirect old /pages routes to /notes/default
	if (pathname === "/pages") {
		return NextResponse.redirect(new URL("/notes/default", req.url));
	}

	if (pathname === "/pages/new") {
		return NextResponse.redirect(new URL("/notes/default/new", req.url));
	}

	// Redirect /pages/[id] to /notes/default/[id]
	if (pathname.startsWith("/pages/")) {
		const pageId = pathname.replace("/pages/", "");
		// Handle generate-cards route
		if (pageId.includes("/generate-cards")) {
			const id = pageId.replace("/generate-cards", "");
			return NextResponse.redirect(
				new URL(`/notes/default/${id}/generate-cards`, req.url),
			);
		}
		// Regular page route
		return NextResponse.redirect(new URL(`/notes/default/${pageId}`, req.url));
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
