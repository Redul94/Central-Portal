import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// GET ADMIN
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
        admin.account_status !== "ACTIVE" ||
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
// GET SUPPORT STAFF
// ==========================================

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

        const [
            staffResult,
            portalUserResult,
        ] =
            await Promise.all([
                db.query(
                    `
                    SELECT
                        s.id::int AS id,

                        s.portal_user_id::int
                            AS portal_user_id,

                        s.staff_title,

                        s.can_receive_tickets,

                        s.is_active,

                        s.created_at,

                        s.updated_at,

                        pu.employee_id,

                        pu.full_name,

                        pu.designation,

                        pu.department,

                        pu.official_email,

                        pu.role,

                        pu.account_status,

                        COUNT(
                            t.id
                        ) FILTER (
                            WHERE
                                t.ticket_status NOT IN (
                                    'DONE',
                                    'CANCELLED'
                                )
                        )::int
                            AS active_ticket_count

                    FROM it_support_staff s

                    INNER JOIN portal_users pu
                        ON pu.id =
                           s.portal_user_id

                    LEFT JOIN it_support_tickets t
                        ON t.assigned_to =
                           s.portal_user_id

                    GROUP BY
                        s.id,
                        pu.id

                    ORDER BY
                        s.is_active DESC,
                        pu.full_name ASC
                    `
                ),

                db.query(
                    `
                    SELECT
                        pu.id::int AS id,

                        pu.employee_id,

                        pu.full_name,

                        pu.designation,

                        pu.department,

                        pu.official_email,

                        pu.role

                    FROM portal_users pu

                    LEFT JOIN it_support_staff s
                        ON s.portal_user_id =
                           pu.id

                    WHERE
                        pu.account_status =
                            'ACTIVE'

                        AND
                        s.id IS NULL

                    ORDER BY
                        pu.full_name ASC
                    `
                ),
            ]);

        return Response.json({
            success: true,

            staff:
                staffResult.rows,

            availablePortalUsers:
                portalUserResult.rows,
        });

    } catch (error) {
        console.error(
            "Load IT support staff error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load IT Support Staff.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// ADD SUPPORT STAFF
// ==========================================

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

        const portalUserId =
            Number(
                body.portalUserId
            );

        const staffTitle =
            String(
                body.staffTitle ||
                ""
            ).trim();

        const canReceiveTickets =
            body.canReceiveTickets !==
            false;

        if (
            !Number.isInteger(
                portalUserId
            ) ||
            portalUserId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please select a valid portal user.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // VERIFY PORTAL USER
        // ======================================

        const userResult =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    employee_id,
                    full_name,
                    designation,
                    department,
                    account_status

                FROM portal_users

                WHERE id = $1

                LIMIT 1
                `,
                [
                    portalUserId,
                ]
            );

        if (
            userResult.rowCount === 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Portal user not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const portalUser =
            userResult.rows[0];

        if (
            portalUser.account_status !==
            "ACTIVE"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Only ACTIVE portal users can be added as IT Support Staff.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // CREATE
        // ======================================

        const result =
            await db.query(
                `
                INSERT INTO it_support_staff (
                    portal_user_id,
                    staff_title,
                    can_receive_tickets,
                    is_active,
                    created_by
                )

                VALUES (
                    $1,
                    NULLIF(
                        $2,
                        ''
                    ),
                    $3,
                    TRUE,
                    $4
                )

                RETURNING
                    id::int AS id,
                    portal_user_id::int
                        AS portal_user_id,
                    staff_title,
                    can_receive_tickets,
                    is_active,
                    created_at
                `,
                [
                    portalUserId,
                    staffTitle,
                    canReceiveTickets,
                    admin.id,
                ]
            );

        const staff =
            result.rows[0];

        // ======================================
        // AUDIT
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    "ADD_IT_SUPPORT_STAFF",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_STAFF",

                recordId:
                    staff.id,

                description:
                    `Added "${portalUser.full_name}" as IT Support Staff.`,

                metadata: {
                    portalUserId,

                    employeeId:
                        portalUser.employee_id,

                    fullName:
                        portalUser.full_name,

                    staffTitle:
                        staff.staff_title,

                    canReceiveTickets:
                        staff.can_receive_tickets,
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
                "Support staff audit error:",
                auditError
            );
        }

        return Response.json(
            {
                success: true,

                message:
                    `${portalUser.full_name} added as IT Support Staff.`,

                staff,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Add IT support staff error:",
            error
        );

        const databaseError =
            error as {
                code?: string;
            };

        if (
            databaseError.code ===
            "23505"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "This portal user is already registered as IT Support Staff.",
                },
                {
                    status: 409,
                }
            );
        }

        return Response.json(
            {
                success: false,
                message:
                    "Unable to add IT Support Staff.",
            },
            {
                status: 500,
            }
        );
    }
}