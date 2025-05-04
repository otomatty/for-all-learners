export type HelpMode = "video" | "walkthrough";

export interface PageHelpConfigVideo {
	mode: "video";
	videoId: string;
}

export interface PageHelpConfigWalkthrough {
	mode: "walkthrough";
	steps: string[];
}

export type PageHelpConfig = PageHelpConfigVideo | PageHelpConfigWalkthrough;

export const pageHelpConfig: Record<string, PageHelpConfig> = {
	"/learn": {
		mode: "video",
		videoId: "A-1QgjKIW5w",
	},
	"/": {
		mode: "walkthrough",
		steps: ["トップページの概要を確認します。"],
	},
	"/auth/login": {
		mode: "walkthrough",
		steps: ["Googleアカウントでログインします。"],
	},
	"/dashboard": {
		mode: "video",
		videoId: "A-1QgjKIW5w",
	},
	"/decks": {
		mode: "walkthrough",
		steps: ["作成済みデッキ一覧を表示します。"],
	},
	"/decks/new": {
		mode: "walkthrough",
		steps: ["新しいデッキのタイトルを入力して作成します。"],
	},
	"/decks/[deckId]": {
		mode: "walkthrough",
		steps: ["選択したデッキの詳細とカード一覧を表示します。"],
	},
	"/decks/[deckId]/audio": {
		mode: "walkthrough",
		steps: ["音読入力でカードを自動生成します。"],
	},
	"/decks/[deckId]/ocr": {
		mode: "walkthrough",
		steps: ["OCR入力でカードを自動生成します。"],
	},
	"/pages": {
		mode: "walkthrough",
		steps: ["作成済みのページ一覧を表示します。"],
	},
	"/pages/[pageId]": {
		mode: "walkthrough",
		steps: ["選択したページの詳細を表示します。"],
	},
	"/profile": {
		mode: "walkthrough",
		steps: ["プロフィール情報を編集します。"],
	},
	"/settings": {
		mode: "walkthrough",
		steps: ["アプリの設定を変更します。"],
	},
	"/admin": {
		mode: "walkthrough",
		steps: ["管理者用ダッシュボードにアクセスします。"],
	},
	"/admin/users": {
		mode: "walkthrough",
		steps: ["ユーザー一覧を管理します。"],
	},
	"/admin/users/[id]": {
		mode: "walkthrough",
		steps: ["選択したユーザーの詳細を表示・編集します。"],
	},
	// 他のページ設定を追加
};
