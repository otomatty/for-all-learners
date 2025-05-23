"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import CreateNoteForm from "./create-note-form";

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
