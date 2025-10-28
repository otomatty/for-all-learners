import { redirect } from "next/navigation";

/**
 * /pages ルートは /notes/default に統合されました
 * このページは自動的にリダイレクトされます
 */
export default async function PagesPage() {
	// /notes/default にリダイレクト（各ユーザーのデフォルトノート）
	redirect("/notes/default");
}
