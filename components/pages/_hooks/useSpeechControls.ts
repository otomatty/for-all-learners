import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface UseSpeechControlsProps {
	editor: Editor | null;
}

export function useSpeechControls({ editor }: UseSpeechControlsProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const handleReadAloud = useCallback(() => {
		if (!editor) return;
		const text = editor.getText();
		if (!text) {
			toast.error("読み上げるテキストがありません");
			return;
		}
		try {
			speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.onstart = () => {
				setIsPlaying(true);
			};
			utterance.lang = "ja-JP";
			utterance.onend = () => {
				setIsPlaying(false);
			};
			utterance.onerror = (event) => {
				console.error("SpeechSynthesisUtterance.onerror", event);
				toast.error("読み上げ中にエラーが発生しました");
				setIsPlaying(false);
			};
			speechSynthesis.speak(utterance);
		} catch (err) {
			console.error("handleReadAloud error:", err);
			toast.error("読み上げ機能を利用できません");
			setIsPlaying(false);
		}
	}, [editor]);

	const handlePause = useCallback(() => {
		try {
			if (speechSynthesis.speaking && !speechSynthesis.paused) {
				speechSynthesis.pause();
				setIsPlaying(false); // 一時停止したら再生中ではない
				toast.success("読み上げを一時停止しました");
			} else {
				toast.error("一時停止できる読み上げがありません");
			}
		} catch (err) {
			console.error("handlePause error:", err);
			toast.error("一時停止に失敗しました");
			setIsPlaying(false);
		}
	}, []);

	const handleReset = useCallback(() => {
		try {
			if (speechSynthesis.speaking || speechSynthesis.paused) {
				speechSynthesis.cancel();
				setIsPlaying(false);
				toast.success("読み上げを停止しました");
			} else {
				toast.error("停止できる読み上げがありません");
			}
		} catch (err) {
			console.error("handleReset error:", err);
			toast.error("停止に失敗しました");
			setIsPlaying(false);
		}
	}, []);

	// コンポーネントのアンマウント時に読み上げをキャンセルする
	useEffect(() => {
		return () => {
			if (speechSynthesis.speaking || speechSynthesis.paused) {
				speechSynthesis.cancel();
				setIsPlaying(false);
			}
		};
	}, []);

	return {
		handleReadAloud,
		handlePause,
		handleReset,
		isPlaying,
	};
}
