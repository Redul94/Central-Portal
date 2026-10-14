import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// CURRENT USER
// ==========================================

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

// ==========================================
// MARK ONE AS READ
// ==========================================

export async function PATCH(
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

        const params =
            await context.params;

        const notificationId =
            Number(
                params.id
            );

        if (
            !Number.isInteger(
                notificationId
            ) ||
            notificationId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid notification ID.",
                },
                {
                    status: 400,
                }
            );
        }

        const result =
            await db.query(
                `
                UPDATE portal_notifications

                SET
                    is_read =
                        TRUE,

                    read_at =
                        COALESCE(
                            read_at,
                            CURRENT_TIMESTAMP
                        )

                WHERE
                    id = $1

                    AND
                    recipient_user_id =
                        $2

                RETURNING
                    id::int AS id,
                    is_read,
                    read_at,
                    link_url
                `,
                [
                    notificationId,
                    user.id,
                ]
            );

        if (
            result.rowCount === 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Notification not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return Response.json({
            success: true,

            message:
                "Notification marked as read.",

            notification:
                result.rows[0],
        });

    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to update notification.",
            },
            {
                status: 500,
            }
        );
    }
}