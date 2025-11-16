"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDeck } from "./useDeck";

/**
 * デッキの編集権限を確認するフック
 * @param deckId デッキID
 * @param userId ユーザーID
 * @returns deck: デッキデータ, canEdit: 編集可能かどうか, isLoading: 読み込み中かどうか
 */
export function useDeckPermissions(deckId: string, userId: string) {
	const router = useRouter();
	const { data: deck, isLoading: isLoadingDeck } = useDeck(deckId);
	const [canEdit, setCanEdit] = useState(false);
	const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

	useEffect(() => {
		if (!deck || isLoadingDeck) {
			setIsLoadingPermissions(true);
			return;
		}

		// デッキの所有者かどうかを確認
		const isOwner = deck.user_id === userId;

		if (isOwner) {
			setCanEdit(true);
			setIsLoadingPermissions(false);
			return;
		}

		// 共有されているデッキの場合、権限を確認
		const supabase = createClient();
		void Promise.resolve(
			supabase
				.from("deck_shares")
				.select("permission_level")
				.eq("deck_id", deckId)
				.eq("shared_with_user_id", userId)
				.single(),
		)
			.then(({ data: share }) => {
				if (share) {
					const permission = share.permission_level;
					setCanEdit(permission === "edit");
				} else {
					// 共有されていない場合はリダイレクト
					router.push("/decks");
				}
				setIsLoadingPermissions(false);
			})
			.catch(() => {
				// エラー時もリダイレクト
				router.push("/decks");
				setIsLoadingPermissions(false);
			});
	}, [deck, deckId, userId, isLoadingDeck, router]);

	return {
		deck,
		canEdit,
		isLoading: isLoadingDeck || isLoadingPermissions,
	};
}
