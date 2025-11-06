/**
 * GitHub Token Help Component
 *
 * Provides detailed instructions on how to create and configure
 * a GitHub Personal Access Token for plugin authentication.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/custom-widgets/PasswordInput.tsx
 *
 * Dependencies:
 *   ├─ components/ui/accordion.tsx
 *   └─ components/ui/button.tsx
 *
 * Related Documentation:
 *   └─ Issue: docs/01_issues/open/2025_11/20251106_01_github-commit-stats-plugin-enhancement.md
 */

"use client";

import { ExternalLink, HelpCircle } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

/**
 * GitHub Token Help Component
 *
 * Displays step-by-step instructions for creating a GitHub Personal Access Token.
 */
export function GitHubTokenHelp() {
	return (
		<div className="rounded-lg border bg-muted/50 p-4">
			<div className="mb-3 flex items-center gap-2">
				<HelpCircle className="h-5 w-5 text-muted-foreground" />
				<h3 className="font-semibold text-sm">GitHub認証トークンの設定方法</h3>
			</div>

			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value="steps">
					<AccordionTrigger className="text-sm">
						トークンの作成手順
					</AccordionTrigger>
					<AccordionContent>
						<ol className="space-y-3 text-sm text-muted-foreground">
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">1.</span>
								<span>
									GitHubにログインし、
									<Button
										variant="link"
										size="sm"
										className="h-auto p-0 text-primary underline"
										onClick={() => {
											window.open(
												"https://github.com/settings/tokens?type=beta",
												"_blank",
											);
										}}
									>
										Personal Access Tokens (classic)
										<ExternalLink className="ml-1 h-3 w-3" />
									</Button>
									にアクセス
								</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">2.</span>
								<span>
									「Generate new token」→「Generate new token
									(classic)」をクリック
								</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">3.</span>
								<span>
									トークンに名前を付ける（例: "F.A.L GitHub Commit Stats"）
								</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">4.</span>
								<span>有効期限を設定（推奨: 90日またはカスタム）</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">5.</span>
								<span>以下の権限（スコープ）を選択：</span>
							</li>
						</ol>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="permissions">
					<AccordionTrigger className="text-sm">
						必要な権限（スコープ）
					</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-2 text-sm">
							<div className="rounded-md bg-background p-3">
								<p className="font-semibold text-foreground mb-2">
									必須の権限：
								</p>
								<ul className="space-y-1 text-muted-foreground ml-4 list-disc">
									<li>
										<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
											public_repo
										</code>
										: パブリックリポジトリの情報を読み取る
									</li>
									<li>
										<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
											repo
										</code>
										: プライベートリポジトリも含む全てのリポジトリ情報を読み取る
										（プライベートリポジトリを監視する場合のみ必要）
									</li>
								</ul>
							</div>
							<p className="text-xs text-muted-foreground mt-2">
								※ プライベートリポジトリを監視しない場合は、
								<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
									public_repo
								</code>
								のみで十分です。
							</p>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="usage">
					<AccordionTrigger className="text-sm">使用方法</AccordionTrigger>
					<AccordionContent>
						<ol className="space-y-3 text-sm text-muted-foreground">
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">1.</span>
								<span>「Generate token」をクリックしてトークンを生成</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">2.</span>
								<span>
									<strong className="text-foreground">重要:</strong>
									生成されたトークンは一度しか表示されません。
									必ずコピーして安全な場所に保存してください。
								</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">3.</span>
								<span>
									コピーしたトークンをこの設定画面の「GitHub認証トークン」フィールドに貼り付け
								</span>
							</li>
							<li className="flex gap-2">
								<span className="font-semibold text-foreground">4.</span>
								<span>「保存」をクリックして設定を保存</span>
							</li>
						</ol>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="security">
					<AccordionTrigger className="text-sm">
						セキュリティに関する注意事項
					</AccordionTrigger>
					<AccordionContent>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex gap-2">
								<span>•</span>
								<span>
									トークンは他人に共有しないでください。パスワードと同様に扱ってください。
								</span>
							</li>
							<li className="flex gap-2">
								<span>•</span>
								<span>
									トークンが漏洩した場合は、すぐにGitHubでトークンを削除してください。
								</span>
							</li>
							<li className="flex gap-2">
								<span>•</span>
								<span>
									定期的にトークンの有効期限を確認し、必要に応じて更新してください。
								</span>
							</li>
							<li className="flex gap-2">
								<span>•</span>
								<span>
									このトークンはプラグイン内でのみ使用され、外部に送信されることはありません。
								</span>
							</li>
						</ul>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<div className="mt-4 pt-4 border-t">
				<Button
					variant="outline"
					size="sm"
					className="w-full"
					onClick={() => {
						window.open(
							"https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
							"_blank",
						);
					}}
				>
					公式ドキュメントを開く
					<ExternalLink className="ml-2 h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
