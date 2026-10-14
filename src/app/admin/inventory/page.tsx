import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ==========================================
// ADMIN INVENTORY PAGE
// ==========================================

export default async function AdminInventoryPage() {
    // --------------------------------------
    // AUTH
    // --------------------------------------

    const cookieStore =
        await cookies();

    const token =
        cookieStore.get(
            "auko_session"
        )?.value;

    if (!token) {
        redirect("/login");
    }

    const session =
        await verifySessionToken(
            token
        );

    if (!session) {
        redirect("/login");
    }

    // --------------------------------------
    // VERIFY CURRENT USER
    // --------------------------------------

    const userResult =
        await db.query(
            `
            SELECT
                id::int AS id,
                employee_id,
                full_name,
                role,
                account_status

            FROM portal_users

            WHERE id = $1

            LIMIT 1
            `,
            [
                session.userId,
            ]
        );

    if (
        userResult.rowCount === 0
    ) {
        redirect("/login");
    }

    const admin =
        userResult.rows[0];

    if (
        admin.account_status !==
        "ACTIVE"
    ) {
        redirect("/login");
    }

    if (
        admin.role !== "ADMIN" &&
        admin.role !== "SUPER_ADMIN"
    ) {
        redirect("/");
    }

    // ======================================
    // INVENTORY STATISTICS
    // ======================================

    const [
        assetResult,
        inventoryUserResult,
        ticketResult,
    ] =
        await Promise.all([
            db.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_assets,

                    COUNT(*) FILTER (
                        WHERE asset_status =
                            'ASSIGNED'
                    )::int
                        AS assigned_assets,

                    COUNT(*) FILTER (
                        WHERE asset_status =
                            'IN_STOCK'
                    )::int
                        AS in_stock_assets,

                    COUNT(*) FILTER (
                        WHERE asset_status =
                            'UNDER_SERVICE'
                    )::int
                        AS under_service_assets

                FROM inventory_assets
                `
            ),

            db.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_users

                FROM inventory_users
                `
            ),

            db.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_tickets,

                    COUNT(*) FILTER (
                        WHERE ticket_status NOT IN (
                            'DONE',
                            'CANCELLED'
                        )
                    )::int
                        AS active_tickets,

                    COUNT(*) FILTER (
                        WHERE ticket_status =
                            'WAITING_FOR_ADMIN'
                    )::int
                        AS waiting_for_admin,

                    COUNT(*) FILTER (
                        WHERE ticket_status =
                            'DONE'
                    )::int
                        AS completed_tickets

                FROM it_support_tickets
                `
            ),
        ]);

    const assetStats =
        assetResult.rows[0];

    const userStats =
        inventoryUserResult.rows[0];

    const ticketStats =
        ticketResult.rows[0];

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* ================================= */}
            {/* HEADER                            */}
            {/* ================================= */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5">

                    <div>

                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-2xl font-bold">
                            IT Inventory Management
                        </h1>

                    </div>

                    <div className="text-right">

                        <p className="font-semibold">
                            {admin.full_name}
                        </p>

                        <p className="text-xs text-gray-400">
                            {admin.employee_id}
                            {" • "}
                            {admin.role}
                        </p>

                    </div>

                </div>

            </header>

            {/* ================================= */}
            {/* CONTENT                           */}
            {/* ================================= */}

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                {/* TOP */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Inventory Dashboard
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Manage IT assets, assigned devices,
                            employee inventory and IT support activities.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-3">

                        <Link
                            href="/admin"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            ← Admin Panel
                        </Link>

                        <Link
                            href="/inventory"
                            className="bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#292929]"
                        >
                            User Inventory →
                        </Link>

                    </div>

                </div>

                {/* ================================= */}
                {/* ASSET KPI                         */}
                {/* ================================= */}

                <div className="mb-4">

                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                        Asset Overview
                    </h3>

                </div>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                    {/* TOTAL ASSETS */}

                    <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Total Assets
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            {assetStats.total_assets}
                        </p>

                    </div>

                    {/* ASSIGNED */}

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Assigned
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-600">
                            {assetStats.assigned_assets}
                        </p>

                    </div>

                    {/* IN STOCK */}

                    <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            In Stock
                        </p>

                        <p className="mt-2 text-3xl font-bold text-blue-600">
                            {assetStats.in_stock_assets}
                        </p>

                    </div>

                    {/* SERVICE */}

                    <div className="border-l-[3px] border-orange-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Under Service
                        </p>

                        <p className="mt-2 text-3xl font-bold text-orange-600">
                            {assetStats.under_service_assets}
                        </p>

                    </div>

                    {/* USERS */}

                    <div className="border-l-[3px] border-purple-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Inventory Users
                        </p>

                        <p className="mt-2 text-3xl font-bold text-purple-600">
                            {userStats.total_users}
                        </p>

                    </div>

                </div>

                {/* ================================= */}
                {/* SUPPORT KPI                       */}
                {/* ================================= */}

                <div className="mb-4">

                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                        IT Support Overview
                    </h3>

                </div>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Total Tickets
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            {ticketStats.total_tickets}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Active Tickets
                        </p>

                        <p className="mt-2 text-3xl font-bold text-blue-600">
                            {ticketStats.active_tickets}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-orange-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Waiting For Admin
                        </p>

                        <p className="mt-2 text-3xl font-bold text-orange-600">
                            {ticketStats.waiting_for_admin}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Completed
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-600">
                            {ticketStats.completed_tickets}
                        </p>

                    </div>

                </div>

                {/* ================================= */}
                {/* INVENTORY MODULES                 */}
                {/* ================================= */}

                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Inventory Management
                </h3>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                    {/* USERS */}

                    <div className="border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            Inventory Users
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Employee information, department,
                            location, training, backup and IT concern details.
                        </p>

                        <p className="mt-5 text-sm font-semibold text-gray-400">
                            Next Step
                        </p>

                    </div>

                    {/* ASSETS */}

                    <div className="border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            IT Assets
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Desktop, laptop, UPS, printer,
                            scanner and other IT asset records.
                        </p>

                        <p className="mt-5 text-sm font-semibold text-gray-400">
                            Next Step
                        </p>

                    </div>

                    {/* ASSIGNMENT */}

                    <div className="border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            Asset Assignment
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Assign, return or transfer IT devices
                            between employees.
                        </p>

                        <p className="mt-5 text-sm font-semibold text-gray-400">
                            Coming Soon
                        </p>

                    </div>

                    {/* SUPPORT */}

                    <div className="border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            IT Support
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Assign IT personnel, track comments,
                            pending support and resolutions.
                        </p>

                        <p className="mt-5 text-sm font-semibold text-gray-400">
                            Coming Soon
                        </p>

                    </div>

                    {/* BACKUP */}

                    <div className="border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            Backup Verification
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Track Jan-Feb through Nov-Dec
                            data backup verification records.
                        </p>

                        <p className="mt-5 text-sm font-semibold text-gray-400">
                            Coming Soon
                        </p>

                    </div>

                    {/* EXCEL */}

                    <div className="border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            Excel Export
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Export inventory using the existing
                            Auko-Tex Inventory Excel format.
                        </p>

                        <p className="mt-5 text-sm font-semibold text-gray-400">
                            Coming Soon
                        </p>

                    </div>

                </div>

            </div>

        </main>
    );
}