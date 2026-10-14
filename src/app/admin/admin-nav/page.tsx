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
    const pathname =
        usePathname();

    return (
        <div className="mb-7 flex flex-wrap gap-2 border-b border-gray-300 pb-4">

            {navItems.map(
                (item) => {
                    if (
                        item.superAdminOnly &&
                        adminRole !==
                        "SUPER_ADMIN"
                    ) {
                        return null;
                    }

                    const active =
                        pathname ===
                        item.href ||
                        (
                            item.href !==
                            "/admin" &&
                            pathname.startsWith(
                                `${item.href}/`
                            )
                        );

                    return (
                        <Link
                            key={
                                item.href
                            }
                            href={
                                item.href
                            }
                            className={
                                active
                                    ? "bg-[#d4af37] px-4 py-2 text-sm font-bold text-black"
                                    : "border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                            }
                        >
                            {
                                item.label
                            }
                        </Link>
                    );
                }
            )}

        </div>
    );
}