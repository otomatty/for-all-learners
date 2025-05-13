import type { Database } from "@/types/database.types";
import { useCallback, useEffect, useState } from "react";

interface UsePageFormStateProps {
	page: Database["public"]["Tables"]["pages"]["Row"];
	isNewPage: boolean;
}

export function usePageFormState({ page, isNewPage }: UsePageFormStateProps) {
	const [title, setTitleInternal] = useState(page.title);
	const [isLoading, setIsLoading] = useState(false);
	// isDirty は、page.title (保存済みのタイトル) から変更されたかどうかを示す
	const [isDirty, setIsDirty] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isOnline, setIsOnline] = useState<boolean>(true);

	useEffect(() => {
		setIsOnline(navigator.onLine);
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const setTitle = useCallback(
		(newTitle: string) => {
			setTitleInternal(newTitle);
			setIsDirty(newTitle.trim() !== page.title.trim());
		},
		[page.title],
	);

	return {
		title,
		setTitle,
		isLoading,
		setIsLoading,
		isDirty,
		isGenerating,
		setIsGenerating,
		isOnline,
	};
}
