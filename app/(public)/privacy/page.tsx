import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "プライバシーポリシー",
	description: "For All Learners アプリケーションのプライバシーポリシーです。",
};

export default function PrivacyPolicyPage() {
	const appName = "For All Learners"; // アプリ名を適宜変更してください
	const lastUpdatedDate = "2025年5月1日"; // 最終更新日を適宜変更してください
	const contactEmail = "saedgewell@gmail.com"; // 連絡先メールアドレスを適宜変更してください

	return (
		<div className="container mx-auto px-6 py-12 max-w-3xl">
			<h1 className="text-3xl font-bold mb-8 text-center">
				プライバシーポリシー
			</h1>

			<p className="mb-6">最終更新日: {lastUpdatedDate}</p>

			<p className="mb-4">
				{appName}
				（以下「当アプリ」といいます。）は、ユーザーの個人情報保護の重要性について認識し、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）を遵守するとともに、以下のプライバシーポリシー（以下「本ポリシー」といいます。）に従い、適切な取扱い及び保護に努めます。
			</p>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">
					1. 収集する情報とその利用目的
				</h2>
				<p className="mb-2">
					当アプリでは、以下の情報を収集し、それぞれの目的のために利用します。
				</p>
				<ul className="list-disc list-inside space-y-2 mb-4">
					<li>
						<strong>アカウント情報:</strong>{" "}
						ユーザー名、メールアドレス、パスワード（暗号化して保存）。アカウント作成、ログイン機能の提供、お問い合わせ対応のために利用します。
					</li>
					<li>
						<strong>学習データ:</strong>{" "}
						学習進捗、解答履歴、学習時間など。学習効果の測定、パーソナライズされた学習体験の提供、サービス改善のために利用します。
					</li>
					<li>
						<strong>利用状況に関する情報:</strong>{" "}
						アクセスログ、IPアドレス、デバイス情報、ブラウザの種類など。サービスの維持・改善、不正利用の防止、利用状況の分析のために利用します。
					</li>
					<li>
						<strong>お問い合わせ情報:</strong>{" "}
						お問い合わせ時に提供された氏名、メールアドレス、お問い合わせ内容。お問い合わせへの対応のために利用します。
					</li>
				</ul>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">2. 情報の第三者提供</h2>
				<p className="mb-4">
					当アプリは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
				</p>
				<ul className="list-disc list-inside space-y-2 mb-4">
					<li>ユーザーの同意がある場合</li>
					<li>
						法令に基づく場合（裁判所、警察等の公的機関から開示を求められた場合など）
					</li>
					<li>
						人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき
					</li>
					<li>
						公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき
					</li>
					<li>
						国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき
					</li>
				</ul>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">3. Cookieの使用</h2>
				<p className="mb-4">
					当アプリでは、サービスの利便性向上や利用状況の分析のためにCookieを使用することがあります。ユーザーはブラウザの設定によりCookieの使用を無効にすることができますが、その場合、一部の機能が利用できなくなることがあります。
				</p>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">4. 個人情報の管理</h2>
				<p className="mb-4">
					当アプリは、収集した個人情報を正確かつ最新の内容に保つよう努め、不正アクセス・紛失・破損・改ざん・漏洩などを防止するため、セキュリティシステムの維持・管理体制の整備・社員教育の徹底等の必要な措置を講じ、安全対策を実施し個人情報の厳重な管理を行います。
				</p>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">
					5. 個人情報の開示・訂正・削除
				</h2>
				<p className="mb-4">
					ユーザーは、当アプリが保有する自己の個人情報について、開示、訂正、追加、削除、利用停止を求めることができます。ご希望の場合は、下記のお問い合わせ先までご連絡ください。ご本人であることを確認の上、法令に基づき適切に対応いたします。
				</p>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">
					6. プライバシーポリシーの変更
				</h2>
				<p className="mb-4">
					当アプリは、法令等の変更やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更がある場合には、アプリ内での通知やウェブサイト上でお知らせします。変更後のプライバシーポリシーは、当アプリが別途定める場合を除き、本ページに掲載されたときから効力を生じるものとします。
				</p>
			</section>

			<section>
				<h2 className="text-2xl font-semibold mb-4">7. お問い合わせ先</h2>
				<p>
					本ポリシーに関するお問い合わせは、下記の連絡先までお願いいたします。
				</p>
				<p>
					{appName} 運営事務局
					<br />
					メールアドレス: {contactEmail}
				</p>
			</section>
		</div>
	);
}
