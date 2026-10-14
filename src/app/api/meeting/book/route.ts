import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --------------------------------
// GET CURRENT USER
// --------------------------------

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
                department,
                designation,
                official_email,
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

// --------------------------------
// IP ADDRESS
// --------------------------------

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

// --------------------------------
// POST BOOKING
// --------------------------------

export async function POST(
    request: Request
) {
    try {

        // --------------------------------
        // USER
        // --------------------------------

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

        // --------------------------------
        // REQUEST BODY
        // --------------------------------

        const body =
            await request.json();

        const meetingTitle =
            String(
                body.meetingTitle ||
                ""
            ).trim();

        const roomId =
            Number(
                body.roomId
            );

        const meetingDate =
            String(
                body.meetingDate ||
                ""
            ).trim();

        const startTime =
            String(
                body.startTime ||
                ""
            ).trim();

        const endTime =
            String(
                body.endTime ||
                ""
            ).trim();

        const expectedParticipants =
            body.expectedParticipants
                ? Number(
                    body.expectedParticipants
                )
                : null;

        const agenda =
            String(
                body.agenda ||
                ""
            ).trim();

        const specialRequirement =
            String(
                body.specialRequirement ||
                ""
            ).trim() ||
            null;

        // --------------------------------
        // REQUIRED FIELD VALIDATION
        // --------------------------------

        if (
            !meetingTitle ||
            !Number.isInteger(
                roomId
            ) ||
            roomId <= 0 ||
            !meetingDate ||
            !startTime ||
            !endTime ||
            !agenda
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please complete all required fields.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // PARTICIPANT VALIDATION
        // --------------------------------

        if (
            expectedParticipants !==
            null &&
            (
                !Number.isInteger(
                    expectedParticipants
                ) ||
                expectedParticipants <
                1
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Expected participants must be at least 1.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // CHECK ROOM
        // --------------------------------

        const roomResult =
            await db.query(
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
                    roomId,
                ]
            );

        if (
            roomResult.rowCount ===
            0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Meeting room not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const room =
            roomResult.rows[0];

        // --------------------------------
        // ROOM MUST BE ACTIVE
        // --------------------------------

        if (
            room.room_status !==
            "ACTIVE"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Selected meeting room is unavailable.",
                },
                {
                    status: 409,
                }
            );
        }

        // --------------------------------
        // CHECK DATE
        // --------------------------------

        const dateCheck =
            await db.query(
                `
                SELECT
                    $1::date <
                    CURRENT_DATE
                    AS is_past
                `,
                [
                    meetingDate,
                ]
            );

        if (
            dateCheck.rows[0]
                .is_past
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Meeting date cannot be in the past.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // CHECK TIME
        // --------------------------------

        const timeCheck =
            await db.query(
                `
                SELECT
                    $1::time <
                    $2::time
                    AS valid_time
                `,
                [
                    startTime,
                    endTime,
                ]
            );

        if (
            !timeCheck.rows[0]
                .valid_time
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "End time must be later than start time.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // CHECK APPROVED MEETING CONFLICT
        // --------------------------------
        // Pending overlaps are allowed.

        const conflictResult =
            await db.query(
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
                    AND start_time <
                        $4::time
                    AND end_time >
                        $3::time
                LIMIT 1
                `,
                [
                    roomId,
                    meetingDate,
                    startTime,
                    endTime,
                ]
            );

        if (
            conflictResult.rowCount &&
            conflictResult.rowCount >
            0
        ) {
            const conflict =
                conflictResult.rows[0];

            return Response.json(
                {
                    success: false,

                    message:
                        `This room already has an approved meeting from ${conflict.start_time.slice(
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

        // --------------------------------
        // CHECK SCHEDULED ROOM BLOCK
        // --------------------------------

        const roomBlockConflict =
            await db.query(
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
                    roomId,
                    meetingDate,
                    startTime,
                    endTime,
                ]
            );

        if (
            roomBlockConflict.rowCount &&
            roomBlockConflict.rowCount >
            0
        ) {
            const block =
                roomBlockConflict.rows[0];

            return Response.json(
                {
                    success: false,

                    message:
                        `This room is unavailable from ${block.start_time.slice(
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

        // --------------------------------
        // CREATE BOOKING
        // --------------------------------

        const result =
            await db.query(
                `
                INSERT INTO
                    meeting_bookings (
                        meeting_title,
                        room_id,
                        meeting_date,
                        start_time,
                        end_time,
                        expected_participants,
                        agenda,
                        special_requirement,
                        requested_by,
                        booking_status
                    )
                VALUES (
                    $1,
                    $2,
                    $3::date,
                    $4::time,
                    $5::time,
                    $6,
                    $7,
                    $8,
                    $9,
                    'PENDING'
                )
                RETURNING
                    id::int AS id,
                    booking_status,
                    created_at
                `,
                [
                    meetingTitle,
                    roomId,
                    meetingDate,
                    startTime,
                    endTime,
                    expectedParticipants,
                    agenda,
                    specialRequirement,
                    user.id,
                ]
            );

        const booking =
            result.rows[0];

        // --------------------------------
        // AUDIT LOG
        // --------------------------------

        await writeAuditLog({
            userId:
                user.id,

            action:
                "CREATE_BOOKING",

            module:
                "MEETING",

            recordType:
                "MEETING_BOOKING",

            recordId:
                booking.id,

            description:
                `Created meeting booking request "${meetingTitle}".`,

            metadata: {
                meetingTitle,

                roomId,

                roomName:
                    room.room_name,

                meetingDate,

                startTime,

                endTime,

                expectedParticipants,

                agenda,

                specialRequirement,

                status:
                    "PENDING",
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        // --------------------------------
        // SUCCESS
        // --------------------------------

        return Response.json(
            {
                success: true,

                message:
                    "Meeting booking request submitted successfully. Waiting for Admin approval.",

                booking,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Meeting booking error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to submit meeting booking.",
            },
            {
                status: 500,
            }
        );
    }
}