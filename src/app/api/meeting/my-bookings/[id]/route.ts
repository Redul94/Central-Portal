import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

async function getCurrentUser() {
    const cookieStore =
        await cookies();

    const token =
        cookieStore.get(
            "auko_session"
        )?.value;

    if (!token) {
        return null;
    }

    const session =
        await verifySessionToken(
            token
        );

    if (!session) {
        return null;
    }

    const result =
        await db.query(
            `
      SELECT
        id::int AS id,
        employee_id,
        full_name,
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
        return null;
    }

    const user =
        result.rows[0];

    if (
        user.account_status !==
        "ACTIVE"
    ) {
        return null;
    }

    return user;
}

function getIpAddress(
    request: Request
) {
    const forwarded =
        request.headers.get(
            "x-forwarded-for"
        );

    if (forwarded) {
        return forwarded
            .split(",")[0]
            .trim();
    }

    return (
        request.headers.get(
            "x-real-ip"
        ) || null
    );
}

export async function POST(
    request: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {
    try {
        const user =
            await getCurrentUser();

        if (!user) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Unauthorized.",
                },
                {
                    status: 401,
                }
            );
        }

        const { id } =
            await context.params;

        const bookingId =
            Number(id);

        if (
            !Number.isInteger(
                bookingId
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid booking ID.",
                },
                {
                    status: 400,
                }
            );
        }

        const body =
            await request.json();

        const action =
            String(
                body.action || ""
            ).toUpperCase();

        if (
            action !== "CANCEL"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid action.",
                },
                {
                    status: 400,
                }
            );
        }

        // -----------------------------
        // GET BOOKING
        // -----------------------------

        const bookingResult =
            await db.query(
                `
        SELECT
          mb.id::int AS id,
          mb.meeting_title,
          mb.meeting_date::text
            AS meeting_date,
          mb.start_time::text
            AS start_time,
          mb.end_time::text
            AS end_time,
          mb.booking_status,
          mb.requested_by::int
            AS requested_by,

          mr.room_name

        FROM meeting_bookings mb

        JOIN meeting_rooms mr
          ON mr.id =
             mb.room_id

        WHERE mb.id = $1
        LIMIT 1
        `,
                [bookingId]
            );

        if (
            bookingResult.rowCount ===
            0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Booking not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const booking =
            bookingResult.rows[0];

        // User can only cancel
        // own booking.

        if (
            Number(
                booking.requested_by
            ) !==
            Number(user.id)
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "You cannot modify this booking.",
                },
                {
                    status: 403,
                }
            );
        }

        if (
            booking.booking_status !==
            "PENDING"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Only pending bookings can be cancelled directly.",
                },
                {
                    status: 409,
                }
            );
        }

        // -----------------------------
        // CANCEL
        // -----------------------------

        const updateResult =
            await db.query(
                `
        UPDATE meeting_bookings
        SET
          booking_status = 'CANCELLED',
          cancelled_at =
            CURRENT_TIMESTAMP,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = $1
          AND requested_by = $2
          AND booking_status = 'PENDING'
        RETURNING id
        `,
                [
                    bookingId,
                    user.id,
                ]
            );

        if (
            updateResult.rowCount === 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Booking could not be cancelled. Its status may have changed.",
                },
                {
                    status: 409,
                }
            );
        }

        await writeAuditLog({
            userId:
                user.id,

            action:
                "CANCEL_PENDING_BOOKING",

            module:
                "MEETING",

            recordType:
                "MEETING_BOOKING",

            recordId:
                bookingId,

            description:
                `Cancelled pending meeting request "${booking.meeting_title}".`,

            metadata: {
                meetingTitle:
                    booking.meeting_title,

                room:
                    booking.room_name,

                meetingDate:
                    booking.meeting_date,

                startTime:
                    booking.start_time,

                endTime:
                    booking.end_time,

                previousStatus:
                    "PENDING",

                newStatus:
                    "CANCELLED",
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        return Response.json({
            success: true,
            message:
                "Booking request cancelled successfully.",
        });

    } catch (error) {
        console.error(
            "Cancel booking error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to cancel booking.",
            },
            {
                status: 500,
            }
        );
    }
}