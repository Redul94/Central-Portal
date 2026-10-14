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
// GET INVENTORY HISTORY
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

        const assetIdText =
            String(
                url.searchParams.get(
                    "assetId"
                ) || ""
            ).trim();

        const userIdText =
            String(
                url.searchParams.get(
                    "userId"
                ) || ""
            ).trim();

        const conditions:
            string[] = [];

        const values:
            unknown[] = [];

        // ==================================
        // SEARCH
        // ==================================

        if (search) {
            values.push(
                `%${search}%`
            );

            const parameter =
                `$${values.length}`;

            conditions.push(
                `
                (
                    ia.asset_code
                        ILIKE ${parameter}

                    OR COALESCE(
                        ia.brand,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        ia.model,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        ia.serial_number,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        ic.category_name,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.employee_id,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.full_name,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.department,
                        ''
                    ) ILIKE ${parameter}

                    OR COALESCE(
                        iu.designation,
                        ''
                    ) ILIKE ${parameter}
                )
                `
            );
        }

        // ==================================
        // ASSIGNMENT STATUS
        // ==================================

        if (
            [
                "ACTIVE",
                "RETURNED",
                "TRANSFERRED",
            ].includes(
                status
            )
        ) {
            values.push(
                status
            );

            conditions.push(
                `ass.assignment_status = $${values.length}`
            );
        }

        // ==================================
        // ASSET
        // ==================================

        if (
            assetIdText &&
            Number.isInteger(
                Number(
                    assetIdText
                )
            ) &&
            Number(
                assetIdText
            ) > 0
        ) {
            values.push(
                Number(
                    assetIdText
                )
            );

            conditions.push(
                `ass.asset_id = $${values.length}`
            );
        }

        // ==================================
        // USER
        // ==================================

        if (
            userIdText &&
            Number.isInteger(
                Number(
                    userIdText
                )
            ) &&
            Number(
                userIdText
            ) > 0
        ) {
            values.push(
                Number(
                    userIdText
                )
            );

            conditions.push(
                `ass.inventory_user_id = $${values.length}`
            );
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(
                    " AND "
                )}`
                : "";

        // ==================================
        // HISTORY
        // ==================================

        const historyResult =
            await db.query(
                `
                SELECT
                    ass.id::int
                        AS id,

                    ass.asset_id::int
                        AS asset_id,

                    ass.inventory_user_id::int
                        AS inventory_user_id,

                    ass.assigned_at,

                    ass.returned_at,

                    ass.assignment_status,

                    ass.is_primary_computer,

                    ass.remarks,

                    ia.asset_code,

                    ia.brand,

                    ia.model,

                    ia.serial_number,

                    ia.asset_status,

                    ic.category_code,

                    ic.category_name,

                    iu.employee_id,

                    iu.full_name,

                    iu.designation,

                    iu.department,

                    iu.mobile_no,

                    iu.user_location,

                    pu.full_name
                        AS assigned_by_name,

                    ass.created_at,

                    ass.updated_at

                FROM inventory_assignments ass

                INNER JOIN inventory_assets ia
                    ON ia.id =
                       ass.asset_id

                INNER JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                INNER JOIN inventory_users iu
                    ON iu.id =
                       ass.inventory_user_id

                LEFT JOIN portal_users pu
                    ON pu.id =
                       ass.assigned_by

                ${whereClause}

                ORDER BY
                    ia.asset_code ASC,
                    ass.assigned_at DESC,
                    ass.id DESC
                `,
                values
            );

        // ==================================
        // ASSET FILTER LIST
        // ==================================

        const assetResult =
            await db.query(
                `
                SELECT
                    ia.id::int AS id,
                    ia.asset_code,
                    ia.brand,
                    ia.model,
                    ic.category_name

                FROM inventory_assets ia

                INNER JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                ORDER BY
                    ic.display_order ASC,
                    ia.asset_code ASC
                `
            );

        // ==================================
        // USER FILTER LIST
        // ==================================

        const userResult =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    employee_id,
                    full_name,
                    designation,
                    department

                FROM inventory_users

                ORDER BY
                    full_name ASC
                `
            );

        // ==================================
        // SUMMARY
        // ==================================

        const summaryResult =
            await db.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_history,

                    COUNT(*) FILTER (
                        WHERE assignment_status =
                            'ACTIVE'
                    )::int
                        AS active_count,

                    COUNT(*) FILTER (
                        WHERE assignment_status =
                            'RETURNED'
                    )::int
                        AS returned_count,

                    COUNT(*) FILTER (
                        WHERE assignment_status =
                            'TRANSFERRED'
                    )::int
                        AS transferred_count

                FROM inventory_assignments
                `
            );

        return Response.json({
            success: true,

            history:
                historyResult.rows,

            assets:
                assetResult.rows,

            users:
                userResult.rows,

            summary:
                summaryResult.rows[0],
        });

    } catch (error) {
        console.error(
            "Load inventory history error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load inventory history.",
            },
            {
                status: 500,
            }
        );
    }
}