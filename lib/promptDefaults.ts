/**
 * デフォルトのプロンプトテンプレートを定義します。
 */

export const DEFAULT_WIKI_PROMPT = `次のタイトルをもとに、Wikipedia の記事風に日本語で詳しく解説を作成してください。
タイトル: {{title}}
記事:`;

export const DEFAULT_PAGE_INFO_PROMPT =
	"以下のキーワードに基づいて、Wikipediaのような詳細な解説ドキュメントをMarkdown形式で出力してください。Markdownのみを返してください。";
