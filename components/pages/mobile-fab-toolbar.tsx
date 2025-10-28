"use client";

import { Menu, Pause, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { DeletePageDialog } from "./delete-page-dialog";
import {
	createToolbarMenuItems,
	type ToolbarAction,
	type ToolbarMenuItemsProps,
} from "./toolbar-menu-items";

interface MobileFabToolbarProps extends ToolbarMenuItemsProps {}

export default function MobileFabToolbar(props: MobileFabToolbarProps) {
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleCreateNewPage = () => {
		if (props.noteSlug) {
			window.location.href = `/notes/${encodeURIComponent(props.noteSlug)}/new`;
		} else {
			window.location.href = "/pages/new";
		}
		setIsSheetOpen(false);
	};

	const handleShowDeleteConfirm = () => {
		setShowDeleteConfirm(true);
		setIsSheetOpen(false);
	};

	const handleOpenImageUpload = () => {
		fileInputRef.current?.click();
		setIsSheetOpen(false);
	};

	const menuItems = createToolbarMenuItems({
		...props,
		onCreateNewPage: handleCreateNewPage,
		onShowDeleteConfirm: handleShowDeleteConfirm,
		onOpenImageUpload: handleOpenImageUpload,
	});

	const renderActionButton = (action: ToolbarAction) => {
		const IconComponent = action.icon;

		return (
			<Button
				key={action.id}
				variant="ghost"
				className={`w-full justify-start h-12 ${action.className || ""}`}
				onClick={() => {
					action.onClick();
					if (action.id !== "delete-page" && action.id !== "upload-image") {
						setIsSheetOpen(false);
					}
				}}
				disabled={action.disabled}
			>
				<IconComponent className="w-5 h-5 mr-3" />
				{action.label}
			</Button>
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

			{/* FAB (Floating Action Button) */}
			<div className="fixed bottom-6 right-6 z-50">
				<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<Button
							size="lg"
							className="w-14 h-14 rounded-full shadow-lg"
							aria-label="メニューを開く"
						>
							<Menu className="w-6 h-6" />
						</Button>
					</SheetTrigger>
					<SheetContent
						side="bottom"
						className="h-auto max-h-[80vh] flex flex-col"
					>
						<SheetHeader className="flex-shrink-0">
							<SheetTitle>ページアクション</SheetTitle>
						</SheetHeader>

						<div className="grid gap-2 py-4 overflow-y-auto flex-1 min-h-0">
							{/* Primary Actions */}
							<div className="space-y-1">
								{menuItems.primaryActions.map(renderActionButton)}
							</div>

							<Separator />

							{/* Audio Actions */}
							<div className="space-y-1">
								<div className="flex items-center space-x-2 px-3 py-2">
									{props.isPlaying ? (
										<Pause className="w-4 h-4 text-muted-foreground" />
									) : (
										<Volume2 className="w-4 h-4 text-muted-foreground" />
									)}
									<span className="text-sm font-medium text-muted-foreground">
										音声
									</span>
								</div>
								{menuItems.audioActions.map(renderActionButton)}
							</div>

							<Separator />

							{/* More Actions */}
							<div className="space-y-1">
								<div className="px-3 py-2">
									<span className="text-sm font-medium text-muted-foreground">
										その他
									</span>
								</div>
								{menuItems.moreActions.map(renderActionButton)}
							</div>
						</div>
					</SheetContent>
				</Sheet>
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
