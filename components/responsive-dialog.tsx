"use client";

import * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";

interface ResponsiveDialogProps {
	children: React.ReactNode;
	triggerText?: string;
	dialogTitle?: string;
	dialogDescription?: string;
}

export function ResponsiveDialog({
	children,
	triggerText = "Edit",
	dialogTitle = "Dialog",
	dialogDescription = "",
}: ResponsiveDialogProps) {
	const [open, setOpen] = React.useState(false);
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger asChild>
					<Button variant="outline">{triggerText}</Button>
				</DrawerTrigger>
				<DrawerContent className="sm:max-w-[425px]">
					<DrawerHeader>
						<DrawerTitle>{dialogTitle}</DrawerTitle>
						<DrawerDescription>{dialogDescription}</DrawerDescription>
					</DrawerHeader>
					{children}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">{triggerText}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader className="text-left">
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
