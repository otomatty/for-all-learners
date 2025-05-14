"use server";
import { createClient } from "@/lib/supabase/server";

// Gyazo API 用環境変数
const GYAZO_CLIENT_ID = process.env.GYAZO_CLIENT_ID;
const GYAZO_CLIENT_SECRET = process.env.GYAZO_CLIENT_SECRET;
const GYAZO_REDIRECT_URI = process.env.GYAZO_REDIRECT_URI;
/**
 * Gyazo OAuth 認可URLを生成します
 */
export async function getGyazoAuthUrl(): Promise<string> {
	if (!GYAZO_CLIENT_ID || !GYAZO_REDIRECT_URI) {
		throw new Error("Missing Gyazo env vars");
	}
	const params = new URLSearchParams({
		client_id: GYAZO_CLIENT_ID,
		redirect_uri: GYAZO_REDIRECT_URI,
		response_type: "code",
	});
	return `https://gyazo.com/oauth/authorize?${params.toString()}`;
}

/**
 * OAuth コールバックを処理し、ユーザーのアクセストークンを保存します
 * @param code 認可コード
 */
export async function handleGyazoCallback(code: string): Promise<void> {
	// OAuth トークン取得は form-urlencoded で送信
	if (!GYAZO_CLIENT_ID || !GYAZO_CLIENT_SECRET || !GYAZO_REDIRECT_URI) {
		throw new Error("Missing Gyazo env vars");
	}
	const clientId = GYAZO_CLIENT_ID;
	const clientSecret = GYAZO_CLIENT_SECRET;
	const redirectUri = GYAZO_REDIRECT_URI;

	const tokenParams = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		code,
		grant_type: "authorization_code",
		redirect_uri: redirectUri,
	});
	const response = await fetch("https://api.gyazo.com/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: tokenParams.toString(),
	});
	if (!response.ok) {
		throw new Error("Gyazo トークンの取得に失敗しました");
	}
	const tokenJson = await response.json();
	const { access_token, refresh_token, expires_in } = tokenJson;
	// expires_in may be undefined; guard against invalid date
	const expiresAt: string | null =
		typeof expires_in === "number"
			? new Date(Date.now() + expires_in * 1000).toISOString()
			: null;

	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		throw new Error("認証されていません");
	}

	const { error: dbError } = await supabase.from("user_gyazo_tokens").upsert(
		{
			user_id: user.id,
			access_token,
			refresh_token,
			expires_at: expiresAt,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "user_id" },
	);
	if (dbError) {
		throw dbError;
	}
}

/**
 * 画像をGyazoにアップロードします
 * @param file ブラウザの File オブジェクト
 * @returns Gyazo API のレスポンス (url, permalink_url, image_id)
 */
export async function uploadImageToGyazo(
	file: Blob,
): Promise<{ url: string; permalink_url: string; image_id: string }> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		throw new Error("認証されていません");
	}

	const { data: tokenData, error: tokenError } = await supabase
		.from("user_gyazo_tokens")
		.select("access_token")
		.eq("user_id", user.id)
		.single();
	if (tokenError || !tokenData) {
		throw new Error("Gyazo トークンが見つかりません");
	}

	const { data: albumData } = await supabase
		.from("user_gyazo_albums")
		.select("gyazo_album_id")
		.eq("user_id", user.id)
		.single();

	const formData = new FormData();
	// Gyazo API requires 'access_token' and 'imagedata' fields
	formData.append("access_token", tokenData.access_token);
	// Use 'imagedata' field and include filename
	formData.append("imagedata", file, (file as File).name);
	if (albumData?.gyazo_album_id) {
		formData.append("album_id", albumData.gyazo_album_id);
	}

	const response = await fetch("https://upload.gyazo.com/api/upload", {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error(
			"DEBUG Gyazo upload failed status:",
			response.status,
			"body:",
			errorText,
		);
		throw new Error(
			`Gyazo へのアップロードに失敗しました: ${response.status} ${errorText}`,
		);
	}
	return response.json();
}

// 新しいサーバーアクション: Gyazoアップロード＋DB保存
/**
 * Gyazoに画像をアップロードし、DBに保存します
 * @param file ブラウザの File または Blob オブジェクト
 * @returns アップロードした画像の情報
 */
export async function uploadAndSaveGyazoImage(
	file: Blob,
): Promise<{ url: string; permalink_url: string; image_id: string }> {
	const { url, permalink_url, image_id } = await uploadImageToGyazo(file);
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		throw new Error("認証されていません");
	}
	const { error: dbError } = await supabase.from("user_gyazo_images").insert({
		user_id: user.id,
		gyazo_image_id: image_id,
		url,
		permalink_url,
	});
	if (dbError) {
		throw dbError;
	}
	return { url, permalink_url, image_id };
}
