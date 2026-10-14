import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// CURRENT LOGGED-IN USER
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
// GET MY INVENTORY
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

        // ======================================
        // FIND LINKED INVENTORY USER
        // ======================================

        const inventoryUserResult =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    portal_user_id::int
                        AS portal_user_id,

                    employee_id,
                    full_name,
                    designation,
                    department,
                    mobile_no,
                    user_location,

                    category,
                    user_training_status,

                    service_ensured_by,
                    it_concern,
                    acknowledge_to_concern_department,

                    computer_schedule_maintenance::text
                        AS computer_schedule_maintenance,

                    ups_battery_replacement_date::text
                        AS ups_battery_replacement_date,

                    data_backup_method,
                    concern_it_engineer,
                    remarks

                FROM inventory_users

                WHERE portal_user_id = $1

                LIMIT 1
                `,
                [
                    portalUser.id,
                ]
            );

        // ======================================
        // NOT LINKED YET
        // ======================================

        if (
            inventoryUserResult.rowCount ===
            0
        ) {
            return Response.json({
                success: true,

                linked: false,

                portalUser,

                inventoryUser:
                    null,

                assets: [],

                history: [],
            });
        }

        const inventoryUser =
            inventoryUserResult.rows[0];

        // ======================================
        // CURRENT ASSIGNED ASSETS
        // ======================================

        const assetResult =
            await db.query(
                `
                SELECT
                    ass.id::int
                        AS assignment_id,

                    ass.assigned_at,

                    ass.is_primary_computer,

                    ass.remarks
                        AS assignment_remarks,

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

                    ia.pending_work_support,

                    ia.cable_dressing,

                    ia.wooden_tray,

                    ia.device_requirements,

                    ia.purchase_date::text
                        AS purchase_date,

                    ia.warranty_start::text
                        AS warranty_start,

                    ia.warranty_end::text
                        AS warranty_end,

                    ia.asset_status,

                    ia.remarks
                        AS asset_remarks,

                    ic.category_code,

                    ic.category_name,

                    support.ticket_no
                        AS last_ticket_no,

                    support.subject
                        AS last_support_subject,

                    support.problem_description
                        AS last_problem,

                    support.resolution_summary
                        AS last_resolution,

                    support.completed_at
                        AS last_support_date,

                    support.worked_by
                        AS last_worked_by

                FROM inventory_assignments ass

                INNER JOIN inventory_assets ia
                    ON ia.id =
                       ass.asset_id

                INNER JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                LEFT JOIN LATERAL (
                    SELECT
                        t.ticket_no,
                        t.subject,
                        t.problem_description,
                        t.resolution_summary,
                        t.completed_at,

                        pu.full_name
                            AS worked_by

                    FROM it_support_tickets t

                    LEFT JOIN portal_users pu
                        ON pu.id =
                           t.assigned_to

                    WHERE
                        t.asset_id =
                            ia.id

                        AND
                        t.ticket_status =
                            'DONE'

                    ORDER BY
                        t.completed_at DESC NULLS LAST,
                        t.id DESC

                    LIMIT 1
                ) support
                    ON TRUE

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
        // OWN ASSIGNMENT HISTORY
        // ======================================

        const historyResult =
            await db.query(
                `
                SELECT
                    ass.id::int
                        AS assignment_id,

                    ass.assigned_at,

                    ass.returned_at,

                    ass.assignment_status,

                    ass.is_primary_computer,

                    ass.remarks,

                    ia.id::int
                        AS asset_id,

                    ia.asset_code,

                    ia.brand,

                    ia.model,

                    ia.serial_number,

                    ic.category_name

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

                ORDER BY
                    ass.assigned_at DESC,
                    ass.id DESC
                `,
                [
                    inventoryUser.id,
                ]
            );

        // ======================================
        // RESPONSE
        // ======================================

        return Response.json({
            success: true,

            linked: true,

            portalUser,

            inventoryUser,

            assets:
                assetResult.rows,

            history:
                historyResult.rows,
        });

    } catch (error) {
        console.error(
            "Load my inventory error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load your inventory.",
            },
            {
                status: 500,
            }
        );
    }
}