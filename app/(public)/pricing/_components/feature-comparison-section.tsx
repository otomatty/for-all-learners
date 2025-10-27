import { Container } from "@/components/layouts/container";

export default function FeatureComparisonSection() {
	return (
		<section className="w-full py-12 md:py-24 bg-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							プラン機能比較
						</h2>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							各プランで利用できる機能の詳細比較をご確認ください。
						</p>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr className="border-b">
								<th className="py-4 px-4 text-left font-medium">機能</th>
								<th className="py-4 px-4 text-center font-medium">
									フリープラン
								</th>
								<th className="py-4 px-4 text-center font-medium">
									プレミアムプラン
								</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">AI問題自動生成</td>
								<td className="py-4 px-4 text-center">
									月間3回まで
									<br />
									(1回最大20カード)
								</td>
								<td className="py-4 px-4 text-center">無制限</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">FSRSアルゴリズム</td>
								<td className="py-4 px-4 text-center">基本機能</td>
								<td className="py-4 px-4 text-center">
									高度機能
									<br />
									(詳細カスタマイズ可)
								</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">作成可能デッキ数</td>
								<td className="py-4 px-4 text-center">5デッキまで</td>
								<td className="py-4 px-4 text-center">無制限</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">作成可能カード総数</td>
								<td className="py-4 px-4 text-center">100カードまで</td>
								<td className="py-4 px-4 text-center">無制限</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">ノート機能</td>
								<td className="py-4 px-4 text-center">
									月間3ノートまで
									<br />
									(AIアシストなし)
								</td>
								<td className="py-4 px-4 text-center">
									無制限
									<br />
									(AIアシスト付き)
								</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">共有機能</td>
								<td className="py-4 px-4 text-center">閲覧専用リンクのみ</td>
								<td className="py-4 px-4 text-center">
									共同編集
									<br />
									チーム共有フォルダ
								</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">
									ゲーミフィケーション要素
								</td>
								<td className="py-4 px-4 text-center">基本要素のみ</td>
								<td className="py-4 px-4 text-center">全要素利用可能</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">広告表示</td>
								<td className="py-4 px-4 text-center">あり</td>
								<td className="py-4 px-4 text-center">なし</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">カスタマーサポート</td>
								<td className="py-4 px-4 text-center">標準</td>
								<td className="py-4 px-4 text-center">優先対応</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">オフラインアクセス</td>
								<td className="py-4 px-4 text-center">-</td>
								<td className="py-4 px-4 text-center">一部コンテンツ対応</td>
							</tr>
							<tr className="border-b">
								<td className="py-4 px-4 font-medium">学習データの詳細分析</td>
								<td className="py-4 px-4 text-center">基本統計のみ</td>
								<td className="py-4 px-4 text-center">
									詳細分析・エクスポート可
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</Container>
		</section>
	);
}
