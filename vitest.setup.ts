/**
 * Vitest Setup File
 * テスト実行前のグローバルセットアップ
 */

import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";

// Make React available globally for JSX
global.React = React;

// Set up required environment variables for tests
process.env.ENCRYPTION_KEY =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars (32 bytes)

// Mock Next.js Image component
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		...props
	}: {
		src: string;
		alt: string;
		[key: string]: unknown;
	}) => {
		return React.createElement("img", { src, alt, ...props });
	},
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => {
		return React.createElement("a", { href, ...props }, children);
	},
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({}),
}));

// Cleanup after each test
afterEach(() => {
	vi.clearAllMocks();
});

// Mock window.matchMedia (for responsive components)
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver
	implements IntersectionObserver
{
	readonly root: Element | Document | null = null;
	readonly rootMargin: string = "";
	readonly thresholds: ReadonlyArray<number> = [];

	disconnect() {}
	observe() {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
	unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver implements ResizeObserver {
	disconnect() {}
	observe() {}
	unobserve() {}
};

// Suppress console errors in tests (optional)
// Uncomment if you want cleaner test output
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args: any[]) => {
//     if (
//       typeof args[0] === 'string' &&
//       args[0].includes('Warning: ReactDOM.render')
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });

// afterAll(() => {
//   console.error = originalError;
// });
