"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
    adminRole: string;
};

type NavItem = {
    label: string;
    href: string;
    superAdminOnly?: boolean;
};

const navItems: NavItem[] = [
    {
        label: "Pending Users",
        href: "/admin",
    },
    {
        label: "All Users",
        href: "/admin/users",
    },
    {
        label: "Meeting Approval",
        href: "/admin/meetings",
    },
    {
        label: "Change Requests",
        href: "/admin/meeting-changes",
    },
    {
        label: "Room Management",
        href: "/admin/meeting-rooms",
    },
    {
        label: "IT Inventory",
        href: "/admin/inventory",
    },

    // NEW: IT REQUISITION MANAGEMENT
    {
        label: "IT Requisition",
        href: "/admin/inventory/requisitions",
    },

    // NEW: IT WARRANTY MANAGEMENT
    {
        label: "IT Warranty",
        href: "/admin/inventory/warranty",
    },

    {
        label: "IT Support",
        href: "/admin/support",
    },
    {
        label: "Audit Log",
        href: "/admin/audit-log",
        superAdminOnly: true,
    },
];

export default function AdminNav({
    adminRole,
}: Props) {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Admin navigation"
            className="mb-7 flex flex-wrap gap-2 border-b border-gray-300 pb-4"
        >
            {navItems.map((item) => {
                if (
                    item.superAdminOnly &&
                    adminRole !== "SUPER_ADMIN"
                ) {
                    return null;
                }

                // Keep IT Inventory as an independent
                // navigation item, so only the current
                // page is highlighted.
                const exactOnly = [
                    "/admin",
                    "/admin/inventory",
                ].includes(item.href);

                const active = exactOnly
                    ? pathname === item.href
                    : pathname === item.href ||
                    pathname.startsWith(
                        `${item.href}/`
                    );

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={
                            active ? "page" : undefined
                        }
                        className={
                            active
                                ? "bg-[#d4af37] px-4 py-2 text-sm font-bold text-black"
                                : "border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#d4af37] hover:text-black"
                        }
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}