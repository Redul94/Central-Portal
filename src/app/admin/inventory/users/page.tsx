import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

import AdminNav from "../../admin-nav/page";
import InventoryUsers from "./inventory-users";


export const dynamic = "force-dynamic";

export default async function InventoryUsersPage() {
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
    // CURRENT ADMIN
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
    // AVAILABLE PORTAL USERS
    // ==========================================
    //
    // Only portal users not already linked
    // with an inventory user are shown.
    // ==========================================

    const portalUserResult =
        await db.query(
            `
            SELECT
                pu.id::int AS id,
                pu.employee_id,
                pu.full_name,
                pu.designation,
                pu.department,
                pu.official_email

            FROM portal_users pu

            LEFT JOIN inventory_users iu
                ON iu.portal_user_id =
                   pu.id

            WHERE
                pu.account_status =
                    'ACTIVE'

                AND
                iu.id IS NULL

            ORDER BY
                pu.full_name ASC
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

                <InventoryUsers
                    portalUsers={
                        portalUserResult.rows
                    }
                />

            </div>

        </main>
    );
}