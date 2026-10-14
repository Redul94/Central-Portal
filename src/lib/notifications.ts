import { db } from "@/lib/db";

// ==========================================
// TYPES
// ==========================================

type CreateNotificationInput = {
    recipientUserId: number;

    actorUserId?: number | null;

    module: string;

    notificationType: string;

    title: string;

    message?: string | null;

    referenceType?: string | null;

    referenceId?: number | null;

    linkUrl?: string | null;
};

// ==========================================
// CREATE NOTIFICATION
// ==========================================

export async function createNotification(
    input: CreateNotificationInput
) {
    const result =
        await db.query(
            `
            INSERT INTO portal_notifications (
                recipient_user_id,
                actor_user_id,
                module,
                notification_type,
                title,
                message,
                reference_type,
                reference_id,
                link_url
            )

            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                NULLIF($6, ''),
                NULLIF($7, ''),
                $8,
                NULLIF($9, '')
            )

            RETURNING
                id::int AS id,
                recipient_user_id::int
                    AS recipient_user_id,
                actor_user_id::int
                    AS actor_user_id,
                module,
                notification_type,
                title,
                message,
                reference_type,
                reference_id::int
                    AS reference_id,
                link_url,
                is_read,
                read_at,
                created_at
            `,
            [
                input.recipientUserId,
                input.actorUserId ?? null,
                input.module,
                input.notificationType,
                input.title,
                input.message ?? "",
                input.referenceType ?? "",
                input.referenceId ?? null,
                input.linkUrl ?? "",
            ]
        );

    return result.rows[0];
}

// ==========================================
// SAFE NOTIFICATION
//
// Use this inside important business APIs.
// Notification failure should not normally
// rollback the main ticket operation.
// ==========================================

export async function createNotificationSafe(
    input: CreateNotificationInput
) {
    try {
        return await createNotification(
            input
        );
    } catch (error) {
        console.error(
            "Create notification error:",
            error
        );

        return null;
    }
}