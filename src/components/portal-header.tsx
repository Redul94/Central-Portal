"use client";

import Link from "next/link";

import NotificationBell from "@/components/notification-bell";

type Props = {
    title: string;

    fullName?: string | null;

    employeeId?: string | null;

    role?: string | null;

    department?: string | null;

    homeHref?: string;

    showHomeButton?: boolean;
};

export default function PortalHeader({
    title,
    fullName,
    employeeId,
    role,
    department,
    homeHref = "/",
    showHomeButton = false,
}: Props) {
    const detailParts = [
        employeeId,
        department,
        role,
    ].filter(
        (
            value
        ): value is string =>
            Boolean(
                value &&
                value.trim()
            )
    );

    return (
        <header className="relative z-40 border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-6 py-5">

                {/* LEFT */}

                <div>

                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                        Auko-Tex Group
                    </p>

                    <h1 className="mt-1 text-2xl font-bold">
                        {title}
                    </h1>

                </div>

                {/* RIGHT */}

                <div className="flex items-center gap-4">

                    {/* USER / PROFILE LINK */}

                    {fullName && (

                        <Link
                            href="/profile"
                            title="My Profile"
                            className="group hidden text-right sm:block"
                        >

                            <p className="font-semibold text-white transition group-hover:text-[#d4af37]">
                                {fullName}
                            </p>

                            {detailParts.length >
                                0 && (

                                    <p className="mt-1 text-xs text-gray-400 transition group-hover:text-gray-300">
                                        {detailParts.join(
                                            " • "
                                        )}
                                    </p>

                                )}

                        </Link>

                    )}

                    {/* HOME */}

                    {showHomeButton && (

                        <Link
                            href={
                                homeHref
                            }
                            className="hidden h-11 items-center border border-gray-700 bg-[#1a1a1a] px-4 text-sm font-semibold text-gray-200 transition hover:border-[#d4af37] hover:text-[#d4af37] md:flex"
                        >
                            Portal
                        </Link>

                    )}

                    {/* NOTIFICATION */}

                    <NotificationBell />

                </div>

            </div>

            {/* MOBILE USER INFO / PROFILE LINK */}

            {fullName && (

                <div className="border-t border-gray-800 px-6 py-2 sm:hidden">

                    <div className="mx-auto max-w-[1500px]">

                        <Link
                            href="/profile"
                            title="My Profile"
                            className="group block"
                        >

                            <p className="text-sm font-semibold text-white transition group-hover:text-[#d4af37]">
                                {fullName}
                            </p>

                            {detailParts.length >
                                0 && (

                                    <p className="mt-1 text-xs text-gray-400 transition group-hover:text-gray-300">
                                        {detailParts.join(
                                            " • "
                                        )}
                                    </p>

                                )}

                        </Link>

                    </div>

                </div>

            )}

        </header>
    );
}