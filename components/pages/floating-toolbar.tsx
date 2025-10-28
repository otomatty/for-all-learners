"use client";

import { MoreVertical, Pause, Volume2 } from "lucide-react";
import React, { useRef, useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { DeletePageDialog } from "./delete-page-dialog";
import ToolbarButton from "./toolbar-button";
import {
	createToolbarMenuItems,
	type ToolbarAction,
	type ToolbarMenuItemsProps,
} from "./toolbar-menu-items";

interface FloatingToolbarProps extends ToolbarMenuItemsProps {}

export default function FloatingToolbar(props: FloatingToolbarProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleCreateNewPage = () => {
		if (props.noteSlug) {
			window.location.href = `/notes/${encodeURIComponent(props.noteSlug)}/new`;
		} else {
			window.location.href = "/pages/new";
		}
	};

	const handleShowDeleteConfirm = () => {
		setShowDeleteConfirm(true);
	};

	const handleOpenImageUpload = () => {
		fileInputRef.current?.click();
	};

	const menuItems = createToolbarMenuItems({
		...props,
		onCreateNewPage: handleCreateNewPage,
		onShowDeleteConfirm: handleShowDeleteConfirm,
		onOpenImageUpload: handleOpenImageUpload,
	});

	const renderToolbarAction = (action: ToolbarAction) => {
		const IconComponent = action.icon;

		return (
			<button
				key={action.id}
				type="button"
				className={`w-6 h-6 cursor-pointer bg-transparent border-none p-0 ${
					action.disabled ? "opacity-50 cursor-not-allowed" : ""
				} ${action.className || "text-gray-600 hover:text-gray-800"}`}
				onClick={action.onClick}
				disabled={action.disabled}
				title={action.label}
			>
				<IconComponent className="w-full h-full" />
			</button>
		);
	};

	return (
		<>
			<input
				type="file"
				ref={fileInputRef}
				hidden
				accept="image/png,image/jpeg,image/webp,image/gif"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) props.onUploadImage(file);
					e.target.value = "";
				}}
			/>
			<div className="sticky top-16 right-4 flex flex-col gap-4 z-50 p-4 bg-background rounded-lg border border-border w-fit h-fit">
				{/* Primary Actions */}
				{menuItems.primaryActions.map(renderToolbarAction)}

				{/* Audio Actions Popover */}
				<Popover>
					<PopoverTrigger asChild>
						{props.isPlaying ? (
							<Pause className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
						) : (
							<Volume2 className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
						)}
					</PopoverTrigger>
					<PopoverContent side="left" className="flex flex-col p-2 gap-1">
						{menuItems.audioActions.map((action) => (
							<ToolbarButton
								key={action.id}
								icon={<action.icon />}
								text={action.label}
								onClick={action.onClick}
								disabled={action.disabled}
								className={action.className}
							/>
						))}
					</PopoverContent>
				</Popover>

				{/* More Actions Popover */}
				<Popover>
					<PopoverTrigger asChild>
						<MoreVertical className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
					</PopoverTrigger>
					<PopoverContent side="left" className="flex flex-col p-2 gap-1">
						{menuItems.moreActions.map((action) => (
							<ToolbarButton
								key={action.id}
								icon={<action.icon />}
								text={action.label}
								onClick={action.onClick}
								disabled={action.disabled}
								className={action.className}
							/>
						))}
					</PopoverContent>
				</Popover>
			</div>
			<DeletePageDialog
				isOpen={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				pageTitle={props.title}
				onConfirmDelete={async () => {
					await props.onDeletePage();
					setShowDeleteConfirm(false);
				}}
			/>
		</>
	);
}
