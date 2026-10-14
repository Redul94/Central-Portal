import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

import PortalHeader from "@/components/portal-header";

import AdminNav from "../admin-nav/page";
import SupportManagement from "./support-management";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
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

    const result =
        await db.query(
            `
            SELECT
                id::int AS id,
                employee_id,
                full_name,
                designation,
                department,
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
        result.rowCount === 0
    ) {
        redirect("/login");
    }

    const admin =
        result.rows[0];

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
    // PAGE
    // ==========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* ================================= */}
            {/* SHARED PORTAL HEADER              */}
            {/* ================================= */}

            <PortalHeader
                title="IT Support Management"
                fullName={
                    admin.full_name
                }
                employeeId={
                    admin.employee_id
                }
                department={
                    admin.department
                }
                role={
                    admin.role
                }
            />

            {/* ================================= */}
            {/* CONTENT                           */}
            {/* ================================= */}

            <div className="mx-auto max-w-[1600px] px-6 py-8">

                <AdminNav
                    adminRole={
                        admin.role
                    }
                />

                <SupportManagement />

            </div>

        </main>
    );
}