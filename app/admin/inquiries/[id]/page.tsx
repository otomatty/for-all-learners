import { InquiryDetailClient } from "./_components/InquiryDetailClient";

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
}

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
