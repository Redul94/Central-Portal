import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { syncCompletedMeetings } from "@/lib/meeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =================================
// VALID DATE
// =================================

function validDate(
    value: string
) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
        value
    );
}

// =================================
// GET CURRENT USER
// =================================

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

// =================================
// GET AVAILABILITY
// =================================

export async function GET(
    request: Request
) {
    try {
        // --------------------------------
        // AUTH
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
        // AUTO COMPLETE OLD MEETINGS
        // --------------------------------

        await syncCompletedMeetings();

        // --------------------------------
        // DATE
        // --------------------------------

        const url =
            new URL(
                request.url
            );

        const date =
            String(
                url.searchParams.get(
                    "date"
                ) || ""
            ).trim();

        if (
            !validDate(
                date
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Valid date is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // =================================
        // ROOMS
        // =================================

        const roomResult =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    room_name,
                    room_status,
                    remarks

                FROM meeting_rooms

                ORDER BY id
                `
            );

        // =================================
        // BOOKINGS
        // =================================

        const bookingResult =
            await db.query(
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

                    mb.expected_participants,

                    mb.agenda,

                    mb.special_requirement,

                    mb.booking_status,

                    mb.requested_by::int
                        AS requested_by,

                    pu.employee_id,

                    pu.full_name,

                    pu.department,

                    pu.designation

                FROM meeting_bookings mb

                INNER JOIN portal_users pu
                    ON pu.id =
                       mb.requested_by

                WHERE
                    mb.meeting_date =
                        $1::date

                    AND mb.booking_status
                        IN (
                            'PENDING',
                            'APPROVED'
                        )

                ORDER BY
                    mb.start_time,
                    mb.id
                `,
                [
                    date,
                ]
            );

        // =================================
        // SCHEDULED ROOM BLOCKS
        // =================================

        const blockResult =
            await db.query(
                `
                SELECT
                    mrb.id::int
                        AS id,

                    mrb.room_id::int
                        AS room_id,

                    mr.room_name,

                    mrb.block_date::text
                        AS block_date,

                    mrb.start_time::text
                        AS start_time,

                    mrb.end_time::text
                        AS end_time,

                    mrb.reason,

                    mrb.responsible_person,

                    mrb.responsible_designation,

                    mrb.responsible_phone,

                    mrb.block_status

                FROM meeting_room_blocks mrb

                INNER JOIN meeting_rooms mr
                    ON mr.id =
                       mrb.room_id

                WHERE
                    mrb.block_date =
                        $1::date

                    AND
                    mrb.block_status =
                        'ACTIVE'

                ORDER BY
                    mrb.start_time,
                    mrb.id
                `,
                [
                    date,
                ]
            );

        // =================================
        // RESPONSE
        // =================================

        return Response.json({
            success: true,

            date,

            rooms:
                roomResult.rows,

            bookings:
                bookingResult.rows,

            blocks:
                blockResult.rows,
        });

    } catch (error) {
        console.error(
            "Meeting availability error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load meeting availability.",
            },
            {
                status: 500,
            }
        );
    }
}