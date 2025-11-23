"use client";

import { useInquiryCategories } from "@/hooks/inquiries";
import InquiryForm from "./inquiry-form";

interface InquiryClientProps {
	initialValues: {
		email: string;
		name: string;
	};
	isAuthenticated: boolean;
}

export function InquiryClient({
	initialValues,
	isAuthenticated,
}: InquiryClientProps) {
	const { data: categoriesResult, isLoading } = useInquiryCategories();

	if (isLoading) {
		return <p className="text-center py-10">読み込み中...</p>;
	}

	const categories = categoriesResult?.categories || [];

	return (
		<InquiryForm
			initialValues={initialValues}
			isAuthenticated={isAuthenticated}
			categories={categories}
		/>
	);
}
