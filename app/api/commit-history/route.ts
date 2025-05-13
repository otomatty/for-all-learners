import { NextResponse } from "next/server";
import { execSync } from "node:child_process";

/**
 * コミット履歴の型定義
 */
export interface CommitLog {
	hash: string;
	author: string;
	relDate: string;
	message: string;
}

/**
 * バージョンごとにまとめたコミットグループの型定義
 */
export interface VersionGroup {
	version: string;
	publishedAt: string; // ISO日付文字列
	diffStat: string; // コード差分統計
	commits: CommitLog[];
}

/**
 * GET /api/commit-history
 * package.jsonのversion変更コミット間のコミット履歴をバージョンごとにグループ化し、差分統計と公開日を含めて返します
 */
export async function GET() {
	try {
		// version更新コミットのハッシュ一覧を取得（最新順）
		const bumpRaw = execSync(
			`git log -G '"version":' --format='%H' -- package.json`,
		)
			.toString()
			.trim();
		const bumpHashes = bumpRaw.split("\n").reverse(); // 古い順 -> 新しい順

		const groups: VersionGroup[] = [];
		for (let i = 1; i < bumpHashes.length; i++) {
			const prev = bumpHashes[i - 1];
			const curr = bumpHashes[i];

			// バージョン番号をpackage.jsonから取得
			let version = curr;
			try {
				const pkg = JSON.parse(
					execSync(`git show ${curr}:package.json`).toString(),
				);
				version = pkg.version || curr;
			} catch {
				// 解析失敗時はハッシュをversionとして扱う
			}

			// 公開日をコミット日時から取得 (ISO形式)
			const publishedAt = execSync(`git show -s --format=%cI ${curr}`)
				.toString()
				.trim();

			// 前回から今回までのコミット情報を取得
			const raw = execSync(
				`git log ${prev}..${curr} --pretty=format:'%h|%an|%ar|%s'`,
			).toString();
			const commits: CommitLog[] = raw
				.split("\n")
				.filter(Boolean)
				.map((line) => {
					const [hash, author, relDate, ...rest] = line.split("|");
					return { hash, author, relDate, message: rest.join("|") };
				});

			// コード差分統計を取得
			const diffStat = execSync(`git diff --shortstat ${prev}..${curr}`)
				.toString()
				.trim();

			groups.push({ version, publishedAt, diffStat, commits });
		}

		// 最新バージョン順に並び替えして返却
		const result = groups.reverse();
		return NextResponse.json(result);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
