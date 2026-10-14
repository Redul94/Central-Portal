import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createNotificationSafe } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// GET CURRENT ADMIN
// ==========================================

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
                designation,
                department,
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

// ==========================================
// IP ADDRESS
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
// GET TICKET DETAIL
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

                    t.asset_id::int
                        AS asset_id,

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

                    t.created_at,

                    t.updated_at,

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
                        AS designation,

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

                    support_staff.staff_title
                        AS assigned_to_staff_title,

                    assigned_by_user.full_name
                        AS assigned_by_name

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

                LEFT JOIN portal_users assigned_user
                    ON assigned_user.id =
                       t.assigned_to

                LEFT JOIN it_support_staff support_staff
                    ON support_staff.portal_user_id =
                       t.assigned_to

                LEFT JOIN portal_users assigned_by_user
                    ON assigned_by_user.id =
                       t.assigned_by

                WHERE
                    t.id = $1

                LIMIT 1
                `,
                [
                    ticketId,
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
                        AS commented_by_role,

                    CASE
                        WHEN
                            support_staff.id
                            IS NOT NULL
                        THEN
                            TRUE
                        ELSE
                            FALSE
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

            admin: {
                id:
                    admin.id,

                employeeId:
                    admin.employee_id,

                fullName:
                    admin.full_name,
            },

            ticket:
                ticketResult.rows[0],

            comments:
                commentResult.rows,
        });

    } catch (error) {
        console.error(
            "Load admin support ticket detail error:",
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
// ADMIN REPLY
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
                        "Admin response is required.",
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
                        "Admin response cannot exceed 5000 characters.",
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
                    id::int
                        AS id,

                    ticket_no,

                    subject,

                    ticket_status,

                    assigned_to::int
                        AS assigned_to

                FROM it_support_tickets

                WHERE id = $1

                FOR UPDATE
                `,
                [
                    ticketId,
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
        // ADMIN RESPONSE ONLY WHEN WAITING
        // ======================================

        if (
            ticket.ticket_status !==
            "WAITING_FOR_ADMIN"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "Admin response can only be sent when the ticket is waiting for Admin.",
                },
                {
                    status: 409,
                }
            );
        }

        if (
            !ticket.assigned_to
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "This ticket does not have an assigned IT Engineer.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // COMMENT
        // ======================================

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
                admin.id,
                comment,
            ]
        );

        // ======================================
        // RESUME TICKET
        // ======================================

        await client.query(
            `
            UPDATE it_support_tickets

            SET
                admin_note =
                    $2,

                ticket_status =
                    'IN_PROGRESS',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [
                ticketId,
                comment,
            ]
        );

        await client.query(
            "COMMIT"
        );

        // ======================================
        // NOTIFY IT ENGINEER
        // ======================================

        await createNotificationSafe({
            recipientUserId:
                ticket.assigned_to,

            actorUserId:
                admin.id,

            module:
                "IT_SUPPORT",

            notificationType:
                "IT_SUPPORT_ADMIN_REPLY",

            title:
                "Admin Responded to IT Support Ticket",

            message:
                `${ticket.ticket_no} - ${admin.full_name}: ${comment}`,

            referenceType:
                "IT_SUPPORT_TICKET",

            referenceId:
                ticketId,

            linkUrl:
                `/support/assigned?ticket=${ticketId}`,
        });

        // ======================================
        // AUDIT
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    "ADMIN_REPLY_IT_SUPPORT_TICKET",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_TICKET",

                recordId:
                    ticketId,

                description:
                    `Admin responded to IT support ticket "${ticket.ticket_no}".`,

                metadata: {
                    ticketNo:
                        ticket.ticket_no,

                    subject:
                        ticket.subject,

                    assignedTo:
                        ticket.assigned_to,

                    previousStatus:
                        ticket.ticket_status,

                    newStatus:
                        "IN_PROGRESS",
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
                "Admin support reply audit error:",
                auditError
            );
        }

        return Response.json({
            success: true,

            message:
                "Admin response sent successfully.",

            status:
                "IN_PROGRESS",
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
            "Admin support reply error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to send Admin response.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}

// ==========================================
// ASSIGN / REASSIGN TICKET
// ==========================================

// export async function PATCH(
//     request: Request,
//     context: {
//         params: Promise<{
//             id: string;
//         }>;
//     }
// ) {
//     const client =
//         await db.connect();

//     try {
//         const admin =
//             await getAdmin();

//         if (!admin) {
//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Unauthorized.",
//                 },
//                 {
//                     status: 403,
//                 }
//             );
//         }

//         const params =
//             await context.params;

//         const ticketId =
//             Number(
//                 params.id
//             );

//         if (
//             !Number.isInteger(
//                 ticketId
//             ) ||
//             ticketId <= 0
//         ) {
//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Invalid ticket ID.",
//                 },
//                 {
//                     status: 400,
//                 }
//             );
//         }

//         const body =
//             await request.json();

//         const action =
//             String(
//                 body.action ||
//                 ""
//             )
//                 .trim()
//                 .toUpperCase();

//         const assignedTo =
//             Number(
//                 body.assignedTo
//             );

//         if (
//             action !==
//             "ASSIGN"
//         ) {
//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Invalid action.",
//                 },
//                 {
//                     status: 400,
//                 }
//             );
//         }

//         if (
//             !Number.isInteger(
//                 assignedTo
//             ) ||
//             assignedTo <= 0
//         ) {
//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Please select a valid IT Support Staff member.",
//                 },
//                 {
//                     status: 400,
//                 }
//             );
//         }

//         await client.query(
//             "BEGIN"
//         );

//         // ======================================
//         // LOCK TICKET
//         // ======================================

//         const ticketResult =
//             await client.query(
//                 `
//                 SELECT
//                     id::int
//                         AS id,

//                     ticket_no,

//                     subject,

//                     ticket_status,

//                     assigned_to::int
//                         AS assigned_to

//                 FROM it_support_tickets

//                 WHERE id = $1

//                 FOR UPDATE
//                 `,
//                 [
//                     ticketId,
//                 ]
//             );

//         if (
//             ticketResult.rowCount ===
//             0
//         ) {
//             await client.query(
//                 "ROLLBACK"
//             );

//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Ticket not found.",
//                 },
//                 {
//                     status: 404,
//                 }
//             );
//         }

//         const ticket =
//             ticketResult.rows[0];

//         // ======================================
//         // CLOSED TICKET
//         // ======================================

//         if (
//             ticket.ticket_status ===
//                 "DONE" ||
//             ticket.ticket_status ===
//                 "CANCELLED"
//         ) {
//             await client.query(
//                 "ROLLBACK"
//             );

//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Closed tickets cannot be assigned or reassigned.",
//                 },
//                 {
//                     status: 409,
//                 }
//             );
//         }

//         // ======================================
//         // VERIFY SUPPORT STAFF
//         // ======================================

//         const staffResult =
//             await client.query(
//                 `
//                 SELECT
//                     s.id::int
//                         AS support_staff_id,

//                     s.portal_user_id::int
//                         AS portal_user_id,

//                     s.staff_title,

//                     s.can_receive_tickets,

//                     s.is_active,

//                     pu.employee_id,

//                     pu.full_name,

//                     pu.designation,

//                     pu.department,

//                     pu.account_status

//                 FROM it_support_staff s

//                 INNER JOIN portal_users pu
//                     ON pu.id =
//                        s.portal_user_id

//                 WHERE
//                     s.portal_user_id =
//                         $1

//                     AND
//                     s.is_active =
//                         TRUE

//                     AND
//                     s.can_receive_tickets =
//                         TRUE

//                     AND
//                     pu.account_status =
//                         'ACTIVE'

//                 LIMIT 1
//                 `,
//                 [
//                     assignedTo,
//                 ]
//             );

//         if (
//             staffResult.rowCount ===
//             0
//         ) {
//             await client.query(
//                 "ROLLBACK"
//             );

//             return Response.json(
//                 {
//                     success: false,

//                     message:
//                         "Selected IT Support Staff member is not active or cannot receive tickets.",
//                 },
//                 {
//                     status: 400,
//                 }
//             );
//         }

//         const supportStaff =
//             staffResult.rows[0];

//         const previousAssignedTo =
//             ticket.assigned_to;

//         const wasPreviouslyAssigned =
//             Boolean(
//                 previousAssignedTo
//             );

//         // ======================================
//         // ASSIGN
//         // ======================================

//         await client.query(
//             `
//             UPDATE it_support_tickets

//             SET
//                 assigned_to =
//                     $2,

//                 assigned_by =
//                     $3,

//                 assigned_at =
//                     CURRENT_TIMESTAMP,

//                 ticket_status =
//                     'ASSIGNED',

//                 updated_at =
//                     CURRENT_TIMESTAMP

//             WHERE id = $1
//             `,
//             [
//                 ticketId,
//                 supportStaff.portal_user_id,
//                 admin.id,
//             ]
//         );

//         await client.query(
//             "COMMIT"
//         );

//         // ======================================
//         // NOTIFY ENGINEER
//         // ======================================

//         await createNotificationSafe({
//             recipientUserId:
//                 supportStaff.portal_user_id,

//             actorUserId:
//                 admin.id,

//             module:
//                 "IT_SUPPORT",

//             notificationType:
//                 wasPreviouslyAssigned
//                     ? "IT_SUPPORT_TICKET_REASSIGNED"
//                     : "IT_SUPPORT_TICKET_ASSIGNED",

//             title:
//                 wasPreviouslyAssigned
//                     ? "IT Support Ticket Reassigned"
//                     : "New IT Support Ticket Assigned",

//             message:
//                 `${ticket.ticket_no} - ${ticket.subject}`,

//             referenceType:
//                 "IT_SUPPORT_TICKET",

//             referenceId:
//                 ticketId,

//             linkUrl:
//                 `/support/assigned?ticket=${ticketId}`,
//         });

//         // ======================================
//         // AUDIT
//         // ======================================

//         try {
//             await writeAuditLog({
//                 userId:
//                     admin.id,

//                 action:
//                     wasPreviouslyAssigned
//                         ? "REASSIGN_IT_SUPPORT_TICKET"
//                         : "ASSIGN_IT_SUPPORT_TICKET",

//                 module:
//                     "IT_SUPPORT",

//                 recordType:
//                     "IT_SUPPORT_TICKET",

//                 recordId:
//                     ticketId,

//                 description:
//                     wasPreviouslyAssigned
//                         ? `IT support ticket "${ticket.ticket_no}" reassigned to ${supportStaff.full_name}.`
//                         : `IT support ticket "${ticket.ticket_no}" assigned to ${supportStaff.full_name}.`,

//                 metadata: {
//                     ticketNo:
//                         ticket.ticket_no,

//                     subject:
//                         ticket.subject,

//                     previousAssignedTo,

//                     assignedTo:
//                         supportStaff.portal_user_id,

//                     assignedToName:
//                         supportStaff.full_name,

//                     previousStatus:
//                         ticket.ticket_status,

//                     newStatus:
//                         "ASSIGNED",
//                 },

//                 ipAddress:
//                     getIpAddress(
//                         request
//                     ),
//             });

//         } catch (
//             auditError
//         ) {
//             console.error(
//                 "Assign IT support ticket audit error:",
//                 auditError
//             );
//         }

//         return Response.json({
//             success: true,

//             message:
//                 wasPreviouslyAssigned
//                     ? `Ticket reassigned to ${supportStaff.full_name} successfully.`
//                     : `Ticket assigned to ${supportStaff.full_name} successfully.`,

//             ticketId,

//             assignedTo:
//                 supportStaff.portal_user_id,

//             assignedToName:
//                 supportStaff.full_name,

//             status:
//                 "ASSIGNED",
//         });

//     } catch (error) {
//         try {
//             await client.query(
//                 "ROLLBACK"
//             );

//         } catch {
//             // Ignore rollback error
//         }

//         console.error(
//             "Assign IT support ticket error:",
//             error
//         );

//         return Response.json(
//             {
//                 success: false,

//                 message:
//                     "Unable to assign IT support ticket.",
//             },
//             {
//                 status: 500,
//             }
//         );

//     } finally {
//         client.release();
//     }
// }

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

        const assignedTo =
            Number(
                body.assignedTo
            );

        const tnaAt =
            String(
                body.tnaAt ||
                ""
            ).trim();

        // ======================================
        // ACTION
        // ======================================

        if (
            action !==
            "ASSIGN"
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

        // ======================================
        // ENGINEER
        // ======================================

        if (
            !Number.isInteger(
                assignedTo
            ) ||
            assignedTo <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please select a valid IT Support Staff member.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // TNA
        // Expected from datetime-local:
        // 2026-10-10T15:30
        // ======================================

        if (!tnaAt) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please enter TNA date and time.",
                },
                {
                    status: 400,
                }
            );
        }

        const tnaPattern =
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

        if (
            !tnaPattern.test(
                tnaAt
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid TNA date and time.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // BEGIN
        // ======================================

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
                    id::int
                        AS id,

                    ticket_no,

                    subject,

                    ticket_status,

                    assigned_to::int
                        AS assigned_to,

                    tna_at

                FROM it_support_tickets

                WHERE id = $1

                FOR UPDATE
                `,
                [
                    ticketId,
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
                        "Closed tickets cannot be assigned or reassigned.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // VERIFY SUPPORT STAFF
        // ======================================

        const staffResult =
            await client.query(
                `
                SELECT
                    s.id::int
                        AS support_staff_id,

                    s.portal_user_id::int
                        AS portal_user_id,

                    s.staff_title,

                    s.can_receive_tickets,

                    s.is_active,

                    pu.employee_id,

                    pu.full_name,

                    pu.designation,

                    pu.department,

                    pu.account_status

                FROM it_support_staff s

                INNER JOIN portal_users pu
                    ON pu.id =
                       s.portal_user_id

                WHERE
                    s.portal_user_id =
                        $1

                    AND
                    s.is_active =
                        TRUE

                    AND
                    s.can_receive_tickets =
                        TRUE

                    AND
                    pu.account_status =
                        'ACTIVE'

                LIMIT 1
                `,
                [
                    assignedTo,
                ]
            );

        if (
            staffResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Selected IT Support Staff member is not active or cannot receive tickets.",
                },
                {
                    status: 400,
                }
            );
        }

        const supportStaff =
            staffResult.rows[0];

        const previousAssignedTo =
            ticket.assigned_to;

        const previousTnaAt =
            ticket.tna_at;

        const wasPreviouslyAssigned =
            Boolean(
                previousAssignedTo
            );

        // ======================================
        // ASSIGN + TNA
        // ======================================

        await client.query(
            `
            UPDATE it_support_tickets

            SET
                assigned_to =
                    $2,

                assigned_by =
                    $3,

                assigned_at =
                    CURRENT_TIMESTAMP,

                tna_at =
                    $4::timestamp,

                ticket_status =
                    'ASSIGNED',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [
                ticketId,
                supportStaff.portal_user_id,
                admin.id,
                tnaAt,
            ]
        );

        await client.query(
            "COMMIT"
        );

        // ======================================
        // ENGINEER NOTIFICATION
        // ======================================

        await createNotificationSafe({
            recipientUserId:
                supportStaff.portal_user_id,

            actorUserId:
                admin.id,

            module:
                "IT_SUPPORT",

            notificationType:
                wasPreviouslyAssigned
                    ? "IT_SUPPORT_TICKET_REASSIGNED"
                    : "IT_SUPPORT_TICKET_ASSIGNED",

            title:
                wasPreviouslyAssigned
                    ? "IT Support Ticket Reassigned"
                    : "New IT Support Ticket Assigned",

            message:
                `${ticket.ticket_no} - ${ticket.subject} | TNA: ${tnaAt.replace(
                    "T",
                    " "
                )}`,

            referenceType:
                "IT_SUPPORT_TICKET",

            referenceId:
                ticketId,

            linkUrl:
                `/support/assigned?ticket=${ticketId}`,
        });

        // ======================================
        // AUDIT
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    wasPreviouslyAssigned
                        ? "REASSIGN_IT_SUPPORT_TICKET"
                        : "ASSIGN_IT_SUPPORT_TICKET",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_TICKET",

                recordId:
                    ticketId,

                description:
                    wasPreviouslyAssigned
                        ? `IT support ticket "${ticket.ticket_no}" reassigned to ${supportStaff.full_name}.`
                        : `IT support ticket "${ticket.ticket_no}" assigned to ${supportStaff.full_name}.`,

                metadata: {
                    ticketNo:
                        ticket.ticket_no,

                    subject:
                        ticket.subject,

                    previousAssignedTo,

                    assignedTo:
                        supportStaff.portal_user_id,

                    assignedToName:
                        supportStaff.full_name,

                    previousTnaAt,

                    tnaAt,

                    previousStatus:
                        ticket.ticket_status,

                    newStatus:
                        "ASSIGNED",
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
                "Assign IT support ticket audit error:",
                auditError
            );
        }

        return Response.json({
            success: true,

            message:
                wasPreviouslyAssigned
                    ? `Ticket reassigned to ${supportStaff.full_name} successfully.`
                    : `Ticket assigned to ${supportStaff.full_name} successfully.`,

            ticketId,

            assignedTo:
                supportStaff.portal_user_id,

            assignedToName:
                supportStaff.full_name,

            tnaAt,

            status:
                "ASSIGNED",
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
            "Assign IT support ticket error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to assign IT support ticket.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}