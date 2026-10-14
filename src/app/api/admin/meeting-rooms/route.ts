import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
            [session.userId]
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
// GET ALL ROOMS
// --------------------------------

export async function GET() {
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

        const result =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    room_name,
                    room_status,
                    remarks,
                    created_at,
                    updated_at
                FROM meeting_rooms
                ORDER BY id
                `
            );

        return Response.json({
            success: true,
            rooms:
                result.rows,
        });

    } catch (error) {
        console.error(
            "Meeting rooms error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to retrieve meeting rooms.",
            },
            {
                status: 500,
            }
        );
    }
}

// --------------------------------
// ADD ROOM
// --------------------------------

export async function POST(
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

        const body =
            await request.json();

        const roomName =
            String(
                body.roomName ||
                ""
            ).trim();

        const remarks =
            String(
                body.remarks ||
                ""
            ).trim() ||
            null;

        if (!roomName) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Room name is required.",
                },
                {
                    status: 400,
                }
            );
        }

        const duplicate =
            await db.query(
                `
                SELECT id
                FROM meeting_rooms
                WHERE LOWER(room_name) =
                      LOWER($1)
                LIMIT 1
                `,
                [roomName]
            );

        if (
            duplicate.rowCount &&
            duplicate.rowCount > 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "A meeting room with this name already exists.",
                },
                {
                    status: 409,
                }
            );
        }

        const result =
            await db.query(
                `
                INSERT INTO meeting_rooms (
                    room_name,
                    room_status,
                    remarks
                )
                VALUES (
                    $1,
                    'ACTIVE',
                    $2
                )
                RETURNING
                    id::int AS id,
                    room_name,
                    room_status,
                    remarks,
                    created_at
                `,
                [
                    roomName,
                    remarks,
                ]
            );

        const room =
            result.rows[0];

        await writeAuditLog({
            userId:
                admin.id,

            action:
                "CREATE_MEETING_ROOM",

            module:
                "MEETING",

            recordType:
                "MEETING_ROOM",

            recordId:
                room.id,

            description:
                `Created meeting room "${roomName}".`,

            metadata: {
                roomName,
                status:
                    "ACTIVE",
                remarks,
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        return Response.json(
            {
                success: true,
                message:
                    "Meeting room added successfully.",
                room,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Add meeting room error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to add meeting room.",
            },
            {
                status: 500,
            }
        );
    }
}