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
// CANCEL ROOM BLOCK
// --------------------------------

export async function POST(
    request: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {
    const client =
        await db.connect();

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

        const blockId =
            Number(id);

        if (
            !Number.isInteger(
                blockId
            ) ||
            blockId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid room block ID.",
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
                body.action ||
                ""
            ).toUpperCase();

        if (
            action !==
            "CANCEL"
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

        await client.query(
            "BEGIN"
        );

        const blockResult =
            await client.query(
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

                    mrb.block_status

                FROM meeting_room_blocks
                    mrb

                INNER JOIN meeting_rooms
                    mr
                    ON mr.id =
                       mrb.room_id

                WHERE mrb.id = $1

                FOR UPDATE
                `,
                [blockId]
            );

        if (
            blockResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Room block not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const block =
            blockResult.rows[0];

        if (
            block.block_status ===
            "CANCELLED"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "This room block is already cancelled.",
                },
                {
                    status: 400,
                }
            );
        }

        await client.query(
            `
            UPDATE meeting_room_blocks
            SET
                block_status =
                    'CANCELLED',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [blockId]
        );

        await client.query(
            "COMMIT"
        );

        await writeAuditLog({
            userId:
                admin.id,

            action:
                "CANCEL_ROOM_BLOCK",

            module:
                "MEETING",

            recordType:
                "MEETING_ROOM_BLOCK",

            recordId:
                blockId,

            description:
                `Cancelled room block for "${block.room_name}" on ${block.block_date}.`,

            metadata: {
                roomId:
                    block.room_id,

                roomName:
                    block.room_name,

                blockDate:
                    block.block_date,

                startTime:
                    block.start_time,

                endTime:
                    block.end_time,

                reason:
                    block.reason,

                previousStatus:
                    "ACTIVE",

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
                "Room block cancelled successfully.",
        });

    } catch (error) {
        try {
            await client.query(
                "ROLLBACK"
            );
        } catch {
            // Ignore rollback error
        }

        console.error(
            "Cancel meeting room block error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to cancel room block.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}