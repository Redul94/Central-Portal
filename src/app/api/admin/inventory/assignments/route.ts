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
    const cookieStore = await cookies();

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
            [session.userId]
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
// GET ASSIGNMENT DATA
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
            assignmentResult,
            userResult,
            assetResult,
        ] =
            await Promise.all([
                // ACTIVE ASSIGNMENTS
                db.query(
                    `
                    SELECT
                        ass.id::int
                            AS id,

                        ass.asset_id::int
                            AS asset_id,

                        ass.inventory_user_id::int
                            AS inventory_user_id,

                        ass.assigned_at,

                        ass.assignment_status,

                        ass.is_primary_computer,

                        ass.remarks,

                        ia.asset_code,

                        ia.brand,

                        ia.model,

                        ia.serial_number,

                        ia.asset_status,

                        ic.category_name,

                        iu.employee_id,

                        iu.full_name,

                        iu.designation,

                        iu.department,

                        iu.user_location

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

                    WHERE
                        ass.assignment_status =
                            'ACTIVE'

                    ORDER BY
                        ass.assigned_at DESC,
                        ass.id DESC
                    `
                ),

                // INVENTORY USERS
                db.query(
                    `
                    SELECT
                        id::int AS id,
                        employee_id,
                        full_name,
                        designation,
                        department,
                        user_location

                    FROM inventory_users

                    ORDER BY
                        full_name ASC
                    `
                ),

                // AVAILABLE ASSETS ONLY
                db.query(
                    `
                    SELECT
                        ia.id::int AS id,
                        ia.asset_code,
                        ia.brand,
                        ia.model,
                        ia.serial_number,
                        ia.asset_status,
                        ic.category_name

                    FROM inventory_assets ia

                    INNER JOIN inventory_categories ic
                        ON ic.id =
                           ia.category_id

                    LEFT JOIN inventory_assignments ass
                        ON ass.asset_id =
                           ia.id

                        AND ass.assignment_status =
                            'ACTIVE'

                    WHERE
                        ia.asset_status =
                            'IN_STOCK'

                        AND ass.id IS NULL

                    ORDER BY
                        ic.display_order ASC,
                        ia.asset_code ASC
                    `
                ),
            ]);

        return Response.json({
            success: true,

            assignments:
                assignmentResult.rows,

            users:
                userResult.rows,

            availableAssets:
                assetResult.rows,
        });

    } catch (error) {
        console.error(
            "Load asset assignments error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load asset assignments.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// CREATE ASSIGNMENT
// ==========================================

export async function POST(
    request: Request
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

        const body =
            await request.json();

        const assetId =
            Number(
                body.assetId
            );

        const inventoryUserId =
            Number(
                body.inventoryUserId
            );

        const assignedDate =
            String(
                body.assignedDate ||
                ""
            ).trim();

        const isPrimaryComputer =
            body.isPrimaryComputer ===
            true ||
            body.isPrimaryComputer ===
            "true";

        const remarks =
            String(
                body.remarks ||
                ""
            ).trim();

        // ==================================
        // VALIDATION
        // ==================================

        if (
            !Number.isInteger(
                assetId
            ) ||
            assetId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please select a valid asset.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !Number.isInteger(
                inventoryUserId
            ) ||
            inventoryUserId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Please select a valid inventory user.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            assignedDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(
                assignedDate
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid assigned date.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================
        // TRANSACTION
        // ==================================

        await client.query(
            "BEGIN"
        );

        // ==================================
        // CHECK USER
        // ==================================

        const userResult =
            await client.query(
                `
                SELECT
                    id::int AS id,
                    employee_id,
                    full_name,
                    department

                FROM inventory_users

                WHERE id = $1

                LIMIT 1
                `,
                [
                    inventoryUserId,
                ]
            );

        if (
            userResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Inventory user not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const inventoryUser =
            userResult.rows[0];

        // ==================================
        // LOCK + CHECK ASSET
        // ==================================

        const assetResult =
            await client.query(
                `
                SELECT
                    ia.id::int AS id,
                    ia.asset_code,
                    ia.asset_status,
                    ia.brand,
                    ia.model,
                    ic.category_name

                FROM inventory_assets ia

                INNER JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                WHERE
                    ia.id = $1

                FOR UPDATE
                `,
                [
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
                        "Asset not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const asset =
            assetResult.rows[0];

        if (
            asset.asset_status !==
            "IN_STOCK"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Only IN STOCK assets can be assigned.",
                },
                {
                    status: 409,
                }
            );
        }

        // ==================================
        // CHECK ACTIVE ASSIGNMENT
        // ==================================

        const activeResult =
            await client.query(
                `
                SELECT
                    id

                FROM inventory_assignments

                WHERE
                    asset_id = $1

                    AND
                    assignment_status =
                        'ACTIVE'

                LIMIT 1
                `,
                [
                    assetId,
                ]
            );

        if (
            activeResult.rowCount &&
            activeResult.rowCount > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "This asset is already assigned to another user.",
                },
                {
                    status: 409,
                }
            );
        }

        // ==================================
        // PRIMARY COMPUTER
        // ==================================

        if (
            isPrimaryComputer
        ) {
            await client.query(
                `
                UPDATE inventory_assignments

                SET
                    is_primary_computer =
                        FALSE,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE
                    inventory_user_id =
                        $1

                    AND
                    assignment_status =
                        'ACTIVE'

                    AND
                    is_primary_computer =
                        TRUE
                `,
                [
                    inventoryUserId,
                ]
            );
        }

        // ==================================
        // INSERT ASSIGNMENT
        // ==================================

        const assignmentResult =
            await client.query(
                `
                INSERT INTO inventory_assignments (
                    asset_id,
                    inventory_user_id,
                    assigned_by,
                    assigned_at,
                    assignment_status,
                    is_primary_computer,
                    remarks
                )

                VALUES (
                    $1,
                    $2,
                    $3,

                    COALESCE(
                        NULLIF(
                            $4,
                            ''
                        )::date,
                        CURRENT_TIMESTAMP
                    ),

                    'ACTIVE',
                    $5,

                    NULLIF(
                        $6,
                        ''
                    )
                )

                RETURNING
                    id::int AS id,
                    asset_id::int
                        AS asset_id,
                    inventory_user_id::int
                        AS inventory_user_id,
                    assigned_at,
                    assignment_status,
                    is_primary_computer,
                    remarks
                `,
                [
                    assetId,
                    inventoryUserId,
                    admin.id,
                    assignedDate,
                    isPrimaryComputer,
                    remarks,
                ]
            );

        // ==================================
        // UPDATE ASSET STATUS
        // ==================================

        await client.query(
            `
            UPDATE inventory_assets

            SET
                asset_status =
                    'ASSIGNED',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [
                assetId,
            ]
        );

        await client.query(
            "COMMIT"
        );

        const assignment =
            assignmentResult.rows[0];

        // ==================================
        // AUDIT
        // ==================================

        try {
            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    "ASSIGN_INVENTORY_ASSET",

                module:
                    "INVENTORY",

                recordType:
                    "INVENTORY_ASSIGNMENT",

                recordId:
                    assignment.id,

                description:
                    `Assigned asset "${asset.asset_code}" to "${inventoryUser.full_name}".`,

                metadata: {
                    assetId:
                        asset.id,

                    assetCode:
                        asset.asset_code,

                    categoryName:
                        asset.category_name,

                    inventoryUserId:
                        inventoryUser.id,

                    employeeId:
                        inventoryUser.employee_id,

                    userName:
                        inventoryUser.full_name,

                    department:
                        inventoryUser.department,

                    isPrimaryComputer,
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
                "Assignment audit log error:",
                auditError
            );
        }

        return Response.json(
            {
                success: true,

                message:
                    "Asset assigned successfully.",

                assignment,
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
            // Ignore rollback error
        }

        console.error(
            "Create asset assignment error:",
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
                        "This asset already has an active assignment.",
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
                    "Unable to assign asset.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}