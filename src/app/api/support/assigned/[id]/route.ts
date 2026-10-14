import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createNotificationSafe } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// CURRENT IT SUPPORT STAFF
// ==========================================

async function getCurrentSupportStaff() {
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
                pu.id::int AS id,
                pu.employee_id,
                pu.full_name,
                pu.designation,
                pu.department,
                pu.account_status,

                s.id::int
                    AS support_staff_id,

                s.staff_title,
                s.is_active

            FROM portal_users pu

            INNER JOIN it_support_staff s
                ON s.portal_user_id =
                   pu.id

            WHERE
                pu.id = $1

                AND
                pu.account_status =
                    'ACTIVE'

                AND
                s.is_active =
                    TRUE

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

    return result.rows[0];
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
// GET TICKET + COMMENTS
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
        const staff =
            await getCurrentSupportStaff();

        if (!staff) {
            return Response.json(
                {
                    success: false,

                    message:
                        "You are not registered as active IT Support Staff.",
                },
                {
                    status: 403,
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
                    t.id::int
                        AS id,

                    t.ticket_no,

                    t.inventory_user_id::int
                        AS inventory_user_id,

                    CASE
                        WHEN
                            t.inventory_user_id
                            IS NULL
                        THEN
                            'MANUAL'
                        ELSE
                            'EXISTING'
                    END
                        AS requester_mode,

                    t.requester_employee_id,

                    t.requester_name,

                    t.requester_designation,

                    t.requester_department,

                    t.requester_location,

                    t.requester_mobile,

                    t.subject,

                    t.issue_category,

                    t.problem_description,

                    t.priority,

                    t.ticket_status,

                    t.admin_note,

                    t.resolution_summary,

                    t.opened_at,

                    t.assigned_at,

                    t.tna_at,

                    t.work_started_at,

                    t.completed_at,

                    COALESCE(
                        iu.employee_id,
                        t.requester_employee_id
                    )
                        AS employee_id,

                    COALESCE(
                        iu.full_name,
                        t.requester_name
                    )
                        AS user_name,

                    COALESCE(
                        iu.designation,
                        t.requester_designation
                    )
                        AS user_designation,

                    COALESCE(
                        iu.department,
                        t.requester_department
                    )
                        AS department,

                    COALESCE(
                        iu.mobile_no,
                        t.requester_mobile
                    )
                        AS mobile_no,

                    COALESCE(
                        iu.user_location,
                        t.requester_location
                    )
                        AS user_location,

                    ia.id::int
                        AS asset_id,

                    ia.asset_code,

                    ia.brand,

                    ia.model,

                    ia.serial_number,

                    ia.processor,

                    ia.ram_version,

                    ia.storage_info,

                    ia.windows_version,

                    ia.office_version,

                    ia.ad_or_workgroup,

                    ia.email_365,

                    ia.endpoint_security,

                    ia.computer_maintenance_status,

                    ia.data_backup_status,

                    ic.category_name

                FROM it_support_tickets t

                LEFT JOIN inventory_users iu
                    ON iu.id =
                       t.inventory_user_id

                LEFT JOIN inventory_assets ia
                    ON ia.id =
                       t.asset_id

                LEFT JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                WHERE
                    t.id = $1

                    AND
                    t.assigned_to = $2

                LIMIT 1
                `,
                [
                    ticketId,
                    staff.id,
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
                        "Ticket not found or not assigned to you.",
                },
                {
                    status: 404,
                }
            );
        }

        // ======================================
        // COMMENTS
        //
        // IT Engineer can see full work history,
        // including final resolution.
        // ======================================

        const commentResult =
            await db.query(
                `
                SELECT
                    c.id::int
                        AS id,

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
                        AS commented_by_role

                FROM it_support_comments c

                INNER JOIN portal_users pu
                    ON pu.id =
                       c.commented_by

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

            ticket:
                ticketResult.rows[0],

            comments:
                commentResult.rows,
        });

    } catch (error) {
        console.error(
            "Load assigned ticket detail error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load ticket details.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// ADD COMMENT
// ==========================================

export async function POST(
    request: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {
    try {
        const staff =
            await getCurrentSupportStaff();

        if (!staff) {
            return Response.json(
                {
                    success: false,

                    message:
                        "You are not registered as active IT Support Staff.",
                },
                {
                    status: 403,
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
                        "Comment is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // VERIFY ASSIGNMENT
        // ======================================

        const ticketResult =
            await db.query(
                `
                SELECT
                    id::int AS id,

                    ticket_no,

                    ticket_status

                FROM it_support_tickets

                WHERE
                    id = $1

                    AND
                    assigned_to =
                        $2

                LIMIT 1
                `,
                [
                    ticketId,
                    staff.id,
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
                        "Ticket not found or not assigned to you.",
                },
                {
                    status: 404,
                }
            );
        }

        // ======================================
        // INSERT COMMENT
        // ======================================

        const result =
            await db.query(
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
                    staff.id,
                    comment,
                ]
            );

        await db.query(
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

        return Response.json(
            {
                success: true,

                message:
                    "Comment added successfully.",

                comment:
                    result.rows[0],
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Add support comment error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to add comment.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// UPDATE TICKET STATUS
// ==========================================

export async function PATCH(
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
        const staff =
            await getCurrentSupportStaff();

        if (!staff) {
            return Response.json(
                {
                    success: false,

                    message:
                        "You are not registered as active IT Support Staff.",
                },
                {
                    status: 403,
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

        const action =
            String(
                body.action ||
                ""
            )
                .trim()
                .toUpperCase();

        const note =
            String(
                body.note ||
                ""
            ).trim();

        const resolution =
            String(
                body.resolution ||
                ""
            ).trim();

        const allowedActions = [
            "START_WORK",
            "WAITING_FOR_ADMIN",
            "WAITING_FOR_USER",
            "RESUME_WORK",
            "DONE",
        ];

        if (
            !allowedActions.includes(
                action
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid ticket action.",
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
        // LOCK TICKET
        // ======================================

        const ticketResult =
            await client.query(
                `
                SELECT
                    t.id::int AS id,

                    t.ticket_no,

                    t.subject,

                    t.ticket_status,

                    t.inventory_user_id::int
                        AS inventory_user_id,

                    CASE
                        WHEN
                            t.inventory_user_id
                            IS NULL
                        THEN
                            TRUE
                        ELSE
                            FALSE
                    END
                        AS is_manual_requester,

                    t.requester_employee_id,

                    t.requester_name,

                    t.assigned_to::int
                        AS assigned_to,

                    t.asset_id::int
                        AS asset_id,

                    t.created_by::int
                        AS created_by,

                    iu.portal_user_id::int
                        AS employee_portal_user_id

                FROM it_support_tickets t

                LEFT JOIN inventory_users iu
                    ON iu.id =
                       t.inventory_user_id

                WHERE
                    t.id = $1

                    AND
                    t.assigned_to =
                        $2

                FOR UPDATE OF t
                `,
                [
                    ticketId,
                    staff.id,
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
                        "Ticket not found or not assigned to you.",
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
                        "This ticket is already closed.",
                },
                {
                    status: 409,
                }
            );
        }

        let newStatus =
            ticket.ticket_status;

        // ======================================
        // START WORK
        // ======================================

        if (
            action ===
            "START_WORK"
        ) {
            if (
                ticket.ticket_status !==
                "ASSIGNED"
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Only ASSIGNED tickets can be started.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            newStatus =
                "IN_PROGRESS";

            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_status =
                        'IN_PROGRESS',

                    work_started_at =
                        COALESCE(
                            work_started_at,
                            CURRENT_TIMESTAMP
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    ticketId,
                ]
            );
        }

        // ======================================
        // WAITING FOR ADMIN
        // ======================================

        if (
            action ===
            "WAITING_FOR_ADMIN"
        ) {
            if (
                ticket.ticket_status !==
                "IN_PROGRESS"
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Ticket must be IN PROGRESS first.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            if (!note) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Please explain what input or approval is required from Admin.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            newStatus =
                "WAITING_FOR_ADMIN";

            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_status =
                        'WAITING_FOR_ADMIN',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    ticketId,
                ]
            );
        }

        // ======================================
        // WAITING FOR USER
        // ======================================

        if (
            action ===
            "WAITING_FOR_USER"
        ) {
            if (
                ticket.ticket_status !==
                "IN_PROGRESS"
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Ticket must be IN PROGRESS first.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            // ==================================
            // MANUAL EMPLOYEE HAS NO PORTAL
            // ==================================

            if (
                ticket.is_manual_requester
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Waiting for User is not available for a manual/unregistered employee because the employee has no Portal account. Contact the employee directly or use Waiting for Admin if required.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            if (!note) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Please explain what information is required from the user.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            newStatus =
                "WAITING_FOR_USER";

            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_status =
                        'WAITING_FOR_USER',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    ticketId,
                ]
            );
        }

        // ======================================
        // RESUME WORK
        // ======================================

        if (
            action ===
            "RESUME_WORK"
        ) {
            if (
                ticket.ticket_status !==
                "WAITING_FOR_ADMIN" &&
                ticket.ticket_status !==
                "WAITING_FOR_USER"
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Only waiting tickets can be resumed.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            newStatus =
                "IN_PROGRESS";

            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_status =
                        'IN_PROGRESS',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    ticketId,
                ]
            );
        }

        // ======================================
        // DONE
        // ======================================

        if (
            action ===
            "DONE"
        ) {
            if (
                ticket.ticket_status !==
                "IN_PROGRESS"
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Ticket must be IN PROGRESS before it can be completed.",
                    },
                    {
                        status: 409,
                    }
                );
            }

            if (!resolution) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Resolution summary is required before completing the ticket.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            newStatus =
                "DONE";

            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_status =
                        'DONE',

                    resolution_summary =
                        $2,

                    completed_at =
                        CURRENT_TIMESTAMP,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    ticketId,
                    resolution,
                ]
            );

            // ==================================
            // CLEAR ASSET PENDING SUPPORT
            // ==================================

            if (
                ticket.asset_id
            ) {
                await client.query(
                    `
                    UPDATE inventory_assets

                    SET
                        pending_work_support =
                            NULL,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = $1
                    `,
                    [
                        ticket.asset_id,
                    ]
                );
            }
        }

        // ======================================
        // OPTIONAL ACTION NOTE
        // ======================================

        if (note) {
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
                `,
                [
                    ticketId,
                    staff.id,
                    note,
                ]
            );
        }

        // ======================================
        // RESOLUTION AS FINAL COMMENT
        // ======================================

        if (
            action ===
            "DONE" &&
            resolution
        ) {
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
                `,
                [
                    ticketId,
                    staff.id,
                    `Resolution: ${resolution}`,
                ]
            );
        }

        // ======================================
        // COMMIT
        // ======================================

        await client.query(
            "COMMIT"
        );

        // ======================================
        // NOTIFY EMPLOYEE
        // WAITING FOR USER
        // ======================================

        if (
            action ===
            "WAITING_FOR_USER" &&
            ticket.employee_portal_user_id
        ) {
            await createNotificationSafe({
                recipientUserId:
                    ticket.employee_portal_user_id,

                actorUserId:
                    staff.id,

                module:
                    "IT_SUPPORT",

                notificationType:
                    "IT_SUPPORT_WAITING_FOR_USER",

                title:
                    "IT Support Needs Your Response",

                message:
                    `${ticket.ticket_no} - ${note}`,

                referenceType:
                    "IT_SUPPORT_TICKET",

                referenceId:
                    ticketId,

                linkUrl:
                    `/support?ticket=${ticketId}`,
            });
        }

        // ======================================
        // NOTIFY ADMIN / SUPER ADMIN
        // WAITING FOR ADMIN
        // ======================================

        if (
            action ===
            "WAITING_FOR_ADMIN"
        ) {
            try {
                const adminResult =
                    await db.query(
                        `
                        SELECT
                            id::int AS id

                        FROM portal_users

                        WHERE
                            account_status =
                                'ACTIVE'

                            AND
                            role IN (
                                'ADMIN',
                                'SUPER_ADMIN'
                            )

                            AND
                            id <> $1
                        `,
                        [
                            staff.id,
                        ]
                    );

                await Promise.all(
                    adminResult.rows.map(
                        (
                            admin: {
                                id: number;
                            }
                        ) =>
                            createNotificationSafe({
                                recipientUserId:
                                    admin.id,

                                actorUserId:
                                    staff.id,

                                module:
                                    "IT_SUPPORT",

                                notificationType:
                                    "IT_SUPPORT_WAITING_FOR_ADMIN",

                                title:
                                    "Admin Response Required",

                                message:
                                    `${ticket.ticket_no} - ${staff.full_name}: ${note}`,

                                referenceType:
                                    "IT_SUPPORT_TICKET",

                                referenceId:
                                    ticketId,

                                linkUrl:
                                    `/admin/support?ticket=${ticketId}`,
                            })
                    )
                );

            } catch (
            notificationError
            ) {
                console.error(
                    "Waiting for Admin notification error:",
                    notificationError
                );
            }
        }

        // ======================================
        // NOTIFY EMPLOYEE
        // TICKET COMPLETED
        // ======================================

        if (
            action ===
            "DONE" &&
            ticket.employee_portal_user_id
        ) {
            await createNotificationSafe({
                recipientUserId:
                    ticket.employee_portal_user_id,

                actorUserId:
                    staff.id,

                module:
                    "IT_SUPPORT",

                notificationType:
                    "IT_SUPPORT_TICKET_COMPLETED",

                title:
                    "IT Support Ticket Completed",

                message:
                    `${ticket.ticket_no} has been completed by IT Support.`,

                referenceType:
                    "IT_SUPPORT_TICKET",

                referenceId:
                    ticketId,

                linkUrl:
                    `/support?ticket=${ticketId}`,
            });
        }

        // ======================================
        // AUDIT
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    staff.id,

                action:
                    `IT_SUPPORT_${action}`,

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_TICKET",

                recordId:
                    ticketId,

                description:
                    `Ticket "${ticket.ticket_no}" changed to "${newStatus}" by ${staff.full_name}.`,

                metadata: {
                    ticketNo:
                        ticket.ticket_no,

                    requesterMode:
                        ticket.is_manual_requester
                            ? "MANUAL"
                            : "EXISTING",

                    requesterEmployeeId:
                        ticket.requester_employee_id ||
                        null,

                    requesterName:
                        ticket.requester_name ||
                        null,

                    previousStatus:
                        ticket.ticket_status,

                    newStatus,

                    action,

                    note:
                        note ||
                        null,

                    resolution:
                        resolution ||
                        null,
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
                "IT ticket action audit error:",
                auditError
            );
        }

        // ======================================
        // RESPONSE
        // ======================================

        return Response.json({
            success: true,

            message:
                action ===
                    "DONE"
                    ? "Ticket completed successfully."
                    : `Ticket status updated to ${newStatus.replaceAll(
                        "_",
                        " "
                    )}.`,

            status:
                newStatus,
        });

    } catch (error) {
        try {
            await client.query(
                "ROLLBACK"
            );

        } catch {
            // Ignore
        }

        console.error(
            "IT support ticket action error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to update support ticket.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}