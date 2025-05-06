#!/usr/bin/env node

interface CosensePage {
	title: string;
	// 他に必要なプロパティがあれば追加
}

async function main() {
	const project = "shokai";
	console.log(`Fetching pages for project: ${project}`);

	try {
		const res = await fetch(
			`https://scrapbox.io/api/pages/${encodeURIComponent(project)}`,
		);
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		const json = (await res.json()) as { pages: CosensePage[] };
		console.log(`取得ページ数: ${json.pages.length}`);
		for (const p of json.pages) {
			console.log(`- ${p.title}`);
		}
	} catch (err) {
		console.error("ページ取得中にエラーが発生しました:", err);
		process.exit(1);
	}
}

main();
