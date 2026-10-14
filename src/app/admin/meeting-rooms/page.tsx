import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import RoomManagement from "./room-management";


export const dynamic = "force-dynamic";

export default async function MeetingRoomsPage() {
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

    const result =
        await db.query(
            `
            SELECT
                id::int AS id,
                full_name,
                role,
                account_status
            FROM portal_users
            WHERE id = $1
            LIMIT 1
            `,
            [session.userId]
        );

    if (
        result.rowCount === 0
    ) {
        redirect("/");
    }

    const admin =
        result.rows[0];

    if (
        admin.account_status !==
        "ACTIVE" ||
        ![
            "ADMIN",
            "SUPER_ADMIN",
        ].includes(
            admin.role
        )
    ) {
        redirect("/");
    }

    return (
        <RoomManagement
            adminName={
                admin.full_name
            }
            adminRole={
                admin.role
            }
        />
    );
}