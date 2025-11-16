"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import CreateNoteForm from "./CreateNoteForm";

export default function CreateNoteDialog() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>新規ノート</Button>
			<ResponsiveDialog
				open={open}
				onOpenChange={setOpen}
				className="max-w-md"
				dialogTitle="新規ノート"
			>
				<CreateNoteForm onSuccess={() => setOpen(false)} />
			</ResponsiveDialog>
		</>
	);
}
