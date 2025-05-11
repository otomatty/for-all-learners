"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw } from "lucide-react";

interface SpeechControlButtonsProps {
	onReadAloud: () => void;
	onPauseReadAloud: () => void;
	onResetReadAloud: () => void;
	isPlaying: boolean;
}

export function SpeechControlButtons({
	onReadAloud,
	onPauseReadAloud,
	onResetReadAloud,
	isPlaying,
}: SpeechControlButtonsProps) {
	const buttonBaseStyle =
		"p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
	const iconStyle = "w-5 h-5";

	return (
		<div className="flex items-center ml-2 space-x-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-md">
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={onReadAloud}
						className={buttonBaseStyle}
						aria-label="ページを読み上げる"
						disabled={isPlaying}
					>
						<Play className={iconStyle} />
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<p>ページを読み上げる</p>
				</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={onPauseReadAloud}
						className={buttonBaseStyle}
						aria-label="読み上げを一時停止"
						disabled={!isPlaying}
					>
						<Pause className={iconStyle} />
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<p>読み上げを一時停止</p>
				</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={onResetReadAloud}
						className={buttonBaseStyle}
						aria-label="読み上げをリセット"
					>
						<RotateCcw className={iconStyle} />
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<p>読み上げをリセット</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
