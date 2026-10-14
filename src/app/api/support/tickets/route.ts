import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createNotificationSafe } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITIES = [
    "LOW",
    "NORMAL",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const;

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
// FIND INVENTORY USER
// ==========================================

async function findInventoryUser(
    portalUserId: number,
    employeeId:
        | string
        | null
) {
    const linkedResult =
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
        linkedResult.rowCount &&
        linkedResult.rowCount > 0
    ) {
        return linkedResult.rows[0];
    }

    if (
        employeeId &&
        employeeId.trim()
    ) {
        const employeeResult =
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
            employeeResult.rowCount &&
            employeeResult.rowCount > 0
        ) {
            return employeeResult.rows[0];
        }
    }

    return null;
}

// ==========================================
// GET MY SUPPORT TICKETS
// ==========================================

export async function GET() {
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
            await findInventoryUser(
                portalUser.id,
                portalUser.employee_id
            );

        if (!inventoryUser) {
            return Response.json({
                success: true,

                linked: false,

                portalUser,

                inventoryUser:
                    null,

                assets: [],

                tickets: [],

                summary: {
                    total: 0,
                    open: 0,
                    inProgress: 0,
                    waiting: 0,
                    done: 0,
                },
            });
        }

        // ======================================
        // CURRENT ASSETS
        // ======================================

        const assetResult =
            await db.query(
                `
                SELECT
                    ia.id::int AS id,
                    ia.asset_code,
                    ia.brand,
                    ia.model,
                    ia.serial_number,
                    ic.category_name,
                    ass.is_primary_computer

                FROM inventory_assignments ass

                INNER JOIN inventory_assets ia
                    ON ia.id =
                       ass.asset_id

                INNER JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                WHERE
                    ass.inventory_user_id =
                        $1

                    AND
                    ass.assignment_status =
                        'ACTIVE'

                ORDER BY
                    ass.is_primary_computer DESC,
                    ic.display_order ASC,
                    ia.asset_code ASC
                `,
                [
                    inventoryUser.id,
                ]
            );

        // ======================================
        // MY TICKETS
        // ======================================

        const ticketResult =
            await db.query(
                `
                SELECT
                    t.id::int AS id,

                    t.ticket_no,

                    t.inventory_user_id::int
                        AS inventory_user_id,

                    t.asset_id::int
                        AS asset_id,

                    t.subject,

                    t.issue_category,

                    t.problem_description,

                    t.priority,

                    t.ticket_status,

                    t.resolution_summary,

                    t.opened_at,

                    t.assigned_at,

                    t.work_started_at,

                    t.completed_at,

                    t.created_at,

                    t.updated_at,

                    ia.asset_code,

                    ia.brand,

                    ia.model,

                    ic.category_name,

                    assigned_user.full_name
                        AS assigned_to_name,

                    assigned_user.employee_id
                        AS assigned_to_employee_id

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

                WHERE
                    t.inventory_user_id =
                        $1

                ORDER BY
                    t.created_at DESC,
                    t.id DESC
                `,
                [
                    inventoryUser.id,
                ]
            );

        // ======================================
        // SUMMARY
        // ======================================

        const summaryResult =
            await db.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total,

                    COUNT(*) FILTER (
                        WHERE ticket_status =
                            'OPEN'
                    )::int
                        AS open,

                    COUNT(*) FILTER (
                        WHERE ticket_status IN (
                            'ASSIGNED',
                            'IN_PROGRESS'
                        )
                    )::int
                        AS in_progress,

                    COUNT(*) FILTER (
                        WHERE ticket_status IN (
                            'WAITING_FOR_ADMIN',
                            'WAITING_FOR_USER'
                        )
                    )::int
                        AS waiting,

                    COUNT(*) FILTER (
                        WHERE ticket_status =
                            'DONE'
                    )::int
                        AS done

                FROM it_support_tickets

                WHERE
                    inventory_user_id =
                        $1
                `,
                [
                    inventoryUser.id,
                ]
            );

        return Response.json({
            success: true,

            linked: true,

            portalUser,

            inventoryUser,

            assets:
                assetResult.rows,

            tickets:
                ticketResult.rows,

            summary:
                summaryResult.rows[0],
        });

    } catch (error) {
        console.error(
            "Load support tickets error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load IT support tickets.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// CREATE SUPPORT TICKET
// ==========================================

export async function POST(
    request: Request
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

        const body =
            await request.json();

        const subject =
            String(
                body.subject ||
                ""
            ).trim();

        const issueCategory =
            String(
                body.issueCategory ||
                ""
            ).trim();

        const problemDescription =
            String(
                body.problemDescription ||
                ""
            ).trim();

        const priority =
            String(
                body.priority ||
                "NORMAL"
            )
                .trim()
                .toUpperCase();

        const rawAssetId =
            body.assetId;

        const assetId =
            rawAssetId ===
                null ||
            rawAssetId ===
                undefined ||
            rawAssetId ===
                ""
                ? null
                : Number(
                    rawAssetId
                );

        // ======================================
        // VALIDATION
        // ======================================

        if (!subject) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Ticket subject is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            subject.length >
            250
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Subject cannot exceed 250 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!problemDescription) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Problem description is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !PRIORITIES.includes(
                priority as typeof PRIORITIES[number]
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid priority.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            assetId !== null &&
            (
                !Number.isInteger(
                    assetId
                ) ||
                assetId <= 0
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid asset.",
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
        // FIND INVENTORY USER
        // ======================================

        let inventoryUserResult =
            await client.query(
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
                    portalUser.id,
                ]
            );

        // ======================================
        // FALLBACK BY EMPLOYEE ID
        // ======================================

        if (
            inventoryUserResult.rowCount ===
                0 &&
            portalUser.employee_id
        ) {
            inventoryUserResult =
                await client.query(
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
                        portalUser.employee_id,
                    ]
                );

            if (
                inventoryUserResult.rowCount &&
                inventoryUserResult.rowCount > 0
            ) {
                await client.query(
                    `
                    UPDATE inventory_users

                    SET
                        portal_user_id = $1,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = $2
                    `,
                    [
                        portalUser.id,
                        inventoryUserResult.rows[0].id,
                    ]
                );
            }
        }

        // ======================================
        // AUTO CREATE INVENTORY PROFILE
        // ======================================

        if (
            inventoryUserResult.rowCount ===
            0
        ) {
            inventoryUserResult =
                await client.query(
                    `
                    INSERT INTO inventory_users (
                        portal_user_id,
                        employee_id,
                        full_name,
                        designation,
                        department,
                        created_by
                    )

                    VALUES (
                        $1,

                        NULLIF(
                            $2,
                            ''
                        ),

                        $3,

                        NULLIF(
                            $4,
                            ''
                        ),

                        NULLIF(
                            $5,
                            ''
                        ),

                        $1
                    )

                    RETURNING
                        id::int AS id,

                        portal_user_id::int
                            AS portal_user_id,

                        employee_id,
                        full_name,
                        designation,
                        department
                    `,
                    [
                        portalUser.id,

                        portalUser.employee_id ||
                        "",

                        portalUser.full_name,

                        portalUser.designation ||
                        "",

                        portalUser.department ||
                        "",
                    ]
                );
        }

        const inventoryUser =
            inventoryUserResult.rows[0];

        // ======================================
        // VERIFY ASSET BELONGS TO USER
        // ======================================

        if (
            assetId !== null
        ) {
            const assetResult =
                await client.query(
                    `
                    SELECT
                        ia.id::int AS id,
                        ia.asset_code

                    FROM inventory_assignments ass

                    INNER JOIN inventory_assets ia
                        ON ia.id =
                           ass.asset_id

                    WHERE
                        ass.inventory_user_id =
                            $1

                        AND
                        ass.asset_id =
                            $2

                        AND
                        ass.assignment_status =
                            'ACTIVE'

                    LIMIT 1
                    `,
                    [
                        inventoryUser.id,
                        assetId,
                    ]
                );

            if (
                assetResult.rowCount ===
                0
            ) {
                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Selected asset is not currently assigned to you.",
                    },
                    {
                        status: 403,
                    }
                );
            }
        }

        // ======================================
        // CREATE TICKET
        // ======================================

        const ticketResult =
            await client.query(
                `
                INSERT INTO it_support_tickets (
                    inventory_user_id,
                    asset_id,
                    subject,
                    issue_category,
                    problem_description,
                    priority,
                    ticket_status,
                    created_by
                )

                VALUES (
                    $1,
                    $2,
                    $3,

                    NULLIF(
                        $4,
                        ''
                    ),

                    $5,
                    $6,
                    'OPEN',
                    $7
                )

                RETURNING
                    id::int AS id,
                    opened_at
                `,
                [
                    inventoryUser.id,
                    assetId,
                    subject,
                    issueCategory,
                    problemDescription,
                    priority,
                    portalUser.id,
                ]
            );

        const ticket =
            ticketResult.rows[0];

        // ======================================
        // GENERATE TICKET NUMBER
        // ======================================

        const ticketNoResult =
            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_no =
                        'IT-'
                        ||
                        EXTRACT(
                            YEAR FROM (
                                opened_at
                                AT TIME ZONE
                                'Asia/Dhaka'
                            )
                        )::int
                        ||
                        '-'
                        ||
                        LPAD(
                            id::text,
                            6,
                            '0'
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1

                RETURNING
                    id::int AS id,

                    ticket_no,

                    inventory_user_id::int
                        AS inventory_user_id,

                    asset_id::int
                        AS asset_id,

                    subject,

                    issue_category,

                    problem_description,

                    priority,

                    ticket_status,

                    opened_at,

                    created_at
                `,
                [
                    ticket.id,
                ]
            );

        const createdTicket =
            ticketNoResult.rows[0];

        await client.query(
            "COMMIT"
        );

        // ======================================
        // NOTIFY ACTIVE ADMINS
        // ======================================

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
                    `
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
                                portalUser.id,

                            module:
                                "IT_SUPPORT",

                            notificationType:
                                "NEW_IT_SUPPORT_TICKET",

                            title:
                                "New IT Support Ticket",

                            message:
                                `${createdTicket.ticket_no} - ${portalUser.full_name}: ${createdTicket.subject} [${createdTicket.priority}]`,

                            referenceType:
                                "IT_SUPPORT_TICKET",

                            referenceId:
                                createdTicket.id,

                            linkUrl:
                                `/admin/support?ticket=${createdTicket.id}`,
                        })
                )
            );

        } catch (
            notificationError
        ) {
            console.error(
                "New ticket notification error:",
                notificationError
            );
        }

        // ======================================
        // AUDIT
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    portalUser.id,

                action:
                    "CREATE_IT_SUPPORT_TICKET",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_TICKET",

                recordId:
                    createdTicket.id,

                description:
                    `Created IT support ticket "${createdTicket.ticket_no}".`,

                metadata: {
                    ticketNo:
                        createdTicket.ticket_no,

                    inventoryUserId:
                        inventoryUser.id,

                    assetId:
                        createdTicket.asset_id,

                    subject:
                        createdTicket.subject,

                    issueCategory:
                        createdTicket.issue_category,

                    priority:
                        createdTicket.priority,
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
                "Ticket audit error:",
                auditError
            );
        }

        return Response.json(
            {
                success: true,

                message:
                    "IT support ticket submitted successfully.",

                ticket:
                    createdTicket,
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
            // Ignore
        }

        console.error(
            "Create support ticket error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to submit IT support ticket.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}