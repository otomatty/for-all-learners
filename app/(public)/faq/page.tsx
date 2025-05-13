import ContactSection from "./_components/contact-section";
import CTASection from "./_components/cta-section";
import FAQTabsSection from "./_components/faq-tabs-section";
import HeaderSection from "./_components/header-section";

export default function FAQPage() {
	return (
		<>
			<HeaderSection />
			<FAQTabsSection />
			<ContactSection />
			<CTASection />
		</>
	);
}
