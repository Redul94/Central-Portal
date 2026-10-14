import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auko_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

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
    !["ADMIN", "SUPER_ADMIN"].includes(admin.role)
  ) {
    return null;
  }

  return admin;
}

export async function GET() {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return Response.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    const result = await db.query(`
      SELECT
        mcr.id::int AS id,
        mcr.booking_id::int AS booking_id,
        mcr.request_type,
        mcr.request_status,
        mcr.reason,

        mcr.new_room_id::int AS new_room_id,
        mcr.new_meeting_date::text AS new_meeting_date,
        mcr.new_start_time::text AS new_start_time,
        mcr.new_end_time::text AS new_end_time,

        mcr.rejection_reason,
        mcr.created_at,
        mcr.reviewed_at,

        mb.meeting_title,
        mb.meeting_date::text AS meeting_date,
        mb.start_time::text AS start_time,
        mb.end_time::text AS end_time,
        mb.booking_status,

        current_room.room_name AS current_room_name,
        new_room.room_name AS new_room_name,

        requester.employee_id,
        requester.full_name,
        requester.department,
        requester.designation,
        requester.official_email,

        reviewer.full_name AS reviewed_by_name

      FROM meeting_change_requests mcr

      JOIN meeting_bookings mb
        ON mb.id = mcr.booking_id

      JOIN meeting_rooms current_room
        ON current_room.id = mb.room_id

      JOIN portal_users requester
        ON requester.id = mcr.requested_by

      LEFT JOIN meeting_rooms new_room
        ON new_room.id = mcr.new_room_id

      LEFT JOIN portal_users reviewer
        ON reviewer.id = mcr.reviewed_by

      ORDER BY
        CASE
          WHEN mcr.request_status = 'PENDING'
          THEN 0
          ELSE 1
        END,
        mcr.created_at DESC
    `);

    return Response.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error(
      "Admin meeting change requests error:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to retrieve meeting change requests.",
      },
      { status: 500 }
    );
  }
}