import { InquiryDetailClient } from "./_components/InquiryDetailClient";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return { title: `お問い合わせ詳細: ${id} | 管理者ダッシュボード` };
}

export default async function AdminInquiryDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <InquiryDetailClient inquiryId={id} />;
}
