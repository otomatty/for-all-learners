import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

// Mock Supabase client
export const mockSupabaseClient = {
	auth: {
		getUser: vi.fn(),
	},
	from: vi.fn(),
	rpc: vi.fn(),
} as unknown as SupabaseClient;

vi.mock("@/lib/supabase/client", () => ({
	createClient: vi.fn(() => mockSupabaseClient),
}));

export function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

export function renderHookWithProvider<T>(
	hook: () => T,
	options?: Parameters<typeof renderHook>[1],
) {
	return renderHook(hook, {
		wrapper: createWrapper(),
		...options,
	});
}
