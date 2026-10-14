import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// ASSET STATUS
// ==========================================

const ASSET_STATUSES = [
    "IN_STOCK",
    "ASSIGNED",
    "UNDER_SERVICE",
    "RETIRED",
    "DISPOSED",
    "LOST",
] as const;

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
// GET ASSETS
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

        const categoryIdText =
            String(
                url.searchParams.get(
                    "categoryId"
                ) || ""
            ).trim();

        const conditions:
            string[] = [];

        const values:
            unknown[] = [];

        // ----------------------------------
        // SEARCH
        // ----------------------------------

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
                )
                `
            );
        }

        // ----------------------------------
        // STATUS
        // ----------------------------------

        if (
            status &&
            ASSET_STATUSES.includes(
                status as typeof ASSET_STATUSES[number]
            )
        ) {
            values.push(
                status
            );

            conditions.push(
                `ia.asset_status = $${values.length}`
            );
        }

        // ----------------------------------
        // CATEGORY
        // ----------------------------------

        if (
            categoryIdText &&
            Number.isInteger(
                Number(
                    categoryIdText
                )
            ) &&
            Number(
                categoryIdText
            ) > 0
        ) {
            values.push(
                Number(
                    categoryIdText
                )
            );

            conditions.push(
                `ia.category_id = $${values.length}`
            );
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(
                    " AND "
                )}`
                : "";

        // ==================================
        // LOAD ASSETS
        // ==================================

        const result =
            await db.query(
                `
                SELECT
                    ia.id::int
                        AS id,

                    ia.asset_code,

                    ia.category_id::int
                        AS category_id,

                    ic.category_code,

                    ic.category_name,

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

                    ia.remarks,

                    ia.created_at,

                    ia.updated_at,

                    ass.inventory_user_id::int
                        AS assigned_user_id,

                    iu.employee_id
                        AS assigned_employee_id,

                    iu.full_name
                        AS assigned_user_name,

                    iu.department
                        AS assigned_department,

                    iu.user_location
                        AS assigned_location

                FROM inventory_assets ia

                INNER JOIN inventory_categories ic
                    ON ic.id =
                       ia.category_id

                LEFT JOIN inventory_assignments ass
                    ON ass.asset_id =
                       ia.id

                    AND ass.assignment_status =
                        'ACTIVE'

                LEFT JOIN inventory_users iu
                    ON iu.id =
                       ass.inventory_user_id

                ${whereClause}

                ORDER BY
                    ic.display_order ASC,
                    ia.asset_code ASC,
                    ia.id ASC
                `,
                values
            );

        return Response.json({
            success: true,

            assets:
                result.rows,
        });

    } catch (error) {
        console.error(
            "Load inventory assets error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to load IT assets.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// CREATE ASSET
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

        // ==================================
        // BASIC VALUES
        // ==================================

        const assetCode =
            String(
                body.assetCode ||
                    ""
            ).trim();

        const categoryId =
            Number(
                body.categoryId
            );

        const brand =
            String(
                body.brand ||
                    ""
            ).trim();

        const model =
            String(
                body.model ||
                    ""
            ).trim();

        const serialNumber =
            String(
                body.serialNumber ||
                    ""
            ).trim();

        const processor =
            String(
                body.processor ||
                    ""
            ).trim();

        const ramVersion =
            String(
                body.ramVersion ||
                    ""
            ).trim();

        const storageInfo =
            String(
                body.storageInfo ||
                    ""
            ).trim();

        const windowsVersion =
            String(
                body.windowsVersion ||
                    ""
            ).trim();

        const officeVersion =
            String(
                body.officeVersion ||
                    ""
            ).trim();

        const adOrWorkgroup =
            String(
                body.adOrWorkgroup ||
                    ""
            ).trim();

        const email365 =
            String(
                body.email365 ||
                    ""
            ).trim();

        const endpointSecurity =
            String(
                body.endpointSecurity ||
                    ""
            ).trim();

        const computerMaintenanceStatus =
            String(
                body.computerMaintenanceStatus ||
                    ""
            ).trim();

        const dataBackupStatus =
            String(
                body.dataBackupStatus ||
                    ""
            ).trim();

        const pendingWorkSupport =
            String(
                body.pendingWorkSupport ||
                    ""
            ).trim();

        const cableDressing =
            String(
                body.cableDressing ||
                    ""
            ).trim();

        const woodenTray =
            String(
                body.woodenTray ||
                    ""
            ).trim();

        const deviceRequirements =
            String(
                body.deviceRequirements ||
                    ""
            ).trim();

        const purchaseDate =
            String(
                body.purchaseDate ||
                    ""
            ).trim();

        const warrantyStart =
            String(
                body.warrantyStart ||
                    ""
            ).trim();

        const warrantyEnd =
            String(
                body.warrantyEnd ||
                    ""
            ).trim();

        const assetStatus =
            String(
                body.assetStatus ||
                    "IN_STOCK"
            )
                .trim()
                .toUpperCase();

        const remarks =
            String(
                body.remarks ||
                    ""
            ).trim();

        // ==================================
        // VALIDATION
        // ==================================

        if (!assetCode) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Asset ID / Asset Code is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            assetCode.length >
            100
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Asset Code cannot exceed 100 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !Number.isInteger(
                categoryId
            ) ||
            categoryId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Valid asset category is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !ASSET_STATUSES.includes(
                assetStatus as typeof ASSET_STATUSES[number]
            )
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid asset status.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================
        // CHECK CATEGORY
        // ==================================

        const categoryResult =
            await db.query(
                `
                SELECT
                    id::int AS id,
                    category_code,
                    category_name,
                    is_active

                FROM inventory_categories

                WHERE id = $1

                LIMIT 1
                `,
                [
                    categoryId,
                ]
            );

        if (
            categoryResult.rowCount ===
            0
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Asset category not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const category =
            categoryResult.rows[0];

        if (
            !category.is_active
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Selected asset category is inactive.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================
        // WARRANTY VALIDATION
        // ==================================

        if (
            warrantyStart &&
            warrantyEnd &&
            warrantyEnd <
                warrantyStart
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Warranty end date cannot be earlier than warranty start date.",
                },
                {
                    status: 400,
                }
            );
        }

        // ==================================
        // CREATE ASSET
        // ==================================

        const result =
            await db.query(
                `
                INSERT INTO inventory_assets (
                    asset_code,
                    category_id,
                    brand,
                    model,
                    serial_number,
                    processor,
                    ram_version,
                    storage_info,
                    windows_version,
                    office_version,
                    ad_or_workgroup,
                    email_365,
                    endpoint_security,
                    computer_maintenance_status,
                    data_backup_status,
                    pending_work_support,
                    cable_dressing,
                    wooden_tray,
                    device_requirements,
                    purchase_date,
                    warranty_start,
                    warranty_end,
                    asset_status,
                    remarks,
                    created_by
                )

                VALUES (
                    $1,
                    $2,

                    NULLIF(
                        $3,
                        ''
                    ),

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
                    ),

                    NULLIF(
                        $15,
                        ''
                    ),

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

                    NULLIF(
                        $19,
                        ''
                    ),

                    NULLIF(
                        $20,
                        ''
                    )::date,

                    NULLIF(
                        $21,
                        ''
                    )::date,

                    NULLIF(
                        $22,
                        ''
                    )::date,

                    $23,

                    NULLIF(
                        $24,
                        ''
                    ),

                    $25
                )

                RETURNING
                    id::int AS id,
                    asset_code,
                    category_id::int
                        AS category_id,
                    brand,
                    model,
                    serial_number,
                    asset_status,
                    created_at
                `,
                [
                    assetCode,
                    categoryId,
                    brand,
                    model,
                    serialNumber,
                    processor,
                    ramVersion,
                    storageInfo,
                    windowsVersion,
                    officeVersion,
                    adOrWorkgroup,
                    email365,
                    endpointSecurity,
                    computerMaintenanceStatus,
                    dataBackupStatus,
                    pendingWorkSupport,
                    cableDressing,
                    woodenTray,
                    deviceRequirements,
                    purchaseDate,
                    warrantyStart,
                    warrantyEnd,
                    assetStatus,
                    remarks,
                    admin.id,
                ]
            );

        const asset =
            result.rows[0];

        // ==================================
        // AUDIT
        // ==================================

        await writeAuditLog({
            userId:
                admin.id,

            action:
                "CREATE_INVENTORY_ASSET",

            module:
                "INVENTORY",

            recordType:
                "INVENTORY_ASSET",

            recordId:
                asset.id,

            description:
                `Created IT asset "${asset.asset_code}" (${category.category_name}).`,

            metadata: {
                assetCode:
                    asset.asset_code,

                categoryId,

                categoryCode:
                    category.category_code,

                categoryName:
                    category.category_name,

                brand:
                    asset.brand,

                model:
                    asset.model,

                serialNumber:
                    asset.serial_number,

                assetStatus:
                    asset.asset_status,
            },

            ipAddress:
                getIpAddress(
                    request
                ),
        });

        // ==================================
        // SUCCESS
        // ==================================

        return Response.json(
            {
                success: true,

                message:
                    "IT asset created successfully.",

                asset,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Create inventory asset error:",
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
            return Response.json(
                {
                    success: false,
                    message:
                        "This Asset ID / Asset Code already exists.",
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
                    "Unable to create IT asset.",
            },
            {
                status: 500,
            }
        );
    }
}