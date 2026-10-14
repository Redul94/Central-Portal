import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { syncCompletedMeetings } from "@/lib/meeting";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdmin() {
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
      role,
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

    const admin = result.rows[0];

    if (
        admin.account_status !== "ACTIVE" ||
        !["ADMIN", "SUPER_ADMIN"].includes(
            admin.role
        )
    ) {
        return null;
    }

    return admin;
}

export async function GET() {
    try {
        await syncCompletedMeetings();
        const admin = await getAdmin();

        if (!admin) {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized.",
                },
                {
                    status: 403,
                }
            );
        }

        const result = await db.query(`
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

        mr.id::int AS room_id,
        mr.room_name,

        pu.employee_id,
        pu.full_name,
        pu.department,
        pu.designation,
        pu.official_email

      FROM meeting_bookings mb

      JOIN meeting_rooms mr
        ON mr.id = mb.room_id

      JOIN portal_users pu
        ON pu.id = mb.requested_by

      ORDER BY
        CASE
          WHEN mb.booking_status = 'PENDING'
          THEN 0
          ELSE 1
        END,
        mb.meeting_date ASC,
        mb.start_time ASC
    `);

        return Response.json({
            success: true,
            bookings: result.rows,
        });

    } catch (error) {
        console.error(
            "Admin meetings error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to retrieve meeting requests.",
            },
            {
                status: 500,
            }
        );
    }
}