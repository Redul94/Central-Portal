import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import BookingForm from "./booking-form";


export const dynamic =
    "force-dynamic";

export default async function BookMeetingPage() {
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
        await verifySessionToken(token);

    if (!session) {
        redirect("/login");
    }

    const userResult =
        await db.query(
            `
      SELECT
        id,
        employee_id,
        full_name,
        department,
        designation,
        official_email,
        account_status
      FROM portal_users
      WHERE id = $1
      LIMIT 1
      `,
            [session.userId]
        );

    if (
        userResult.rowCount === 0
    ) {
        redirect("/login");
    }

    const user =
        userResult.rows[0];

    if (
        user.account_status !==
        "ACTIVE"
    ) {
        redirect("/login");
    }

    const roomsResult =
        await db.query(`
      SELECT
        id::int AS id,
        room_name
      FROM meeting_rooms
      WHERE room_status = 'ACTIVE'
      ORDER BY id
    `);

    return (
        <BookingForm
            user={user}
            rooms={
                roomsResult.rows
            }
        />
    );
}