import { Quote } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Testimonial {
	quote: string;
	imageSrc: string;
	imageAlt: string;
	name: string;
	title: string;
}

const getTestimonials = (): Testimonial[] => [
	{
		quote:
			"「以前は苦痛だった専門用語の暗記も、AIが出題してくれるクイズ形式なら楽しく取り組めました。特にFSRSの復習タイミングは絶妙で、知識がしっかり身についていく実感がありました。スキルツリーで自分の成長が見えるのも嬉しかったです」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Aさんのプロフィール画像",
		name: "Aさん（32歳・会社員・女性）",
		title: "PMP資格取得に成功",
	},
	{
		quote:
			"「AIが作る問題は、自分の弱点を的確に突いてくるので驚きました。友人との対戦モードは本当に盛り上がり、難しい内容もゲーム感覚で覚えられました。一人でやっていた時よりも格段に効率が上がり、何より楽しかったです」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Bさんのプロフィール画像",
		name: "Bさん（21歳・大学生・男性）",
		title: "複数の定期試験でS評価を獲得",
	},
	{
		quote:
			"「このアプリのおかげで、バラバラだった知識が繋がり、まるで自分だけの百科事典を作っているようです。『今日の発見』カードは毎日の楽しみで、孫に話して聞かせるネタも増えました。操作も簡単で、新しいことを学ぶのがますます楽しくなりました」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Cさんのプロフィール画像",
		name: "Cさん（68歳・退職後・女性）",
		title: "世界遺産検定2級に合格",
	},
	{
		quote:
			"「仕事で必要なITスキルを効率的に学びたくて利用しました。AIが私の理解度に合わせて難易度を調整してくれるので、無駄なく学習を進められました。特に、実践的な問題形式が多く、実際の業務で役立つ知識が身についたと感じています」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Dさんのプロフィール画像",
		name: "Dさん（29歳・エンジニア・男性）",
		title: "新しいプログラミング言語を習得",
	},
	{
		quote:
			"「簿記の勉強で挫折しそうになっていましたが、このアプリのゲーム感覚の学習方法で楽しく続けられました。特に、他の学習者と競い合えるランキング機能がモチベーション維持に繋がりました。おかげで、苦手だった仕訳問題も克服できました」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Eさんのプロフィール画像",
		name: "Eさん（25歳・経理事務・女性）",
		title: "日商簿記2級に合格",
	},
	{
		quote:
			"「資格試験の直前対策として利用しました。過去問をAIが分析し、頻出分野や自分の苦手な部分に特化した問題を出してくれるのが非常に効率的でした。短期間で集中的に学習できたおかげで、自信を持って試験に臨めました」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Fさんのプロフィール画像",
		name: "Fさん（35歳・公務員・男性）",
		title: "国家資格に一発合格",
	},
	{
		quote:
			"「趣味で始めた歴史の勉強が、このアプリでさらに深まりました。AIが関連情報や豆知識を教えてくれるので、ただ暗記するだけでなく、背景にあるストーリーまで理解できるようになりました。『今日の発見』機能で、毎日新しい驚きがあります」",
		imageSrc: "/placeholder.svg?height=40&width=40",
		imageAlt: "Gさんのプロフィール画像",
		name: "Gさん（58歳・歴史愛好家・男性）",
		title: "歴史能力検定に挑戦中",
	},
];

export default function TestimonialSection() {
	const testimonials = getTestimonials();

	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-gray-900">
			<Container>
				<SectionHeader
					label="導入事例"
					title="ユーザーの声"
					description="様々な目標を持つユーザーが、本アプリケーションを活用して学習効率を向上させた事例をご紹介します。"
				/>
			</Container>

			<div className="overflow-x-auto pb-4 hidden-scrollbar">
				<div className="mx-96 flex gap-6 ">
					{testimonials.map((testimonial) => (
						<Card
							key={testimonial.quote}
							className="border-0 bg-background shadow-md min-w-[300px] md:min-w-[350px]"
						>
							<CardContent className="p-6">
								<div className="flex items-start gap-4">
									<div className="rounded-full bg-primary/10 p-2">
										<Quote className="h-4 w-4 text-primary" />
									</div>
									<div>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{testimonial.quote}
										</p>
									</div>
								</div>
							</CardContent>
							<CardFooter className="flex items-center gap-4 border-t px-6 py-4">
								<div className="rounded-full overflow-hidden">
									<Image
										src={testimonial.imageSrc}
										width={40}
										height={40}
										alt={testimonial.imageAlt}
										className="aspect-square object-cover"
									/>
								</div>
								<div>
									<p className="text-sm font-medium">{testimonial.name}</p>
									<p className="text-xs text-muted-foreground">
										{testimonial.title}
									</p>
								</div>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
