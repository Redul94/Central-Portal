import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

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
// GET ALL SUPPORT TICKETS
// ==========================================

export async function GET(
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
            string[] = [];

        const values:
            unknown[] = [];

        // ======================================
        // SEARCH
        //
        // Supports:
        // - Inventory Employee
        // - Manual / Unregistered Employee
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
                        iu.user_location,
                        t.requester_location,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.mobile_no,
                        t.requester_mobile,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        ia.asset_code,
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
            "OPEN",
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
            conditions.length > 0
                ? `WHERE ${conditions.join(
                    " AND "
                )}`
                : "";

        // ======================================
        // TICKETS
        // ======================================

        const ticketResult =
            await db.query(
                `
                SELECT
                    t.id::int AS id,

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
                        AS assigned_to_designation

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

                ${whereClause}

                ORDER BY
                    CASE
                        WHEN
                            t.priority =
                            'CRITICAL'
                        THEN 1

                        WHEN
                            t.priority =
                            'HIGH'
                        THEN 2

                        WHEN
                            t.priority =
                            'NORMAL'
                        THEN 3

                        ELSE 4
                    END,

                    t.created_at DESC,

                    t.id DESC
                `,
                values
            );

        // ======================================
        // IT SUPPORT STAFF
        // ======================================

        const staffResult =
            await db.query(
                `
                SELECT
                    s.id::int
                        AS support_staff_id,

                    s.portal_user_id::int
                        AS portal_user_id,

                    s.staff_title,

                    pu.employee_id,

                    pu.full_name,

                    pu.designation,

                    pu.department,

                    pu.official_email

                FROM it_support_staff s

                INNER JOIN portal_users pu
                    ON pu.id =
                       s.portal_user_id

                WHERE
                    s.is_active =
                        TRUE

                    AND
                    s.can_receive_tickets =
                        TRUE

                    AND
                    pu.account_status =
                        'ACTIVE'

                ORDER BY
                    pu.full_name ASC
                `
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
                            'OPEN'
                    )::int
                        AS open,

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
                `
            );

        return Response.json({
            success: true,

            tickets:
                ticketResult.rows,

            staff:
                staffResult.rows,

            summary:
                summaryResult.rows[0],
        });

    } catch (error) {
        console.error(
            "Load admin support tickets error:",
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