"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import CreateNoteForm from "./CreateNoteForm";

export default function CreateNoteDialog() {
	const t = useTranslations("notes");
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setOpen(true)}>{t("newNote")}</Button>
			<ResponsiveDialog
				open={open}
				onOpenChange={setOpen}
				className="max-w-md"
				dialogTitle={t("newNote")}
			>
				<CreateNoteForm onSuccess={() => setOpen(false)} />
			</ResponsiveDialog>
		</>
	);
}
