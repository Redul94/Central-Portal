import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSuperAdmin() {
    const cookieStore = await cookies();

    const token =
        cookieStore.get("auko_session")?.value;

    if (!token) {
        return null;
    }

    const session =
        await verifySessionToken(token);

    if (!session) {
        return null;
    }

    const result = await db.query(
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
        [session.userId]
    );

    if (result.rowCount === 0) {
        return null;
    }

    const user = result.rows[0];

    if (
        user.account_status !== "ACTIVE" ||
        user.role !== "SUPER_ADMIN"
    ) {
        return null;
    }

    return user;
}

export async function GET(
    request: Request
) {
    try {
        const admin =
            await getSuperAdmin();

        if (!admin) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Super Admin access required.",
                },
                {
                    status: 403,
                }
            );
        }

        const { searchParams } =
            new URL(request.url);

        const search =
            searchParams
                .get("search")
                ?.trim() || "";

        const module =
            searchParams
                .get("module")
                ?.trim() || "";

        const action =
            searchParams
                .get("action")
                ?.trim() || "";

        const values: unknown[] = [];

        const conditions: string[] =
            [];

        // ------------------------------
        // SEARCH
        // ------------------------------

        if (search) {
            values.push(
                `%${search}%`
            );

            const index =
                values.length;

            conditions.push(`
        (
          al.action ILIKE $${index}
          OR al.module ILIKE $${index}
          OR al.record_type ILIKE $${index}
          OR al.description ILIKE $${index}
          OR pu.full_name ILIKE $${index}
          OR pu.employee_id ILIKE $${index}
          OR CAST(al.record_id AS TEXT) ILIKE $${index}
        )
      `);
        }

        // ------------------------------
        // MODULE FILTER
        // ------------------------------

        if (module) {
            values.push(module);

            conditions.push(
                `al.module = $${values.length}`
            );
        }

        // ------------------------------
        // ACTION FILTER
        // ------------------------------

        if (action) {
            values.push(action);

            conditions.push(
                `al.action = $${values.length}`
            );
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(
                    " AND "
                )}`
                : "";

        const result =
            await db.query(
                `
        SELECT
          al.id::int AS id,
          al.user_id::int AS user_id,
          al.action,
          al.module,
          al.record_type,
          al.record_id::int AS record_id,
          al.description,
          al.metadata,
          al.ip_address,
          al.created_at,

          pu.employee_id,
          pu.full_name,
          pu.role

        FROM audit_log al

        LEFT JOIN portal_users pu
          ON pu.id = al.user_id

        ${whereClause}

        ORDER BY
          al.created_at DESC

        LIMIT 500
        `,
                values
            );

        // Filter options

        const moduleResult =
            await db.query(`
        SELECT DISTINCT module
        FROM audit_log
        WHERE module IS NOT NULL
        ORDER BY module
      `);

        const actionResult =
            await db.query(`
        SELECT DISTINCT action
        FROM audit_log
        WHERE action IS NOT NULL
        ORDER BY action
      `);

        return Response.json({
            success: true,

            logs: result.rows,

            modules:
                moduleResult.rows.map(
                    (row) => row.module
                ),

            actions:
                actionResult.rows.map(
                    (row) => row.action
                ),
        });
    } catch (error) {
        console.error(
            "Audit log API error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to retrieve audit log.",
            },
            {
                status: 500,
            }
        );
    }
}