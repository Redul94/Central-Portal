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
// GET INVENTORY USERS
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

        const values:
            unknown[] = [];

        let whereClause = "";

        if (search) {
            values.push(
                `%${search}%`
            );

            whereClause = `
                WHERE
                    iu.full_name
                        ILIKE $1

                    OR COALESCE(
                        iu.employee_id,
                        ''
                    ) ILIKE $1

                    OR COALESCE(
                        iu.department,
                        ''
                    ) ILIKE $1

                    OR COALESCE(
                        iu.designation,
                        ''
                    ) ILIKE $1

                    OR COALESCE(
                        iu.mobile_no,
                        ''
                    ) ILIKE $1

                    OR COALESCE(
                        iu.user_location,
                        ''
                    ) ILIKE $1
            `;
        }

        const result =
            await db.query(
                `
                SELECT
                    iu.id::int
                        AS id,

                    iu.portal_user_id::int
                        AS portal_user_id,

                    iu.employee_id,

                    iu.full_name,

                    iu.designation,

                    iu.department,

                    iu.mobile_no,

                    iu.user_location,

                    iu.category,

                    iu.user_training_status,

                    iu.service_ensured_by,

                    iu.it_concern,

                    iu.acknowledge_to_concern_department,

                    iu.remarks,

                    iu.computer_schedule_maintenance::text
                        AS computer_schedule_maintenance,

                    iu.ups_battery_replacement_date::text
                        AS ups_battery_replacement_date,

                    iu.data_backup_method,

                    iu.concern_it_engineer,

                    iu.user_signature_note,

                    iu.created_at,

                    iu.updated_at,

                    pu.official_email
                        AS portal_email,

                    pu.account_status
                        AS portal_account_status,

                    COUNT(
                        ia.id
                    ) FILTER (
                        WHERE
                            ia.assignment_status =
                                'ACTIVE'
                    )::int
                        AS assigned_asset_count

                FROM inventory_users iu

                LEFT JOIN portal_users pu
                    ON pu.id =
                       iu.portal_user_id

                LEFT JOIN inventory_assignments ia
                    ON ia.inventory_user_id =
                       iu.id

                ${whereClause}

                GROUP BY
                    iu.id,
                    pu.official_email,
                    pu.account_status

                ORDER BY
                    iu.full_name ASC,
                    iu.id ASC
                `,
                values
            );

        return Response.json({
            success: true,
            users:
                result.rows,
        });

    } catch (error) {
        console.error(
            "Load inventory users error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load inventory users.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// CREATE INVENTORY USER
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

        const rawPortalUserId =
            body.portalUserId;

        const portalUserId =
            rawPortalUserId ===
                null ||
            rawPortalUserId ===
                undefined ||
            rawPortalUserId ===
                ""
                ? null
                : Number(
                    rawPortalUserId
                );

        const employeeId =
            String(
                body.employeeId ||
                    ""
            ).trim();

        const fullName =
            String(
                body.fullName ||
                    ""
            ).trim();

        const designation =
            String(
                body.designation ||
                    ""
            ).trim();

        const department =
            String(
                body.department ||
                    ""
            ).trim();

        const mobileNo =
            String(
                body.mobileNo ||
                    ""
            ).trim();

        const userLocation =
            String(
                body.userLocation ||
                    ""
            ).trim();

        const category =
            String(
                body.category ||
                    ""
            ).trim();

        const userTrainingStatus =
            String(
                body.userTrainingStatus ||
                    ""
            ).trim();

        const serviceEnsuredBy =
            String(
                body.serviceEnsuredBy ||
                    ""
            ).trim();

        const itConcern =
            String(
                body.itConcern ||
                    ""
            ).trim();

        const acknowledgeToConcernDepartment =
            String(
                body.acknowledgeToConcernDepartment ||
                    ""
            ).trim();

        const remarks =
            String(
                body.remarks ||
                    ""
            ).trim();

        const computerScheduleMaintenance =
            String(
                body.computerScheduleMaintenance ||
                    ""
            ).trim();

        const upsBatteryReplacementDate =
            String(
                body.upsBatteryReplacementDate ||
                    ""
            ).trim();

        const dataBackupMethod =
            String(
                body.dataBackupMethod ||
                    ""
            ).trim();

        const concernItEngineer =
            String(
                body.concernItEngineer ||
                    ""
            ).trim();

        const userSignatureNote =
            String(
                body.userSignatureNote ||
                    ""
            ).trim();

        // ==================================
        // VALIDATION
        // ==================================

        if (!fullName) {
            return Response.json(
                {
                    success: false,
                    message:
                        "User name is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            fullName.length >
            200
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "User name cannot exceed 200 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            portalUserId !==
                null &&
            (
                !Number.isInteger(
                    portalUserId
                ) ||
                portalUserId <= 0
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid portal user.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================
        // VERIFY PORTAL USER
        // ==================================

        if (
            portalUserId !==
            null
        ) {
            const portalResult =
                await db.query(
                    `
                    SELECT
                        id::int AS id,
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
                portalResult.rowCount ===
                0
            ) {
                return Response.json(
                    {
                        success: false,
                        message:
                            "Selected portal user was not found.",
                    },
                    {
                        status: 404,
                    }
                );
            }
        }

        // ==================================
        // CREATE USER
        // ==================================

        const result =
            await db.query(
                `
                INSERT INTO inventory_users (
                    portal_user_id,
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
                    remarks,
                    computer_schedule_maintenance,
                    ups_battery_replacement_date,
                    data_backup_method,
                    concern_it_engineer,
                    user_signature_note,
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
                    NULLIF(
                        $6,
                        ''
                    ),
                    NULLIF(
                        $7,
                        ''
                    ),
                    NULLIF(
                        $8,
                        ''
                    ),
                    NULLIF(
                        $9,
                        ''
                    ),
                    NULLIF(
                        $10,
                        ''
                    ),
                    NULLIF(
                        $11,
                        ''
                    ),
                    NULLIF(
                        $12,
                        ''
                    ),
                    NULLIF(
                        $13,
                        ''
                    ),
                    NULLIF(
                        $14,
                        ''
                    )::date,
                    NULLIF(
                        $15,
                        ''
                    )::date,
                    NULLIF(
                        $16,
                        ''
                    ),
                    NULLIF(
                        $17,
                        ''
                    ),
                    NULLIF(
                        $18,
                        ''
                    ),
                    $19
                )

                RETURNING
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
                    created_at
                `,
                [
                    portalUserId,
                    employeeId,
                    fullName,
                    designation,
                    department,
                    mobileNo,
                    userLocation,
                    category,
                    userTrainingStatus,
                    serviceEnsuredBy,
                    itConcern,
                    acknowledgeToConcernDepartment,
                    remarks,
                    computerScheduleMaintenance,
                    upsBatteryReplacementDate,
                    dataBackupMethod,
                    concernItEngineer,
                    userSignatureNote,
                    admin.id,
                ]
            );

        const inventoryUser =
            result.rows[0];

        // ==================================
        // AUDIT
        // ==================================

        await writeAuditLog({
            userId:
                admin.id,

            action:
                "CREATE_INVENTORY_USER",

            module:
                "INVENTORY",

            recordType:
                "INVENTORY_USER",

            recordId:
                inventoryUser.id,

            description:
                `Created inventory user "${inventoryUser.full_name}".`,

            metadata: {
                employeeId:
                    inventoryUser.employee_id,

                fullName:
                    inventoryUser.full_name,

                department:
                    inventoryUser.department,

                designation:
                    inventoryUser.designation,

                portalUserId:
                    inventoryUser.portal_user_id,
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        return Response.json(
            {
                success: true,

                message:
                    "Inventory user created successfully.",

                user:
                    inventoryUser,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Create inventory user error:",
            error
        );

        const databaseError =
            error as {
                code?: string;
                constraint?: string;
            };

        if (
            databaseError.code ===
            "23505"
        ) {
            if (
                databaseError.constraint ===
                "ux_inventory_users_employee_id"
            ) {
                return Response.json(
                    {
                        success: false,
                        message:
                            "This Employee ID already exists in Inventory.",
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
                        "This inventory user already exists.",
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
                    "Unable to create inventory user.",
            },
            {
                status: 500,
            }
        );
    }
}