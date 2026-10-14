import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createNotificationSafe } from "@/lib/notifications";

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
                designation,
                department,
                official_email,
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
// INVENTORY USER
// ==========================================

async function getInventoryUser(
    portalUserId: number,
    employeeId:
        | string
        | null
) {
    let result =
        await db.query(
            `
            SELECT
                id::int AS id,

                portal_user_id::int
                    AS portal_user_id,

                employee_id,
                full_name,
                designation,
                department

            FROM inventory_users

            WHERE portal_user_id = $1

            LIMIT 1
            `,
            [
                portalUserId,
            ]
        );

    if (
        result.rowCount &&
        result.rowCount > 0
    ) {
        return result.rows[0];
    }

    if (
        employeeId &&
        employeeId.trim()
    ) {
        result =
            await db.query(
                `
                SELECT
                    id::int AS id,

                    portal_user_id::int
                        AS portal_user_id,

                    employee_id,
                    full_name,
                    designation,
                    department

                FROM inventory_users

                WHERE employee_id = $1

                LIMIT 1
                `,
                [
                    employeeId.trim(),
                ]
            );

        if (
            result.rowCount &&
            result.rowCount > 0
        ) {
            return result.rows[0];
        }
    }

    return null;
}

// ==========================================
// IP
// ==========================================

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

// ==========================================
// GET MY TICKET DETAIL
// ==========================================

export async function GET(
    request: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {
    try {
        const portalUser =
            await getCurrentUser();

        if (!portalUser) {
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

        const inventoryUser =
            await getInventoryUser(
                portalUser.id,
                portalUser.employee_id
            );

        if (!inventoryUser) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Inventory profile not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const params =
            await context.params;

        const ticketId =
            Number(
                params.id
            );

        if (
            !Number.isInteger(
                ticketId
            ) ||
            ticketId <= 0
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid ticket ID.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // TICKET
        // ======================================

        const ticketResult =
            await db.query(
                `
                SELECT
                    t.id::int AS id,

                    t.ticket_no,

                    t.subject,

                    t.issue_category,

                    t.problem_description,

                    t.priority,

                    t.ticket_status,

                    t.admin_note,

                    t.resolution_summary,

                    t.opened_at,

                    t.assigned_at,

                    t.work_started_at,

                    t.completed_at,

                    t.created_at,

                    t.updated_at,

                    ia.id::int
                        AS asset_id,

                    ia.asset_code,

                    ia.brand,

                    ia.model,

                    ia.serial_number,

                    ic.category_name,

                    assigned_user.id::int
                        AS assigned_to_id,

                    assigned_user.employee_id
                        AS assigned_to_employee_id,

                    assigned_user.full_name
                        AS assigned_to_name,

                    assigned_user.designation
                        AS assigned_to_designation,

                    staff.staff_title
                        AS assigned_to_staff_title

                FROM it_support_tickets t

                LEFT JOIN inventory_assets ia
                    ON ia.id =
                       t.asset_id

                LEFT JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                LEFT JOIN portal_users assigned_user
                    ON assigned_user.id =
                       t.assigned_to

                LEFT JOIN it_support_staff staff
                    ON staff.portal_user_id =
                       t.assigned_to

                WHERE
                    t.id = $1

                    AND
                    t.inventory_user_id =
                        $2

                LIMIT 1
                `,
                [
                    ticketId,
                    inventoryUser.id,
                ]
            );

        if (
            ticketResult.rowCount ===
            0
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Ticket not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ======================================
        // COMMENTS
        // ======================================

        const commentResult =
            await db.query(
                `
                SELECT
                    c.id::int AS id,

                    c.comment_text,

                    c.created_at,

                    pu.id::int
                        AS commented_by_id,

                    pu.employee_id,

                    pu.full_name
                        AS commented_by_name,

                    pu.designation
                        AS commented_by_designation,

                    pu.role
                        AS commented_by_role,

                    CASE
                        WHEN support_staff.id
                            IS NOT NULL
                            THEN TRUE

                        ELSE FALSE
                    END
                        AS is_it_support_staff

                FROM it_support_comments c

                INNER JOIN portal_users pu
                    ON pu.id =
                       c.commented_by

                LEFT JOIN it_support_staff support_staff
                    ON support_staff.portal_user_id =
                       pu.id

                WHERE
                    c.ticket_id =
                        $1

                ORDER BY
                    c.created_at ASC,
                    c.id ASC
                `,
                [
                    ticketId,
                ]
            );

        return Response.json({
            success: true,

            portalUser: {
                id:
                    portalUser.id,

                employeeId:
                    portalUser.employee_id,

                fullName:
                    portalUser.full_name,
            },

            ticket:
                ticketResult.rows[0],

            comments:
                commentResult.rows,
        });

    } catch (error) {
        console.error(
            "Load user ticket detail error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load support ticket details.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// USER REPLY / COMMENT
// ==========================================

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
        const portalUser =
            await getCurrentUser();

        if (!portalUser) {
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

        const inventoryUser =
            await getInventoryUser(
                portalUser.id,
                portalUser.employee_id
            );

        if (!inventoryUser) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Inventory profile not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const params =
            await context.params;

        const ticketId =
            Number(
                params.id
            );

        if (
            !Number.isInteger(
                ticketId
            ) ||
            ticketId <= 0
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid ticket ID.",
                },
                {
                    status: 400,
                }
            );
        }

        const body =
            await request.json();

        const comment =
            String(
                body.comment ||
                ""
            ).trim();

        if (!comment) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Reply/comment is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            comment.length >
            5000
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Reply cannot exceed 5000 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        await client.query(
            "BEGIN"
        );

        // ======================================
        // VERIFY USER OWNS TICKET
        // ======================================

        const ticketResult =
            await client.query(
                `
                SELECT
                    id::int AS id,

                    ticket_no,

                    subject,

                    ticket_status,

                    assigned_to::int
                        AS assigned_to

                FROM it_support_tickets

                WHERE
                    id = $1

                    AND
                    inventory_user_id =
                        $2

                FOR UPDATE
                `,
                [
                    ticketId,
                    inventoryUser.id,
                ]
            );

        if (
            ticketResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "Ticket not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const ticket =
            ticketResult.rows[0];

        // ======================================
        // CLOSED TICKET
        // ======================================

        if (
            ticket.ticket_status ===
            "DONE" ||
            ticket.ticket_status ===
            "CANCELLED"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "This ticket is already closed. New replies cannot be added.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // INSERT COMMENT
        // ======================================

        const commentResult =
            await client.query(
                `
                INSERT INTO it_support_comments (
                    ticket_id,
                    commented_by,
                    comment_text
                )

                VALUES (
                    $1,
                    $2,
                    $3
                )

                RETURNING
                    id::int AS id,

                    ticket_id::int
                        AS ticket_id,

                    comment_text,

                    created_at
                `,
                [
                    ticketId,
                    portalUser.id,
                    comment,
                ]
            );

        // ======================================
        // UPDATE TICKET ACTIVITY TIME
        //
        // Important:
        // WAITING_FOR_USER stays WAITING_FOR_USER.
        // IT Engineer must review the user's reply
        // and click "Resume Work".
        // ======================================

        await client.query(
            `
            UPDATE it_support_tickets

            SET
                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [
                ticketId,
            ]
        );

        await client.query(
            "COMMIT"
        );

        // ======================================
        // NOTIFY ASSIGNED IT ENGINEER
        // ======================================

        if (
            ticket.assigned_to
        ) {
            await createNotificationSafe({
                recipientUserId:
                    ticket.assigned_to,

                actorUserId:
                    portalUser.id,

                module:
                    "IT_SUPPORT",

                notificationType:
                    "IT_SUPPORT_USER_REPLY",

                title:
                    "Employee Replied to IT Support Ticket",

                message:
                    `${ticket.ticket_no} - ${portalUser.full_name}: ${comment}`,

                referenceType:
                    "IT_SUPPORT_TICKET",

                referenceId:
                    ticketId,

                linkUrl:
                    `/support/assigned?ticket=${ticketId}`,
            });
        }

        // ======================================
        // AUDIT
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    portalUser.id,

                action:
                    "USER_REPLY_IT_SUPPORT_TICKET",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_TICKET",

                recordId:
                    ticketId,

                description:
                    `User replied to IT support ticket "${ticket.ticket_no}".`,

                metadata: {
                    ticketNo:
                        ticket.ticket_no,

                    ticketSubject:
                        ticket.subject,

                    ticketStatus:
                        ticket.ticket_status,

                    assignedTo:
                        ticket.assigned_to,
                },

                ipAddress:
                    getIpAddress(
                        request
                    ),
            });

        } catch (
        auditError
        ) {
            console.error(
                "Support reply audit error:",
                auditError
            );
        }

        return Response.json(
            {
                success: true,

                message:
                    ticket.ticket_status ===
                        "WAITING_FOR_USER"
                        ? "Reply sent successfully. The assigned IT Engineer can now review your response."
                        : "Reply added successfully.",

                comment:
                    commentResult.rows[0],
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
            "User support reply error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to submit your reply.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}