import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { syncCompletedMeetings } from "@/lib/meeting";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getCurrentUser() {
    const cookieStore = await cookies();

    const token =
        cookieStore.get("auko_session")?.value;

    if (!token) {
        return null;
    }

    const session =
        await verifySessionToken(token);

    if (!session) {
        return null;
    }

    const result = await db.query(
        `
    SELECT
      id,
      employee_id,
      full_name,
      account_status
    FROM portal_users
    WHERE id = $1
    LIMIT 1
    `,
        [session.userId]
    );

    if (result.rowCount === 0) {
        return null;
    }

    const user = result.rows[0];

    if (user.account_status !== "ACTIVE") {
        return null;
    }

    return user;
}

export async function GET() {
    try {
        await syncCompletedMeetings();
        const user =

            await getCurrentUser();

        if (!user) {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        const result =
            await db.query(
                `
    SELECT
      mb.id::int AS id,
      mb.meeting_title,
      mb.meeting_date::text AS meeting_date,
      mb.start_time::text AS start_time,
      mb.end_time::text AS end_time,
      mb.expected_participants,
      mb.agenda,
      mb.special_requirement,
      mb.booking_status,
      mb.rejection_reason,
      mb.created_at,

      mr.room_name,

      mcr.id::int AS change_request_id,
      mcr.request_type AS change_request_type,
      mcr.request_status AS change_request_status

    FROM meeting_bookings mb

    JOIN meeting_rooms mr
      ON mr.id = mb.room_id

    LEFT JOIN LATERAL (
      SELECT
        id,
        request_type,
        request_status
      FROM meeting_change_requests
      WHERE booking_id = mb.id
        AND request_status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT 1
    ) mcr
      ON TRUE

    WHERE mb.requested_by = $1

    ORDER BY
      mb.meeting_date DESC,
      mb.start_time DESC
    `,
                [user.id]
            );

        return Response.json({
            success: true,
            bookings: result.rows,
        });

    } catch (error) {
        console.error(
            "My bookings error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to retrieve your bookings.",
            },
            {
                status: 500,
            }
        );
    }
}