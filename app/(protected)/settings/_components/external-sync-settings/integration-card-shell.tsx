"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	AlertCircle,
	Check,
	ChevronDown,
	ChevronUp,
	LinkIcon,
} from "lucide-react";
import React, {
	type ReactNode,
	useState,
	useRef,
	useEffect,
	useCallback,
} from "react";

export type ServiceStatus = "connected" | "disconnected" | "error";

interface IntegrationCardShellProps {
	name: string;
	description: string;
	logoSrc: string;
	status: ServiceStatus;
	isLoading: boolean;
	isConnected: boolean;
	onConnect: () => void;
	onDisconnect: () => void;
	children?: ReactNode;
}

export default function IntegrationCardShell({
	name,
	description,
	logoSrc,
	status,
	isLoading,
	isConnected,
	onConnect,
	onDisconnect,
	children,
}: IntegrationCardShellProps) {
	const [isExpanded, setIsExpanded] = useState(status === "error");
	const [contentHeight, setContentHeight] = useState<number | undefined>(
		undefined,
	);
	const [isAnimating, setIsAnimating] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	const toggleExpand = useCallback(() => {
		if (!isExpanded && contentRef.current) {
			setContentHeight(contentRef.current.scrollHeight + 20);
		}
		setIsExpanded((prev) => !prev);
	}, [isExpanded]);

	useEffect(() => {
		if (contentRef.current && isExpanded) {
			setContentHeight(contentRef.current.scrollHeight + 20);
		}
	}, [isExpanded]);

	useEffect(() => {
		if (isExpanded) {
			setIsAnimating(true);
			if (contentRef.current) {
				setContentHeight(contentRef.current.scrollHeight + 20);
			}
			const timer = setTimeout(() => setIsAnimating(false), 300);
			return () => clearTimeout(timer);
		}
	}, [isExpanded]);

	const renderStatus = () => {
		switch (status) {
			case "connected":
				return (
					<div className="flex items-center text-green-600">
						<Check className="w-4 h-4 mr-1" />
						<span>連携済み</span>
					</div>
				);
			case "disconnected":
				return (
					<div className="flex items-center text-gray-500">
						<LinkIcon className="w-4 h-4 mr-1" />
						<span>未連携</span>
					</div>
				);
			case "error":
				return (
					<div className="flex items-center text-red-600">
						<AlertCircle className="w-4 h-4 mr-1" />
						<span>エラー</span>
					</div>
				);
		}
	};

	return (
		<Card
			className={`overflow-hidden transition-all duration-200 ${
				status === "error" ? "border-red-300 bg-red-50" : ""
			}`}
		>
			<CardContent>
				<div
					className="flex items-start cursor-pointer w-full bg-transparent border-0 p-0 text-left"
					onClick={toggleExpand}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggleExpand();
						}
					}}
				>
					<img
						src={logoSrc}
						alt={`${name} logo`}
						className="w-10 h-10 rounded mr-3"
					/>
					<div className="flex-1">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold">{name}</h3>
								<p className="text-sm text-gray-600">{description}</p>
							</div>
							<div className="flex items-center justify-end min-w-32">
								{renderStatus()}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										toggleExpand();
									}}
									className="p-2 hover:bg-gray-100 rounded-full transition-transform duration-300"
									aria-label={isExpanded ? "折りたたむ" : "展開する"}
								>
									{isExpanded ? (
										<ChevronUp
											className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
												isAnimating ? "" : ""
											}`}
										/>
									) : (
										<ChevronDown
											className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
												isAnimating ? "rotate-180" : ""
											}`}
										/>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
				<div
					className={`overflow-hidden transition-all duration-300 ease-in-out my-4 ${
						isExpanded ? "opacity-100" : "opacity-0"
					}`}
					style={{
						maxHeight: isExpanded
							? contentHeight
								? `${contentHeight}px`
								: "2000px"
							: "0",
						visibility: isExpanded ? "visible" : "hidden",
					}}
				>
					<div
						ref={contentRef}
						className={`transform transition-transform duration-300 ${
							isExpanded ? "translate-y-0" : "-translate-y-2"
						}`}
					>
						{children}
						{/* Connect / Disconnect buttons */}
						<div className="flex justify-end space-x-2">
							{isConnected ? (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="outline"
											className="text-red-600 hover:text-red-800 hover:bg-red-50"
											disabled={isLoading}
										>
											<LinkIcon className="w-4 h-4 mr-1" />
											連携解除
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												{name}との連携を解除しますか？
											</AlertDialogTitle>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>いいえ</AlertDialogCancel>
											<AlertDialogAction
												onClick={onDisconnect}
												className="bg-red-600 hover:bg-red-700"
											>
												はい
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							) : (
								<Button onClick={onConnect} disabled={isLoading}>
									{isLoading ? (
										<>
											<span className="animate-spin mr-2">⏳</span>処理中...
										</>
									) : (
										"連携する"
									)}
								</Button>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
