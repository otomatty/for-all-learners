import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "利用規約",
	description: "For All Learners アプリケーションの利用規約です。",
};

export default function TermsOfServicePage() {
	const appName = "For All Learners"; // アプリ名を適宜変更してください
	const lastUpdatedDate = "2025年5月1日"; // 最終更新日を適宜変更してください
	const contactEmail = "saedgewell@gmail.com"; // 連絡先メールアドレスを適宜変更してください

	return (
		<div className="container mx-auto px-6 py-12 max-w-3xl">
			<h1 className="text-3xl font-bold mb-8 text-center">利用規約</h1>

			<p className="mb-6">最終更新日: {lastUpdatedDate}</p>

			<p className="mb-4">
				この利用規約（以下「本規約」といいます。）は、{appName}
				（以下「当アプリ」といいます。）が提供する全てのサービス（以下「本サービス」といいます。）の利用条件を定めるものです。ユーザーの皆様（以下「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。
			</p>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">第1条（適用）</h2>
				<p className="mb-4">
					本規約は、ユーザーと当アプリとの間の本サービスの利用に関わる一切の関係に適用されるものとします。当アプリが別途定めるプライバシーポリシー、その他の諸規定は、本規約の一部を構成するものとします。
				</p>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">第2条（利用登録）</h2>
				<ol className="list-decimal list-inside space-y-2 mb-4">
					<li>
						本サービスの利用を希望する者（以下「登録希望者」といいます。）は、本規約を遵守することに同意し、かつ当アプリの定める一定の情報（以下「登録事項」といいます。）を当アプリの定める方法で当アプリに提供することにより、当アプリに対し、本サービスの利用の登録を申請することができます。
					</li>
					<li>
						当アプリは、当アプリの基準に従って、登録希望者の登録の可否を判断し、当アプリが登録を認める場合にはその旨を登録希望者に通知します。登録希望者のユーザーとしての登録は、当アプリが本項の通知を行ったことをもって完了したものとします。
					</li>
					<li>
						当アプリは、登録希望者が、以下の各号のいずれかの事由に該当する場合は、登録及び再登録を拒否することがあり、またその理由について一切開示義務を負いません。
						<ul className="list-disc list-inside ml-6 mt-2 space-y-1">
							<li>
								当アプリに提供した登録事項の全部または一部につき虚偽、誤記または記載漏れがあった場合
							</li>
							<li>
								未成年者、成年被後見人、被保佐人または被補助人のいずれかであり、法定代理人、後見人、保佐人または補助人の同意等を得ていなかった場合
							</li>
							<li>
								反社会的勢力等（暴力団、暴力団員、右翼団体、反社会的勢力、その他これに準ずる者を意味します。以下同じ。）である、または資金提供その他を通じて反社会的勢力等の維持、運営もしくは経営に協力もしくは関与する等反社会的勢力等との何らかの交流もしくは関与を行っていると当アプリが判断した場合
							</li>
							<li>
								過去当アプリとの契約に違反した者またはその関係者であると当アプリが判断した場合
							</li>
							<li>その他、登録を適当でないと当アプリが判断した場合</li>
						</ul>
					</li>
				</ol>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">
					第3条（アカウント情報管理）
				</h2>
				<ol className="list-decimal list-inside space-y-2 mb-4">
					<li>
						ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。
					</li>
					<li>
						ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。当アプリは、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。
					</li>
					<li>
						ユーザーID及びパスワードが第三者によって使用されたことによって生じた損害は、当アプリに故意又は重大な過失がある場合を除き、当アプリは一切の責任を負わないものとします。
					</li>
				</ol>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">第4条（禁止事項）</h2>
				<p className="mb-2">
					ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
				</p>
				<ul className="list-disc list-inside space-y-1 mb-4">
					<li>法令または公序良俗に違反する行為</li>
					<li>犯罪行為に関連する行為</li>
					<li>
						当アプリ、本サービスの他のユーザー、または第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
					</li>
					<li>当アプリのサービスの運営を妨害するおそれのある行為</li>
					<li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
					<li>不正アクセスをし、またはこれを試みる行為</li>
					<li>他のユーザーに成りすます行為</li>
					<li>
						当アプリのサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
					</li>
					<li>
						当アプリ、本サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為
					</li>
					<li>その他、当アプリが不適切と判断する行為</li>
				</ul>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">
					第5条（本サービスの提供の停止等）
				</h2>
				<ol className="list-decimal list-inside space-y-2 mb-4">
					<li>
						当アプリは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
						<ul className="list-disc list-inside ml-6 mt-2 space-y-1">
							<li>
								本サービスにかかるコンピュータシステムの保守点検または更新を行う場合
							</li>
							<li>
								地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
							</li>
							<li>コンピュータまたは通信回線等が事故により停止した場合</li>
							<li>その他、当アプリが本サービスの提供が困難と判断した場合</li>
						</ul>
					</li>
					<li>
						当アプリは、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。
					</li>
				</ol>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">第6条（免責事項）</h2>
				<p className="mb-4">
					当アプリは、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。当アプリは、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、本サービスに関する当アプリとユーザーとの間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
				</p>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">第7条（規約の変更）</h2>
				<p className="mb-4">
					当アプリは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
				</p>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-semibold mb-4">
					第8条（準拠法・裁判管轄）
				</h2>
				<ol className="list-decimal list-inside space-y-2 mb-4">
					<li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
					<li>
						本サービスに関して紛争が生じた場合には、当アプリの本店所在地を管轄する裁判所を専属的合意管轄とします。
					</li>
				</ol>
			</section>

			<section>
				<h2 className="text-2xl font-semibold mb-4">附則</h2>
				<p>本規約は、{lastUpdatedDate}から施行します。</p>
			</section>

			<section className="mt-12">
				<h2 className="text-2xl font-semibold mb-4">お問い合わせ先</h2>
				<p>本規約に関するお問い合わせは、下記の連絡先までお願いいたします。</p>
				<p>
					{appName} 運営事務局
					<br />
					メールアドレス: {contactEmail}
				</p>
			</section>
		</div>
	);
}
