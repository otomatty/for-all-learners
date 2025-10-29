import React, {
	type ButtonHTMLAttributes,
	type ReactElement,
	type SVGProps,
} from "react";

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** アイコン (lucide-react のコンポーネント) */
	icon: ReactElement<SVGProps<SVGSVGElement>>;
	/** ボタンテキスト */
	text: string;
}

export default function ToolbarButton({
	icon,
	text,
	className = "",
	...props
}: ToolbarButtonProps) {
	return (
		<button
			type="button"
			className={`text-left p-2 rounded-md hover:bg-accent flex items-center space-x-2 ${className}`}
			{...props}
		>
			{React.cloneElement(icon, { className: "w-4 h-4" })}
			<span>{text}</span>
		</button>
	);
}
