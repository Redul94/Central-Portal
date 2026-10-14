import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =================================
// GET ADMIN
// =================================

async function getAdmin() {
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
        return null;
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
        return null;
    }

    return admin;
}

// =================================
// IP ADDRESS
// =================================

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

// =================================
// POST
// =================================

export async function POST(
    request: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {
    // --------------------------------
    // ADMIN
    // --------------------------------

    const admin =
        await getAdmin();

    if (!admin) {
        return Response.json(
            {
                success: false,
                message:
                    "Unauthorized.",
            },
            {
                status: 403,
            }
        );
    }

    // --------------------------------
    // BOOKING ID
    // --------------------------------

    const { id } =
        await context.params;

    const bookingId =
        Number(id);

    if (
        !Number.isInteger(
            bookingId
        ) ||
        bookingId <= 0
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

    // --------------------------------
    // REQUEST BODY
    // --------------------------------

    let body: {
        action?: string;
        rejectionReason?: string;
    };

    try {
        body =
            await request.json();

    } catch {
        return Response.json(
            {
                success: false,
                message:
                    "Invalid request body.",
            },
            {
                status: 400,
            }
        );
    }

    const action =
        String(
            body.action ||
                ""
        ).toUpperCase();

    const rejectionReason =
        String(
            body.rejectionReason ||
                ""
        ).trim();

    if (
        ![
            "APPROVE",
            "REJECT",
        ].includes(
            action
        )
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

    if (
        action ===
            "REJECT" &&
        !rejectionReason
    ) {
        return Response.json(
            {
                success: false,
                message:
                    "Rejection reason is required.",
            },
            {
                status: 400,
            }
        );
    }

    const ipAddress =
        getIpAddress(
            request
        );

    const client =
        await db.connect();

    try {
        // =================================
        // START TRANSACTION
        // =================================

        await client.query(
            "BEGIN"
        );

        // =================================
        // LOCK BOOKING
        // =================================

        const bookingResult =
            await client.query(
                `
                SELECT
                    mb.id::int
                        AS id,

                    mb.meeting_title,

                    mb.room_id::int
                        AS room_id,

                    mb.meeting_date::text
                        AS meeting_date,

                    mb.start_time::text
                        AS start_time,

                    mb.end_time::text
                        AS end_time,

                    mb.booking_status,

                    mb.requested_by::int
                        AS requested_by,

                    mr.room_name,

                    mr.room_status,

                    pu.employee_id,

                    pu.full_name

                FROM meeting_bookings mb

                INNER JOIN meeting_rooms mr
                    ON mr.id =
                       mb.room_id

                INNER JOIN portal_users pu
                    ON pu.id =
                       mb.requested_by

                WHERE mb.id = $1

                FOR UPDATE OF mb
                `,
                [
                    bookingId,
                ]
            );

        if (
            bookingResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

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

        // =================================
        // MUST STILL BE PENDING
        // =================================

        if (
            booking.booking_status !==
            "PENDING"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "This request has already been processed.",
                },
                {
                    status: 409,
                }
            );
        }

        // =================================
        // REJECT BOOKING
        // =================================

        if (
            action ===
            "REJECT"
        ) {
            await client.query(
                `
                UPDATE meeting_bookings

                SET
                    booking_status =
                        'REJECTED',

                    approved_by =
                        $1,

                    approved_at =
                        CURRENT_TIMESTAMP,

                    rejection_reason =
                        $2,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $3
                `,
                [
                    admin.id,
                    rejectionReason,
                    bookingId,
                ]
            );

            await client.query(
                "COMMIT"
            );

            // --------------------------------
            // AUDIT
            // --------------------------------

            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    "REJECT_BOOKING",

                module:
                    "MEETING",

                recordType:
                    "MEETING_BOOKING",

                recordId:
                    bookingId,

                description:
                    `Rejected meeting "${booking.meeting_title}" requested by ${booking.full_name} (${booking.employee_id}).`,

                metadata: {
                    meetingTitle:
                        booking.meeting_title,

                    requestedBy:
                        booking.full_name,

                    employeeId:
                        booking.employee_id,

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
                        "REJECTED",

                    rejectionReason,
                },

                ipAddress,
            });

            return Response.json({
                success: true,

                message:
                    "Meeting request rejected.",
            });
        }

        // =================================
        // APPROVE BOOKING
        // =================================

        // --------------------------------
        // LOCK ROOM + DATE
        // --------------------------------
        // Room block creation uses the same
        // advisory lock, preventing a block
        // and approval from being created
        // simultaneously.

        await client.query(
            `
            SELECT
                pg_advisory_xact_lock(
                    $1::int,
                    hashtext(
                        $2::text
                    )
                )
            `,
            [
                booking.room_id,
                booking.meeting_date,
            ]
        );

        // =================================
        // ROOM MUST STILL BE ACTIVE
        // =================================

        if (
            booking.room_status !==
            "ACTIVE"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        `Cannot approve. "${booking.room_name}" is currently ${booking.room_status}.`,
                },
                {
                    status: 409,
                }
            );
        }

        // =================================
        // RE-CHECK APPROVED CONFLICT
        // =================================

        const conflictResult =
            await client.query(
                `
                SELECT
                    id::int AS id,

                    meeting_title,

                    start_time::text
                        AS start_time,

                    end_time::text
                        AS end_time

                FROM meeting_bookings

                WHERE
                    room_id = $1

                    AND meeting_date =
                        $2::date

                    AND booking_status =
                        'APPROVED'

                    AND id <> $3

                    AND start_time <
                        $5::time

                    AND end_time >
                        $4::time

                LIMIT 1
                `,
                [
                    booking.room_id,
                    booking.meeting_date,
                    bookingId,
                    booking.start_time,
                    booking.end_time,
                ]
            );

        if (
            conflictResult.rowCount &&
            conflictResult.rowCount >
                0
        ) {
            const conflict =
                conflictResult.rows[0];

            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        `Cannot approve. This room already has an approved meeting "${conflict.meeting_title}" from ${conflict.start_time.slice(
                            0,
                            5
                        )} to ${conflict.end_time.slice(
                            0,
                            5
                        )}.`,
                },
                {
                    status: 409,
                }
            );
        }

        // =================================
        // CHECK SCHEDULED ROOM BLOCK
        // =================================

        const blockConflict =
            await client.query(
                `
                SELECT
                    id::int AS id,

                    start_time::text
                        AS start_time,

                    end_time::text
                        AS end_time,

                    reason

                FROM meeting_room_blocks

                WHERE
                    room_id = $1

                    AND block_date =
                        $2::date

                    AND block_status =
                        'ACTIVE'

                    AND start_time <
                        $4::time

                    AND end_time >
                        $3::time

                LIMIT 1
                `,
                [
                    booking.room_id,
                    booking.meeting_date,
                    booking.start_time,
                    booking.end_time,
                ]
            );

        if (
            blockConflict.rowCount &&
            blockConflict.rowCount >
                0
        ) {
            const block =
                blockConflict.rows[0];

            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        `Cannot approve. "${booking.room_name}" is unavailable from ${block.start_time.slice(
                            0,
                            5
                        )} to ${block.end_time.slice(
                            0,
                            5
                        )}. Reason: ${block.reason}`,
                },
                {
                    status: 409,
                }
            );
        }

        // =================================
        // APPROVE
        // =================================

        await client.query(
            `
            UPDATE meeting_bookings

            SET
                booking_status =
                    'APPROVED',

                approved_by =
                    $1,

                approved_at =
                    CURRENT_TIMESTAMP,

                rejection_reason =
                    NULL,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
                admin.id,
                bookingId,
            ]
        );

        await client.query(
            "COMMIT"
        );

        // =================================
        // AUDIT
        // =================================

        await writeAuditLog({
            userId:
                admin.id,

            action:
                "APPROVE_BOOKING",

            module:
                "MEETING",

            recordType:
                "MEETING_BOOKING",

            recordId:
                bookingId,

            description:
                `Approved meeting "${booking.meeting_title}" for ${booking.full_name} (${booking.employee_id}).`,

            metadata: {
                meetingTitle:
                    booking.meeting_title,

                requestedBy:
                    booking.full_name,

                employeeId:
                    booking.employee_id,

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
                    "APPROVED",
            },

            ipAddress,
        });

        // =================================
        // SUCCESS
        // =================================

        return Response.json({
            success: true,

            message:
                "Meeting request approved successfully.",
        });

    } catch (error) {
        try {
            await client.query(
                "ROLLBACK"
            );
        } catch {
            // Transaction may already
            // have been committed.
        }

        console.error(
            "Meeting approval error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to process meeting request.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}