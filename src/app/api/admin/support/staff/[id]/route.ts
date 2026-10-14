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
// UPDATE STAFF
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

        const staffId =
            Number(
                params.id
            );

        if (
            !Number.isInteger(
                staffId
            ) ||
            staffId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid Support Staff ID.",
                },
                {
                    status: 400,
                }
            );
        }

        const body =
            await request.json();

        const staffTitle =
            String(
                body.staffTitle ||
                ""
            ).trim();

        const canReceiveTickets =
            body.canReceiveTickets ===
            true;

        const isActive =
            body.isActive ===
            true;

        // ======================================
        // CURRENT RECORD
        // ======================================

        const currentResult =
            await db.query(
                `
                SELECT
                    s.id::int AS id,

                    s.portal_user_id::int
                        AS portal_user_id,

                    s.is_active,

                    pu.full_name,

                    pu.employee_id

                FROM it_support_staff s

                INNER JOIN portal_users pu
                    ON pu.id =
                       s.portal_user_id

                WHERE s.id = $1

                LIMIT 1
                `,
                [
                    staffId,
                ]
            );

        if (
            currentResult.rowCount ===
            0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "IT Support Staff record not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const current =
            currentResult.rows[0];

        // ======================================
        // ACTIVE TICKET SAFETY
        // ======================================

        if (
            current.is_active &&
            !isActive
        ) {
            const ticketResult =
                await db.query(
                    `
                    SELECT
                        COUNT(*)::int
                            AS active_ticket_count

                    FROM it_support_tickets

                    WHERE
                        assigned_to =
                            $1

                        AND
                        ticket_status NOT IN (
                            'DONE',
                            'CANCELLED'
                        )
                    `,
                    [
                        current.portal_user_id,
                    ]
                );

            const activeTicketCount =
                Number(
                    ticketResult.rows[0]
                        .active_ticket_count
                );

            if (
                activeTicketCount >
                0
            ) {
                return Response.json(
                    {
                        success: false,
                        message:
                            `This IT staff member still has ${activeTicketCount} active ticket(s). Reassign or complete them before deactivating.`,
                    },
                    {
                        status: 409,
                    }
                );
            }
        }

        // ======================================
        // UPDATE
        // ======================================

        const result =
            await db.query(
                `
                UPDATE it_support_staff

                SET
                    staff_title =
                        NULLIF(
                            $1,
                            ''
                        ),

                    can_receive_tickets =
                        $2,

                    is_active =
                        $3,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $4

                RETURNING
                    id::int AS id,
                    portal_user_id::int
                        AS portal_user_id,
                    staff_title,
                    can_receive_tickets,
                    is_active,
                    updated_at
                `,
                [
                    staffTitle,
                    canReceiveTickets,
                    isActive,
                    staffId,
                ]
            );

        const staff =
            result.rows[0];

        try {
            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    "UPDATE_IT_SUPPORT_STAFF",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_STAFF",

                recordId:
                    staffId,

                description:
                    `Updated IT Support Staff "${current.full_name}".`,

                metadata: {
                    portalUserId:
                        current.portal_user_id,

                    employeeId:
                        current.employee_id,

                    fullName:
                        current.full_name,

                    staffTitle:
                        staff.staff_title,

                    canReceiveTickets:
                        staff.can_receive_tickets,

                    isActive:
                        staff.is_active,
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
                "Support staff update audit error:",
                auditError
            );
        }

        return Response.json({
            success: true,

            message:
                "IT Support Staff updated successfully.",

            staff,
        });

    } catch (error) {
        console.error(
            "Update IT support staff error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to update IT Support Staff.",
            },
            {
                status: 500,
            }
        );
    }
}