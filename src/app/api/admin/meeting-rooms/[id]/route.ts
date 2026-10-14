import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

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

export async function POST(
    request: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    }
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

        const { id } =
            await context.params;

        const roomId =
            Number(id);

        if (
            !Number.isInteger(
                roomId
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid room ID.",
                },
                {
                    status: 400,
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

        const roomStatus =
            String(
                body.roomStatus ||
                ""
            ).toUpperCase();

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

        if (
            ![
                "ACTIVE",
                "MAINTENANCE",
                "DISABLED",
            ].includes(
                roomStatus
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid room status.",
                },
                {
                    status: 400,
                }
            );
        }

        const existing =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    room_name,
                    room_status,
                    remarks
                FROM meeting_rooms
                WHERE id = $1
                LIMIT 1
                `,
                [roomId]
            );

        if (
            existing.rowCount ===
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

        const oldRoom =
            existing.rows[0];

        const duplicate =
            await db.query(
                `
                SELECT id
                FROM meeting_rooms
                WHERE LOWER(room_name) =
                      LOWER($1)
                  AND id <> $2
                LIMIT 1
                `,
                [
                    roomName,
                    roomId,
                ]
            );

        if (
            duplicate.rowCount &&
            duplicate.rowCount > 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Another room already uses this name.",
                },
                {
                    status: 409,
                }
            );
        }

        const result =
            await db.query(
                `
                UPDATE meeting_rooms
                SET
                    room_name = $1,
                    room_status = $2,
                    remarks = $3,
                    updated_at =
                        CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING
                    id::int AS id,
                    room_name,
                    room_status,
                    remarks,
                    updated_at
                `,
                [
                    roomName,
                    roomStatus,
                    remarks,
                    roomId,
                ]
            );

        await writeAuditLog({
            userId:
                admin.id,

            action:
                "UPDATE_MEETING_ROOM",

            module:
                "MEETING",

            recordType:
                "MEETING_ROOM",

            recordId:
                roomId,

            description:
                `Updated meeting room "${roomName}".`,

            metadata: {
                previous: {
                    roomName:
                        oldRoom.room_name,
                    status:
                        oldRoom.room_status,
                    remarks:
                        oldRoom.remarks,
                },

                updated: {
                    roomName,
                    status:
                        roomStatus,
                    remarks,
                },
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        return Response.json({
            success: true,
            message:
                "Meeting room updated successfully.",
            room:
                result.rows[0],
        });

    } catch (error) {
        console.error(
            "Update meeting room error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to update meeting room.",
            },
            {
                status: 500,
            }
        );
    }
}