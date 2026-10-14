import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

import AdminNav from "../../admin-nav/page";
import AssetsManagement from "./assets-management";

export const dynamic = "force-dynamic";

export default async function InventoryAssetsPage() {
    // ==========================================
    // AUTH
    // ==========================================

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

    // ==========================================
    // ADMIN
    // ==========================================

    const adminResult =
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
        adminResult.rowCount ===
        0
    ) {
        redirect("/login");
    }

    const admin =
        adminResult.rows[0];

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

    // ==========================================
    // CATEGORIES
    // ==========================================

    const categoryResult =
        await db.query(
            `
            SELECT
                id::int AS id,
                category_code,
                category_name,
                display_order

            FROM inventory_categories

            WHERE is_active = TRUE

            ORDER BY
                display_order ASC,
                category_name ASC
            `
        );

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

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

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                <AdminNav
                    adminRole={
                        admin.role
                    }
                />

                <AssetsManagement
                    categories={
                        categoryResult.rows
                    }
                />

            </div>

        </main>
    );
}