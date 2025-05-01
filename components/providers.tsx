"use client";

import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

interface ProvidersProps {
	children: React.ReactNode;
	theme: string;
	mode: "light" | "dark" | "system";
}

export function Providers({ children, theme, mode }: ProvidersProps) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme={`theme-${theme}`}
			enableSystem={mode === "system"}
			disableTransitionOnChange
		>
			{children}
			<Toaster />
		</ThemeProvider>
	);
}
