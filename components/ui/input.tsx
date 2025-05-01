import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
	variant?: "default" | "borderless";
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, variant = "default", ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn(
					"flex h-auto w-full rounded-md px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
					variant === "borderless"
						? "border-none bg-transparent"
						: "border border-input bg-background",
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = "Input";

export { Input };
