"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { Toaster } from "sonner";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { LLMProviderProvider } from "@/lib/contexts/LLMProviderContext";

interface ProvidersProps {
	children: React.ReactNode;
	theme: string;
	mode: "light" | "dark" | "system";
}

export function Providers({ children, theme, mode }: ProvidersProps) {
	const [queryClient] = useState(() => new QueryClient());
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider
				attribute="class"
				defaultTheme={`theme-${theme}`}
				enableSystem={mode === "system"}
				disableTransitionOnChange
			>
				<LLMProviderProvider>
					<ServiceWorkerProvider />
					{children}
					<Toaster />
				</LLMProviderProvider>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
