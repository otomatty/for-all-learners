import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, type Locale, locales } from "@/i18n/config";
import { buildCSPHeader, generateNonce } from "@/lib/utils/csp";
import type { Database } from "@/types/database.types";

// Tauri静的エクスポート対応のため、next-intlのミドルウェアは使用しない
// 動的ルート（[locale]）は静的エクスポートで使用できないため、
// ロケール情報はCookieとAccept-Languageヘッダーで管理し、
// URLリライトは行わない

/**
 * Accept-Languageヘッダーからロケールを検出
 */
function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
	if (!acceptLanguage) return defaultLocale;

	// Accept-Languageヘッダーをパースして優先度順にソート
	const languages = acceptLanguage
		.split(",")
		.map((lang) => {
			const [code, qValue] = lang.trim().split(";q=");
			return {
				code: code.split("-")[0].toLowerCase(), // "en-US" -> "en"
				q: qValue ? Number.parseFloat(qValue) : 1,
			};
		})
		.sort((a, b) => b.q - a.q);

	// 対応するロケールを探す
	for (const lang of languages) {
		if (locales.includes(lang.code as Locale)) {
			return lang.code as Locale;
		}
	}

	return defaultLocale;
}

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
	"/privacy",
	"/terms",
];

export async function middleware(req: NextRequest) {
	const { pathname, searchParams } = req.nextUrl;

	// Skip assets, Next.js internals, and API routes
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon.ico") ||
		pathname.startsWith("/api") ||
		pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|json)$/)
	) {
		return NextResponse.next();
	}

	// ルートパス（/）でcodeパラメータが存在する場合、/auth/callbackにリダイレクト
	// これは、SupabaseがredirectToを無視して本番URLにリダイレクトした場合のフォールバック
	if (pathname === "/" && searchParams.has("code")) {
		const callbackUrl = new URL("/auth/callback", req.url);
		// すべてのクエリパラメータを保持
		searchParams.forEach((value, key) => {
			callbackUrl.searchParams.set(key, value);
		});
		// Tauriコールバックの場合、tauri=trueパラメータを追加
		if (!callbackUrl.searchParams.has("tauri")) {
			callbackUrl.searchParams.set("tauri", "true");
		}
		return NextResponse.redirect(callbackUrl);
	}

	// Redirect /settings/api-keys to /settings (LLM settings tab)
	if (pathname === "/settings/api-keys") {
		return NextResponse.redirect(new URL("/settings?tab=llm", req.url));
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

	// ロケール検出: Cookie優先、なければAccept-Languageヘッダーから検出
	const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value as
		| Locale
		| undefined;
	const detectedLocale =
		cookieLocale && locales.includes(cookieLocale)
			? cookieLocale
			: detectLocaleFromHeader(req.headers.get("accept-language"));

	// 認証チェック用にSupabaseクライアントを初期化
	// intlMiddlewareを使用せず、NextResponse.next()をベースにする
	const res = NextResponse.next();

	// ロケールをCookieに保存（未設定または変更があった場合）
	if (!cookieLocale || cookieLocale !== detectedLocale) {
		res.cookies.set("NEXT_LOCALE", detectedLocale, {
			path: "/",
			sameSite: "lax",
		});
	}

	// Initialize Supabase auth client with SSR helper
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

	// Strip locale prefix from pathname for route matching
	const pathnameWithoutLocale =
		pathname.replace(new RegExp(`^/(${locales.join("|")})`), "") || "/";

	const isPublicPath = PUBLIC_PATHS.some(
		(path) =>
			pathnameWithoutLocale === path ||
			pathnameWithoutLocale.startsWith(`${path}/`),
	);

	// Unauthenticated users trying to access private routes
	if (!isAuthenticated && !isPublicPath) {
		return NextResponse.redirect(new URL("/auth/login", req.url));
	}

	// Content Security Policy (CSP) for plugin system security
	// Strict CSP without unsafe-inline and unsafe-eval
	// Uses nonce-based approach for inline scripts/styles
	// Generates a new nonce per request for security
	const nonce = generateNonce();
	// Pass request host header to detect Tauri dev mode
	const requestHost = req.headers.get("host");
	const cspHeader = buildCSPHeader(nonce, requestHost);

	res.headers.set("Content-Security-Policy", cspHeader);

	// Store nonce in response headers for use in pages/components
	// Note: Next.js pages can access this via headers() if needed
	res.headers.set("X-Nonce", nonce);
	res.headers.set("X-Content-Type-Options", "nosniff");
	res.headers.set("X-Frame-Options", "DENY");
	res.headers.set("X-XSS-Protection", "1; mode=block");
	res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

	return res;
}

export const config = {
	matcher: ["/((?!_next|.*\\..*).*)"],
};
