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
    // CHANGE REQUEST ID
    // --------------------------------

    const { id } =
        await context.params;

    const requestId =
        Number(id);

    if (
        !Number.isInteger(
            requestId
        ) ||
        requestId <= 0
    ) {
        return Response.json(
            {
                success: false,
                message:
                    "Invalid request ID.",
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
        action !==
            "APPROVE" &&
        action !==
            "REJECT"
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
        // LOCK CHANGE REQUEST
        // =================================

        const changeResult =
            await client.query(
                `
                SELECT
                    mcr.id::int
                        AS id,

                    mcr.booking_id::int
                        AS booking_id,

                    mcr.requested_by::int
                        AS requested_by,

                    mcr.request_type,

                    mcr.request_status,

                    mcr.reason,

                    mcr.new_room_id::int
                        AS new_room_id,

                    mcr.new_meeting_date::text
                        AS new_meeting_date,

                    mcr.new_start_time::text
                        AS new_start_time,

                    mcr.new_end_time::text
                        AS new_end_time,

                    requester.full_name,

                    requester.employee_id,

                    new_room.room_name
                        AS new_room_name

                FROM meeting_change_requests mcr

                INNER JOIN portal_users requester
                    ON requester.id =
                       mcr.requested_by

                LEFT JOIN meeting_rooms new_room
                    ON new_room.id =
                       mcr.new_room_id

                WHERE mcr.id = $1

                FOR UPDATE OF mcr
                `,
                [
                    requestId,
                ]
            );

        if (
            changeResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Change request not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const change =
            changeResult.rows[0];

        // =================================
        // REQUEST MUST STILL BE PENDING
        // =================================

        if (
            change.request_status !==
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
        // LOCK ORIGINAL BOOKING
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

                    mr.room_name

                FROM meeting_bookings mb

                INNER JOIN meeting_rooms mr
                    ON mr.id =
                       mb.room_id

                WHERE mb.id = $1

                FOR UPDATE OF mb
                `,
                [
                    change.booking_id,
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
                        "Original booking not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const booking =
            bookingResult.rows[0];

        // =================================
        // ORIGINAL BOOKING MUST BE APPROVED
        // =================================

        if (
            booking.booking_status !==
            "APPROVED"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "The original booking is no longer active.",
                },
                {
                    status: 409,
                }
            );
        }

        // =================================
        // REJECT CHANGE REQUEST
        // =================================

        if (
            action ===
            "REJECT"
        ) {
            await client.query(
                `
                UPDATE meeting_change_requests

                SET
                    request_status =
                        'REJECTED',

                    reviewed_by =
                        $1,

                    reviewed_at =
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
                    requestId,
                ]
            );

            await client.query(
                "COMMIT"
            );

            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    change.request_type ===
                    "CANCEL"
                        ? "REJECT_CANCELLATION"
                        : "REJECT_RESCHEDULE",

                module:
                    "MEETING",

                recordType:
                    "MEETING_CHANGE_REQUEST",

                recordId:
                    requestId,

                description:
                    `Rejected ${change.request_type.toLowerCase()} request for meeting "${booking.meeting_title}" from ${change.full_name} (${change.employee_id}).`,

                metadata: {
                    bookingId:
                        change.booking_id,

                    meetingTitle:
                        booking.meeting_title,

                    requestType:
                        change.request_type,

                    requestedBy:
                        change.full_name,

                    employeeId:
                        change.employee_id,

                    rejectionReason,
                },

                ipAddress,
            });

            return Response.json({
                success: true,

                message:
                    "Change request rejected.",
            });
        }

        // =================================
        // APPROVE CANCELLATION
        // =================================

        if (
            change.request_type ===
            "CANCEL"
        ) {
            // --------------------------------
            // CANCEL ORIGINAL BOOKING
            // --------------------------------

            await client.query(
                `
                UPDATE meeting_bookings

                SET
                    booking_status =
                        'CANCELLED',

                    cancelled_at =
                        CURRENT_TIMESTAMP,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    change.booking_id,
                ]
            );

            // --------------------------------
            // APPROVE CHANGE REQUEST
            // --------------------------------

            await client.query(
                `
                UPDATE meeting_change_requests

                SET
                    request_status =
                        'APPROVED',

                    reviewed_by =
                        $1,

                    reviewed_at =
                        CURRENT_TIMESTAMP,

                    rejection_reason =
                        NULL,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $2
                `,
                [
                    admin.id,
                    requestId,
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
                    "APPROVE_CANCELLATION",

                module:
                    "MEETING",

                recordType:
                    "MEETING_CHANGE_REQUEST",

                recordId:
                    requestId,

                description:
                    `Approved cancellation of meeting "${booking.meeting_title}" for ${change.full_name} (${change.employee_id}).`,

                metadata: {
                    bookingId:
                        change.booking_id,

                    meetingTitle:
                        booking.meeting_title,

                    requestedBy:
                        change.full_name,

                    employeeId:
                        change.employee_id,

                    room:
                        booking.room_name,

                    meetingDate:
                        booking.meeting_date,

                    startTime:
                        booking.start_time,

                    endTime:
                        booking.end_time,

                    previousStatus:
                        "APPROVED",

                    newStatus:
                        "CANCELLED",

                    reason:
                        change.reason,
                },

                ipAddress,
            });

            return Response.json({
                success: true,

                message:
                    "Cancellation request approved. The meeting has been cancelled.",
            });
        }

        // =================================
        // APPROVE RESCHEDULE
        // =================================

        if (
            change.request_type ===
            "RESCHEDULE"
        ) {
            // --------------------------------
            // REQUIRED RESCHEDULE DATA
            // --------------------------------

            if (
                !change.new_room_id ||
                !change.new_meeting_date ||
                !change.new_start_time ||
                !change.new_end_time
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,
                        message:
                            "Reschedule information is incomplete.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            // =================================
            // CHECK DESTINATION ROOM
            // =================================

            const roomResult =
                await client.query(
                    `
                    SELECT
                        id::int AS id,
                        room_name,
                        room_status
                    FROM meeting_rooms
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [
                        change.new_room_id,
                    ]
                );

            if (
                roomResult.rowCount ===
                0
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,
                        message:
                            "Requested meeting room no longer exists.",
                    },
                    {
                        status: 404,
                    }
                );
            }

            const newRoom =
                roomResult.rows[0];

            // =================================
            // ROOM MUST STILL BE ACTIVE
            // =================================

            if (
                newRoom.room_status !==
                "ACTIVE"
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            `Cannot approve reschedule. "${newRoom.room_name}" is currently ${newRoom.room_status}.`,
                    },
                    {
                        status: 409,
                    }
                );
            }

            // =================================
            // CHECK DATE
            // =================================

            const dateCheck =
                await client.query(
                    `
                    SELECT
                        $1::date <
                        CURRENT_DATE
                        AS is_past
                    `,
                    [
                        change.new_meeting_date,
                    ]
                );

            if (
                dateCheck.rows[0]
                    .is_past
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,
                        message:
                            "The requested new meeting date is already in the past.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            // =================================
            // LOCK DESTINATION ROOM + DATE
            // =================================

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
                    change.new_room_id,
                    change.new_meeting_date,
                ]
            );

            // =================================
            // RE-CHECK APPROVED MEETING CONFLICT
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
                        change.new_room_id,
                        change.new_meeting_date,
                        change.booking_id,
                        change.new_start_time,
                        change.new_end_time,
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
                            `Cannot approve reschedule. "${conflict.meeting_title}" is already approved from ${conflict.start_time.slice(
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
                        change.new_room_id,
                        change.new_meeting_date,
                        change.new_start_time,
                        change.new_end_time,
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
                            `Cannot approve reschedule. "${newRoom.room_name}" is unavailable from ${block.start_time.slice(
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
            // OLD SCHEDULE
            // =================================

            const oldSchedule = {
                room:
                    booking.room_name,

                meetingDate:
                    booking.meeting_date,

                startTime:
                    booking.start_time,

                endTime:
                    booking.end_time,
            };

            // =================================
            // NEW SCHEDULE
            // =================================

            const newSchedule = {
                room:
                    newRoom.room_name,

                meetingDate:
                    change.new_meeting_date,

                startTime:
                    change.new_start_time,

                endTime:
                    change.new_end_time,
            };

            // =================================
            // UPDATE ORIGINAL BOOKING
            // =================================

            await client.query(
                `
                UPDATE meeting_bookings

                SET
                    room_id =
                        $1,

                    meeting_date =
                        $2::date,

                    start_time =
                        $3::time,

                    end_time =
                        $4::time,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $5
                `,
                [
                    change.new_room_id,
                    change.new_meeting_date,
                    change.new_start_time,
                    change.new_end_time,
                    change.booking_id,
                ]
            );

            // =================================
            // APPROVE CHANGE REQUEST
            // =================================

            await client.query(
                `
                UPDATE meeting_change_requests

                SET
                    request_status =
                        'APPROVED',

                    reviewed_by =
                        $1,

                    reviewed_at =
                        CURRENT_TIMESTAMP,

                    rejection_reason =
                        NULL,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $2
                `,
                [
                    admin.id,
                    requestId,
                ]
            );

            // =================================
            // COMMIT
            // =================================

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
                    "APPROVE_RESCHEDULE",

                module:
                    "MEETING",

                recordType:
                    "MEETING_CHANGE_REQUEST",

                recordId:
                    requestId,

                description:
                    `Approved reschedule of meeting "${booking.meeting_title}" for ${change.full_name} (${change.employee_id}).`,

                metadata: {
                    bookingId:
                        change.booking_id,

                    meetingTitle:
                        booking.meeting_title,

                    requestedBy:
                        change.full_name,

                    employeeId:
                        change.employee_id,

                    reason:
                        change.reason,

                    oldSchedule,

                    newSchedule,
                },

                ipAddress,
            });

            return Response.json({
                success: true,

                message:
                    "Reschedule request approved. The meeting schedule has been updated.",
            });
        }

        // =================================
        // UNSUPPORTED REQUEST
        // =================================

        await client.query(
            "ROLLBACK"
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unsupported change request.",
            },
            {
                status: 400,
            }
        );

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
            "Meeting change approval error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to process change request.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}