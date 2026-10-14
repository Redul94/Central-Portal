import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =================================
// ALLOWED BLOCK REASONS
// =================================

const ALLOWED_REASONS = [
    "Buyer Visit",
    "Buyer Online Meeting",
    "Supplier Meeting",
    "Audit (External/Internal)",
    "Training",
    "Meeting",
] as const;

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
// VALID DATE
// =================================

function isValidDate(
    value: string
) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
        value
    );
}

// =================================
// VALID TIME
// =================================

function isValidTime(
    value: string
) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(
        value
    );
}

// =================================
// VALID PHONE
// =================================

function isValidPhone(
    value: string
) {
    return /^[0-9+\-\s()]{5,50}$/.test(
        value
    );
}

// =================================
// GET ROOM BLOCKS
// =================================

export async function GET(
    request: Request
) {
    try {
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

        const url =
            new URL(
                request.url
            );

        const status =
            url.searchParams
                .get("status")
                ?.toUpperCase();

        const roomId =
            url.searchParams.get(
                "roomId"
            );

        const date =
            url.searchParams.get(
                "date"
            );

        const conditions:
            string[] = [];

        const values:
            unknown[] = [];

        // --------------------------------
        // STATUS FILTER
        // --------------------------------

        if (
            status &&
            [
                "ACTIVE",
                "CANCELLED",
            ].includes(
                status
            )
        ) {
            values.push(
                status
            );

            conditions.push(
                `mrb.block_status = $${values.length}`
            );
        }

        // --------------------------------
        // ROOM FILTER
        // --------------------------------

        if (
            roomId &&
            Number.isInteger(
                Number(
                    roomId
                )
            )
        ) {
            values.push(
                Number(
                    roomId
                )
            );

            conditions.push(
                `mrb.room_id = $${values.length}`
            );
        }

        // --------------------------------
        // DATE FILTER
        // --------------------------------

        if (
            date &&
            isValidDate(
                date
            )
        ) {
            values.push(
                date
            );

            conditions.push(
                `mrb.block_date = $${values.length}::date`
            );
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(
                    " AND "
                )}`
                : "";

        // =================================
        // LOAD BLOCKS
        // =================================

        const result =
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

                    mrb.block_status,

                    mrb.created_by::int
                        AS created_by,

                    pu.employee_id
                        AS created_by_employee_id,

                    pu.full_name
                        AS created_by_name,

                    mrb.created_at,

                    mrb.updated_at

                FROM meeting_room_blocks mrb

                INNER JOIN meeting_rooms mr
                    ON mr.id =
                       mrb.room_id

                INNER JOIN portal_users pu
                    ON pu.id =
                       mrb.created_by

                ${whereClause}

                ORDER BY
                    mrb.block_date DESC,
                    mrb.start_time DESC,
                    mrb.id DESC
                `,
                values
            );

        return Response.json({
            success: true,

            blocks:
                result.rows,
        });

    } catch (error) {
        console.error(
            "Load meeting room blocks error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load room blocks.",
            },
            {
                status: 500,
            }
        );
    }
}

// =================================
// CREATE ROOM BLOCK
// =================================

export async function POST(
    request: Request
) {
    const client =
        await db.connect();

    try {
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
        // BODY
        // --------------------------------

        const body =
            await request.json();

        const roomId =
            Number(
                body.roomId
            );

        const blockDate =
            String(
                body.blockDate ||
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

        const reason =
            String(
                body.reason ||
                    ""
            ).trim();

        const responsiblePerson =
            String(
                body.responsiblePerson ||
                    ""
            ).trim();

        const responsibleDesignation =
            String(
                body.responsibleDesignation ||
                    ""
            ).trim();

        const responsiblePhone =
            String(
                body.responsiblePhone ||
                    ""
            ).trim();

        // =================================
        // BASIC VALIDATION
        // =================================

        if (
            !Number.isInteger(
                roomId
            ) ||
            roomId <= 0
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Valid meeting room is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // DATE
        // --------------------------------

        if (
            !isValidDate(
                blockDate
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Valid block date is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // TIME
        // --------------------------------

        if (
            !isValidTime(
                startTime
            ) ||
            !isValidTime(
                endTime
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Valid start and end times are required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            endTime <=
            startTime
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
        // REASON
        // --------------------------------

        if (
            !ALLOWED_REASONS.includes(
                reason as typeof ALLOWED_REASONS[number]
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Please select a valid reason.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // RESPONSIBLE PERSON
        // --------------------------------

        if (
            !responsiblePerson
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Responsible person is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            responsiblePerson.length >
            150
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Responsible person name cannot exceed 150 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // RESPONSIBLE DESIGNATION
        // --------------------------------

        if (
            !responsibleDesignation
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Responsible person designation is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            responsibleDesignation.length >
            150
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Responsible person designation cannot exceed 150 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        // --------------------------------
        // RESPONSIBLE PHONE
        // --------------------------------

        if (
            !responsiblePhone
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Responsible person phone number is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !isValidPhone(
                responsiblePhone
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Please enter a valid responsible person phone number.",
                },
                {
                    status: 400,
                }
            );
        }

        // =================================
        // BEGIN TRANSACTION
        // =================================

        await client.query(
            "BEGIN"
        );

        // =================================
        // CHECK DATE
        // =================================

        const dateCheck =
            await client.query(
                `
                SELECT
                    CASE
                        WHEN $1::date <
                            (
                                CURRENT_TIMESTAMP
                                AT TIME ZONE
                                'Asia/Dhaka'
                            )::date

                        THEN false

                        ELSE true

                    END AS valid
                `,
                [
                    blockDate,
                ]
            );

        if (
            !dateCheck.rows[0]
                .valid
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "Past dates cannot be blocked.",
                },
                {
                    status: 400,
                }
            );
        }

        // =================================
        // CHECK ROOM
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

                FOR UPDATE
                `,
                [
                    roomId,
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
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        `Room is currently ${room.room_status}. Scheduled blocks can only be created for ACTIVE rooms.`,
                },
                {
                    status: 400,
                }
            );
        }

        // =================================
        // ADVISORY LOCK
        // =================================

        await client.query(
            `
            SELECT
                pg_advisory_xact_lock(
                    $1::int,
                    hashtext(
                        $2
                    )
                )
            `,
            [
                roomId,
                blockDate,
            ]
        );

        // =================================
        // CHECK APPROVED MEETING
        // =================================

        const bookingConflict =
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

                    AND start_time <
                        $4::time

                    AND end_time >
                        $3::time

                LIMIT 1
                `,
                [
                    roomId,
                    blockDate,
                    startTime,
                    endTime,
                ]
            );

        if (
            bookingConflict.rowCount &&
            bookingConflict.rowCount >
                0
        ) {
            const conflict =
                bookingConflict.rows[0];

            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        `Cannot block this period. Approved meeting "${conflict.meeting_title}" already uses this room from ${conflict.start_time.slice(
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
        // CHECK EXISTING ROOM BLOCK
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
                    roomId,
                    blockDate,
                    startTime,
                    endTime,
                ]
            );

        if (
            blockConflict.rowCount &&
            blockConflict.rowCount >
                0
        ) {
            const conflict =
                blockConflict.rows[0];

            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        `This room already has an active block from ${conflict.start_time.slice(
                            0,
                            5
                        )} to ${conflict.end_time.slice(
                            0,
                            5
                        )}. Reason: ${conflict.reason}`,
                },
                {
                    status: 409,
                }
            );
        }

        // =================================
        // CREATE BLOCK
        // =================================

        const result =
            await client.query(
                `
                INSERT INTO
                    meeting_room_blocks (
                        room_id,
                        block_date,
                        start_time,
                        end_time,
                        reason,
                        responsible_person,
                        responsible_designation,
                        responsible_phone,
                        block_status,
                        created_by
                    )

                VALUES (
                    $1,
                    $2::date,
                    $3::time,
                    $4::time,
                    $5,
                    $6,
                    $7,
                    $8,
                    'ACTIVE',
                    $9
                )

                RETURNING
                    id::int
                        AS id,

                    room_id::int
                        AS room_id,

                    block_date::text
                        AS block_date,

                    start_time::text
                        AS start_time,

                    end_time::text
                        AS end_time,

                    reason,

                    responsible_person,

                    responsible_designation,

                    responsible_phone,

                    block_status,

                    created_at
                `,
                [
                    roomId,
                    blockDate,
                    startTime,
                    endTime,
                    reason,
                    responsiblePerson,
                    responsibleDesignation,
                    responsiblePhone,
                    admin.id,
                ]
            );

        const block =
            result.rows[0];

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
                "CREATE_ROOM_BLOCK",

            module:
                "MEETING",

            recordType:
                "MEETING_ROOM_BLOCK",

            recordId:
                block.id,

            description:
                `Blocked "${room.room_name}" on ${blockDate} from ${startTime} to ${endTime}. Reason: ${reason}.`,

            metadata: {
                roomId,

                roomName:
                    room.room_name,

                blockDate,

                startTime,

                endTime,

                reason,

                responsiblePerson,

                responsibleDesignation,

                responsiblePhone,

                status:
                    "ACTIVE",
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        // =================================
        // SUCCESS
        // =================================

        return Response.json(
            {
                success: true,

                message:
                    "Room block created successfully.",

                block,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        try {
            await client.query(
                "ROLLBACK"
            );
        } catch {
            // Ignore rollback error
        }

        console.error(
            "Create meeting room block error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to create room block.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}