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
// GET MY NOTIFICATIONS
// ==========================================

export async function GET(
    request: Request
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

        const url =
            new URL(
                request.url
            );

        const requestedLimit =
            Number(
                url.searchParams.get(
                    "limit"
                ) || 50
            );

        const limit =
            Number.isInteger(
                requestedLimit
            )
                ? Math.min(
                    Math.max(
                        requestedLimit,
                        1
                    ),
                    100
                )
                : 50;

        const unreadOnly =
            url.searchParams.get(
                "unreadOnly"
            ) === "true";

        // ======================================
        // NOTIFICATIONS
        // ======================================

        const values:
            unknown[] = [
                user.id,
            ];

        let unreadCondition =
            "";

        if (unreadOnly) {
            unreadCondition =
                "AND n.is_read = FALSE";
        }

        values.push(
            limit
        );

        const notificationResult =
            await db.query(
                `
                SELECT
                    n.id::int AS id,

                    n.recipient_user_id::int
                        AS recipient_user_id,

                    n.actor_user_id::int
                        AS actor_user_id,

                    n.module,

                    n.notification_type,

                    n.title,

                    n.message,

                    n.reference_type,

                    n.reference_id::int
                        AS reference_id,

                    n.link_url,

                    n.is_read,

                    n.read_at,

                    n.created_at,

                    actor.employee_id
                        AS actor_employee_id,

                    actor.full_name
                        AS actor_name

                FROM portal_notifications n

                LEFT JOIN portal_users actor
                    ON actor.id =
                       n.actor_user_id

                WHERE
                    n.recipient_user_id =
                        $1

                    ${unreadCondition}

                ORDER BY
                    n.created_at DESC,
                    n.id DESC

                LIMIT $2
                `,
                values
            );

        // ======================================
        // UNREAD COUNT
        // ======================================

        const unreadResult =
            await db.query(
                `
                SELECT
                    COUNT(*)::int
                        AS unread_count

                FROM portal_notifications

                WHERE
                    recipient_user_id =
                        $1

                    AND
                    is_read =
                        FALSE
                `,
                [
                    user.id,
                ]
            );

        return Response.json({
            success: true,

            unreadCount:
                unreadResult.rows[0]
                    .unread_count,

            notifications:
                notificationResult.rows,
        });

    } catch (error) {
        console.error(
            "Load notifications error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load notifications.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// MARK ALL AS READ
// ==========================================

export async function PATCH(
    request: Request
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

        const body =
            await request.json();

        const action =
            String(
                body.action ||
                ""
            )
                .trim()
                .toUpperCase();

        if (
            action !==
            "MARK_ALL_READ"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid notification action.",
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
                    recipient_user_id =
                        $1

                    AND
                    is_read =
                        FALSE

                RETURNING id
                `,
                [
                    user.id,
                ]
            );

        return Response.json({
            success: true,

            message:
                "All notifications marked as read.",

            updatedCount:
                result.rowCount || 0,
        });

    } catch (error) {
        console.error(
            "Mark all notifications error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to update notifications.",
            },
            {
                status: 500,
            }
        );
    }
}