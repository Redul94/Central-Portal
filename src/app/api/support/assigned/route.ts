import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// CURRENT SUPPORT STAFF
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

                pu.official_email,

                pu.role,

                pu.account_status,

                s.id::int
                    AS support_staff_id,

                s.staff_title,

                s.can_receive_tickets,

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
// GET MY ASSIGNED TICKETS
// ==========================================

export async function GET(
    request: Request
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

        const url =
            new URL(
                request.url
            );

        const search =
            String(
                url.searchParams.get(
                    "search"
                ) || ""
            ).trim();

        const status =
            String(
                url.searchParams.get(
                    "status"
                ) || ""
            )
                .trim()
                .toUpperCase();

        const priority =
            String(
                url.searchParams.get(
                    "priority"
                ) || ""
            )
                .trim()
                .toUpperCase();

        const conditions:
            string[] = [
                "t.assigned_to = $1",
            ];

        const values:
            unknown[] = [
                staff.id,
            ];

        // ======================================
        // SEARCH
        //
        // Supports both:
        // Existing Inventory Employee
        // Manual / Unregistered Employee
        // ======================================

        if (search) {
            values.push(
                `%${search}%`
            );

            const parameter =
                `$${values.length}`;

            conditions.push(
                `
                (
                    COALESCE(
                        t.ticket_no,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        t.subject,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        t.problem_description,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.employee_id,
                        t.requester_employee_id,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.full_name,
                        t.requester_name,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.designation,
                        t.requester_designation,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.department,
                        t.requester_department,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.mobile_no,
                        t.requester_mobile,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.user_location,
                        t.requester_location,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        ia.asset_code,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        ia.serial_number,
                        ''
                    ) ILIKE ${parameter}
                )
                `
            );
        }

        // ======================================
        // STATUS
        // ======================================

        const allowedStatuses = [
            "ASSIGNED",
            "IN_PROGRESS",
            "WAITING_FOR_ADMIN",
            "WAITING_FOR_USER",
            "DONE",
            "CANCELLED",
        ];

        if (
            status &&
            allowedStatuses.includes(
                status
            )
        ) {
            values.push(
                status
            );

            conditions.push(
                `t.ticket_status = $${values.length}`
            );
        }

        // ======================================
        // PRIORITY
        // ======================================

        const allowedPriorities = [
            "LOW",
            "NORMAL",
            "MEDIUM",
            "HIGH",
            "CRITICAL",
        ];

        if (
            priority &&
            allowedPriorities.includes(
                priority
            )
        ) {
            values.push(
                priority
            );

            conditions.push(
                `t.priority = $${values.length}`
            );
        }

        const whereClause =
            `WHERE ${conditions.join(
                " AND "
            )}`;

        // ======================================
        // ASSIGNED TICKETS
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

                    ic.category_name,

                    creator.full_name
                        AS created_by_name,

                    assigner.full_name
                        AS assigned_by_name,

                    (
                        SELECT
                            COUNT(*)::int

                        FROM it_support_comments c

                        WHERE
                            c.ticket_id =
                                t.id
                    )
                        AS comment_count

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

                LEFT JOIN portal_users creator
                    ON creator.id =
                       t.created_by

                LEFT JOIN portal_users assigner
                    ON assigner.id =
                       t.assigned_by

                ${whereClause}

                ORDER BY
                    CASE
                        WHEN
                            t.ticket_status =
                            'WAITING_FOR_ADMIN'
                        THEN 1

                        WHEN
                            t.priority =
                            'CRITICAL'
                        THEN 2

                        WHEN
                            t.priority =
                            'HIGH'
                        THEN 3

                        WHEN
                            t.ticket_status =
                            'IN_PROGRESS'
                        THEN 4

                        WHEN
                            t.ticket_status =
                            'ASSIGNED'
                        THEN 5

                        WHEN
                            t.ticket_status =
                            'WAITING_FOR_USER'
                        THEN 6

                        WHEN
                            t.ticket_status =
                            'DONE'
                        THEN 7

                        ELSE 8
                    END,

                    t.updated_at DESC,

                    t.id DESC
                `,
                values
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
                        WHERE
                            ticket_status =
                            'ASSIGNED'
                    )::int
                        AS assigned,

                    COUNT(*) FILTER (
                        WHERE
                            ticket_status =
                            'IN_PROGRESS'
                    )::int
                        AS in_progress,

                    COUNT(*) FILTER (
                        WHERE
                            ticket_status =
                            'WAITING_FOR_ADMIN'
                    )::int
                        AS waiting_for_admin,

                    COUNT(*) FILTER (
                        WHERE
                            ticket_status =
                            'WAITING_FOR_USER'
                    )::int
                        AS waiting_for_user,

                    COUNT(*) FILTER (
                        WHERE
                            ticket_status =
                            'DONE'
                    )::int
                        AS done

                FROM it_support_tickets

                WHERE
                    assigned_to =
                        $1
                `,
                [
                    staff.id,
                ]
            );

        // ======================================
        // RESPONSE
        // ======================================

        return Response.json({
            success: true,

            staff: {
                id:
                    staff.id,

                supportStaffId:
                    staff.support_staff_id,

                employeeId:
                    staff.employee_id,

                fullName:
                    staff.full_name,

                designation:
                    staff.designation,

                department:
                    staff.department,

                staffTitle:
                    staff.staff_title,

                canReceiveTickets:
                    staff.can_receive_tickets,
            },

            tickets:
                ticketResult.rows,

            summary:
                summaryResult.rows[0],
        });

    } catch (error) {
        console.error(
            "Load assigned IT tickets error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load assigned IT support tickets.",
            },
            {
                status: 500,
            }
        );
    }
}