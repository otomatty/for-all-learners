"use client";

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const navigationItems = [
	{ href: "/features", text: "機能" },
	{ href: "/pricing", text: "価格" },
	{ href: "/guides", text: "ガイド" },
	{ href: "/faq", text: "FAQ" },
];

export function PublicNavigation() {
	return (
		<NavigationMenu>
			<NavigationMenuList>
				{navigationItems.map((item) => (
					<NavigationMenuItem key={item.href}>
						<NavigationMenuLink
							href={item.href}
							className={navigationMenuTriggerStyle()}
						>
							{item.text}
						</NavigationMenuLink>
					</NavigationMenuItem>
				))}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
