"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { Toaster } from "sonner";

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
				{children}
				<Toaster />
			</ThemeProvider>
		</QueryClientProvider>
	);
}
