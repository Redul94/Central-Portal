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
// PATCH ASSIGNMENT
//
// ACTION:
// RETURN
// TRANSFER
// ==========================================

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

        const assignmentId =
            Number(
                params.id
            );

        if (
            !Number.isInteger(
                assignmentId
            ) ||
            assignmentId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid assignment ID.",
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

        const effectiveDate =
            String(
                body.effectiveDate ||
                ""
            ).trim();

        const remarks =
            String(
                body.remarks ||
                ""
            ).trim();

        if (
            action !==
            "RETURN" &&
            action !==
            "TRANSFER"
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Action must be RETURN or TRANSFER.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            effectiveDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(
                effectiveDate
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid effective date.",
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
        // CURRENT ASSIGNMENT
        // ======================================

        const assignmentResult =
            await client.query(
                `
                SELECT
                    ass.id::int
                        AS id,

                    ass.asset_id::int
                        AS asset_id,

                    ass.inventory_user_id::int
                        AS inventory_user_id,

                    ass.assignment_status,

                    ass.is_primary_computer,

                    ia.asset_code,

                    ia.asset_status,

                    ic.category_name,

                    iu.employee_id,

                    iu.full_name

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
                    ass.id = $1

                FOR UPDATE OF ass, ia
                `,
                [
                    assignmentId,
                ]
            );

        if (
            assignmentResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Assignment not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const currentAssignment =
            assignmentResult.rows[0];

        if (
            currentAssignment.assignment_status !==
            "ACTIVE"
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "This assignment is no longer active.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // RETURN ASSET
        // ======================================

        if (
            action ===
            "RETURN"
        ) {
            await client.query(
                `
                UPDATE inventory_assignments

                SET
                    assignment_status =
                        'RETURNED',

                    returned_at =
                        COALESCE(
                            NULLIF(
                                $2,
                                ''
                            )::date,
                            CURRENT_TIMESTAMP
                        ),

                    remarks =
                        CASE
                            WHEN NULLIF(
                                $3,
                                ''
                            ) IS NULL
                                THEN remarks

                            WHEN remarks IS NULL
                                OR BTRIM(
                                    remarks
                                ) = ''
                                THEN $3

                            ELSE
                                remarks
                                || E'\\n'
                                || $3
                        END,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    assignmentId,
                    effectiveDate,
                    remarks,
                ]
            );

            await client.query(
                `
                UPDATE inventory_assets

                SET
                    asset_status =
                        'IN_STOCK',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    currentAssignment.asset_id,
                ]
            );

            await client.query(
                "COMMIT"
            );

            try {
                await writeAuditLog({
                    userId:
                        admin.id,

                    action:
                        "RETURN_INVENTORY_ASSET",

                    module:
                        "INVENTORY",

                    recordType:
                        "INVENTORY_ASSIGNMENT",

                    recordId:
                        assignmentId,

                    description:
                        `Returned asset "${currentAssignment.asset_code}" from "${currentAssignment.full_name}".`,

                    metadata: {
                        assetId:
                            currentAssignment.asset_id,

                        assetCode:
                            currentAssignment.asset_code,

                        inventoryUserId:
                            currentAssignment.inventory_user_id,

                        employeeId:
                            currentAssignment.employee_id,

                        userName:
                            currentAssignment.full_name,

                        effectiveDate:
                            effectiveDate ||
                            null,

                        remarks:
                            remarks ||
                            null,
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
                    "Return asset audit error:",
                    auditError
                );
            }

            return Response.json({
                success: true,

                message:
                    "Asset returned successfully.",
            });
        }

        // ======================================
        // TRANSFER ASSET
        // ======================================

        const newInventoryUserId =
            Number(
                body.newInventoryUserId
            );

        const isPrimaryComputer =
            body.isPrimaryComputer ===
            true ||
            body.isPrimaryComputer ===
            "true";

        if (
            !Number.isInteger(
                newInventoryUserId
            ) ||
            newInventoryUserId <= 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Please select the employee to transfer this asset to.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            newInventoryUserId ===
            currentAssignment.inventory_user_id
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Asset is already assigned to this employee.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // NEW USER
        // ======================================

        const newUserResult =
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
                    newInventoryUserId,
                ]
            );

        if (
            newUserResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,
                    message:
                        "Transfer employee not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const newUser =
            newUserResult.rows[0];

        // ======================================
        // PRIMARY PC
        // ======================================

        const computerAsset =
            currentAssignment.category_name ===
            "Desktop Set" ||
            currentAssignment.category_name ===
            "Laptop";

        const makePrimary =
            computerAsset &&
            isPrimaryComputer;

        if (
            makePrimary
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
                    newInventoryUserId,
                ]
            );
        }

        // ======================================
        // CLOSE OLD ASSIGNMENT
        // ======================================

        await client.query(
            `
            UPDATE inventory_assignments

            SET
                assignment_status =
                    'TRANSFERRED',

                returned_at =
                    COALESCE(
                        NULLIF(
                            $2,
                            ''
                        )::date,
                        CURRENT_TIMESTAMP
                    ),

                remarks =
                    CASE
                        WHEN NULLIF(
                            $3,
                            ''
                        ) IS NULL
                            THEN remarks

                        WHEN remarks IS NULL
                            OR BTRIM(
                                remarks
                            ) = ''
                            THEN $3

                        ELSE
                            remarks
                            || E'\\n'
                            || $3
                    END,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $1
            `,
            [
                assignmentId,
                effectiveDate,
                remarks,
            ]
        );

        // ======================================
        // CREATE NEW ASSIGNMENT
        // ======================================

        const newAssignmentResult =
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
                    id::int AS id
                `,
                [
                    currentAssignment.asset_id,
                    newInventoryUserId,
                    admin.id,
                    effectiveDate,
                    makePrimary,
                    remarks,
                ]
            );

        // Asset remains assigned

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
                currentAssignment.asset_id,
            ]
        );

        await client.query(
            "COMMIT"
        );

        const newAssignmentId =
            newAssignmentResult
                .rows[0]
                .id;

        try {
            await writeAuditLog({
                userId:
                    admin.id,

                action:
                    "TRANSFER_INVENTORY_ASSET",

                module:
                    "INVENTORY",

                recordType:
                    "INVENTORY_ASSIGNMENT",

                recordId:
                    newAssignmentId,

                description:
                    `Transferred asset "${currentAssignment.asset_code}" from "${currentAssignment.full_name}" to "${newUser.full_name}".`,

                metadata: {
                    assetId:
                        currentAssignment.asset_id,

                    assetCode:
                        currentAssignment.asset_code,

                    previousAssignmentId:
                        assignmentId,

                    previousUserId:
                        currentAssignment.inventory_user_id,

                    previousUserName:
                        currentAssignment.full_name,

                    newAssignmentId,

                    newUserId:
                        newInventoryUserId,

                    newEmployeeId:
                        newUser.employee_id,

                    newUserName:
                        newUser.full_name,

                    department:
                        newUser.department,

                    effectiveDate:
                        effectiveDate ||
                        null,

                    isPrimaryComputer:
                        makePrimary,

                    remarks:
                        remarks ||
                        null,
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
                "Transfer asset audit error:",
                auditError
            );
        }

        return Response.json({
            success: true,

            message:
                "Asset transferred successfully.",

            newAssignmentId,
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
            "Return / transfer asset error:",
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
                        "Asset already has another active assignment.",
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
                    "Unable to process asset assignment.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}