import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// CURRENT USER
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

            WHERE
                id = $1

                AND
                account_status = 'ACTIVE'

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
// GET MY PROFILE
// ==========================================

export async function GET() {
    try {
        const currentUser =
            await getCurrentUser();

        if (!currentUser) {
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

        const result =
            await db.query(
                `
                SELECT
                    pu.id::int
                        AS portal_user_id,

                    pu.employee_id,

                    pu.full_name,

                    pu.designation,

                    pu.department,

                    pu.official_email,

                    pu.role,

                    pu.account_status,

                    iu.id::int
                        AS inventory_user_id,

                    iu.mobile_no,

                    iu.user_location

                FROM portal_users pu

                LEFT JOIN LATERAL (
                    SELECT
                        i.id,
                        i.portal_user_id,
                        i.employee_id,
                        i.mobile_no,
                        i.user_location

                    FROM inventory_users i

                    WHERE
                        i.portal_user_id =
                            pu.id

                        OR (
                            i.portal_user_id
                                IS NULL

                            AND
                            i.employee_id =
                                pu.employee_id
                        )

                    ORDER BY
                        CASE
                            WHEN
                                i.portal_user_id =
                                pu.id
                            THEN 0
                            ELSE 1
                        END,

                        i.id ASC

                    LIMIT 1
                ) iu
                    ON TRUE

                WHERE
                    pu.id = $1

                LIMIT 1
                `,
                [
                    currentUser.id,
                ]
            );

        if (
            result.rowCount === 0
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Profile not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return Response.json({
            success: true,

            profile:
                result.rows[0],
        });

    } catch (error) {
        console.error(
            "Load profile error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load profile.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// UPDATE MY PROFILE
// ==========================================

export async function PATCH(
    request: Request
) {
    const client =
        await db.connect();

    try {
        const currentUser =
            await getCurrentUser();

        if (!currentUser) {
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

        const body =
            await request.json();

        // ======================================
        // EDITABLE FIELDS
        // ======================================

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

        const officialEmail =
            String(
                body.officialEmail ||
                ""
            )
                .trim()
                .toLowerCase();

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

        // ======================================
        // REQUIRED
        // ======================================

        if (!employeeId) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Employee ID is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!fullName) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Full Name is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!officialEmail) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Official Email is required.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // EMAIL FORMAT
        // ======================================

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(
                officialEmail
            )
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Please enter a valid official email address.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // LENGTH VALIDATION
        // ======================================

        if (
            employeeId.length > 100
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Employee ID is too long.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            fullName.length > 255
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Full Name is too long.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            designation.length > 255 ||
            department.length > 255 ||
            userLocation.length > 255
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Designation, Department or Location is too long.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            mobileNo.length > 50
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Mobile number is too long.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // BEGIN
        // ======================================

        await client.query(
            "BEGIN"
        );

        // ======================================
        // LOCK CURRENT PORTAL USER
        // ======================================

        const existingPortalResult =
            await client.query(
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

                FOR UPDATE
                `,
                [
                    currentUser.id,
                ]
            );

        if (
            existingPortalResult.rowCount ===
            0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "Profile not found.",
                },
                {
                    status: 404,
                }
            );
        }

        const oldProfile =
            existingPortalResult.rows[0];

        // ======================================
        // FIND CURRENT INVENTORY PROFILE
        // ======================================

        let inventoryResult =
            await client.query(
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

                    user_location

                FROM inventory_users

                WHERE portal_user_id = $1

                LIMIT 1

                FOR UPDATE
                `,
                [
                    currentUser.id,
                ]
            );

        // ======================================
        // FALLBACK USING OLD EMPLOYEE ID
        // ======================================

        if (
            inventoryResult.rowCount ===
                0 &&
            oldProfile.employee_id
        ) {
            inventoryResult =
                await client.query(
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

                        user_location

                    FROM inventory_users

                    WHERE
                        employee_id = $1

                    LIMIT 1

                    FOR UPDATE
                    `,
                    [
                        oldProfile.employee_id,
                    ]
                );

            // Only use the fallback record when
            // it is unlinked or already belongs
            // to this Portal user.

            if (
                inventoryResult.rowCount &&
                inventoryResult.rowCount > 0
            ) {
                const fallback =
                    inventoryResult.rows[0];

                if (
                    fallback.portal_user_id &&
                    fallback.portal_user_id !==
                        currentUser.id
                ) {
                    inventoryResult = {
                        ...inventoryResult,
                        rowCount: 0,
                        rows: [],
                    };
                }
            }
        }

        const currentInventoryId =
            inventoryResult.rowCount &&
            inventoryResult.rowCount > 0
                ? Number(
                    inventoryResult.rows[0].id
                )
                : null;

        // ======================================
        // DUPLICATE EMPLOYEE ID
        // PORTAL
        // ======================================

        const duplicatePortalEmployee =
            await client.query(
                `
                SELECT
                    id::int AS id

                FROM portal_users

                WHERE
                    employee_id = $1

                    AND
                    id <> $2

                LIMIT 1
                `,
                [
                    employeeId,
                    currentUser.id,
                ]
            );

        if (
            duplicatePortalEmployee.rowCount &&
            duplicatePortalEmployee.rowCount > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "This Employee ID is already used by another Portal user.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // DUPLICATE EMAIL
        // ======================================

        const duplicateEmail =
            await client.query(
                `
                SELECT
                    id::int AS id

                FROM portal_users

                WHERE
                    LOWER(
                        official_email
                    ) = LOWER($1)

                    AND
                    id <> $2

                LIMIT 1
                `,
                [
                    officialEmail,
                    currentUser.id,
                ]
            );

        if (
            duplicateEmail.rowCount &&
            duplicateEmail.rowCount > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "This Official Email is already used by another Portal user.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // DUPLICATE INVENTORY EMPLOYEE ID
        // ======================================

        const inventoryDuplicateValues:
            unknown[] = [
                employeeId,
            ];

        let inventoryDuplicateWhere =
            `
            employee_id = $1
            `;

        if (
            currentInventoryId
        ) {
            inventoryDuplicateValues.push(
                currentInventoryId
            );

            inventoryDuplicateWhere +=
                `
                AND id <> $2
                `;
        }

        const duplicateInventoryEmployee =
            await client.query(
                `
                SELECT
                    id::int AS id,

                    portal_user_id::int
                        AS portal_user_id,

                    full_name

                FROM inventory_users

                WHERE
                    ${inventoryDuplicateWhere}

                LIMIT 1
                `,
                inventoryDuplicateValues
            );

        if (
            duplicateInventoryEmployee.rowCount &&
            duplicateInventoryEmployee.rowCount > 0
        ) {
            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "This Employee ID already exists in Inventory for another employee.",
                },
                {
                    status: 409,
                }
            );
        }

        // ======================================
        // UPDATE PORTAL PROFILE
        // ======================================

        await client.query(
            `
            UPDATE portal_users

            SET
                employee_id =
                    $2,

                full_name =
                    $3,

                designation =
                    NULLIF(
                        $4,
                        ''
                    ),

                department =
                    NULLIF(
                        $5,
                        ''
                    ),

                official_email =
                    $6

            WHERE id = $1
            `,
            [
                currentUser.id,
                employeeId,
                fullName,
                designation,
                department,
                officialEmail,
            ]
        );

        // ======================================
        // UPDATE INVENTORY PROFILE
        // ======================================

        if (
            currentInventoryId
        ) {
            await client.query(
                `
                UPDATE inventory_users

                SET
                    portal_user_id =
                        $2,

                    employee_id =
                        $3,

                    full_name =
                        $4,

                    designation =
                        NULLIF(
                            $5,
                            ''
                        ),

                    department =
                        NULLIF(
                            $6,
                            ''
                        ),

                    mobile_no =
                        NULLIF(
                            $7,
                            ''
                        ),

                    user_location =
                        NULLIF(
                            $8,
                            ''
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $1
                `,
                [
                    currentInventoryId,
                    currentUser.id,
                    employeeId,
                    fullName,
                    designation,
                    department,
                    mobileNo,
                    userLocation,
                ]
            );

        } else {

            // ==================================
            // CREATE LINKED INVENTORY PROFILE
            // ==================================

            const createdInventory =
                await client.query(
                    `
                    INSERT INTO inventory_users (
                        portal_user_id,
                        employee_id,
                        full_name,
                        designation,
                        department,
                        mobile_no,
                        user_location,
                        created_by
                    )

                    VALUES (
                        $1,
                        $2,
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
                        $1
                    )

                    RETURNING
                        id::int AS id
                    `,
                    [
                        currentUser.id,
                        employeeId,
                        fullName,
                        designation,
                        department,
                        mobileNo,
                        userLocation,
                    ]
                );

            if (
                createdInventory.rowCount ===
                0
            ) {
                throw new Error(
                    "Unable to create inventory profile."
                );
            }
        }

        // ======================================
        // GET UPDATED PROFILE
        // ======================================

        const updatedResult =
            await client.query(
                `
                SELECT
                    pu.id::int
                        AS portal_user_id,

                    pu.employee_id,

                    pu.full_name,

                    pu.designation,

                    pu.department,

                    pu.official_email,

                    pu.role,

                    pu.account_status,

                    iu.id::int
                        AS inventory_user_id,

                    iu.mobile_no,

                    iu.user_location

                FROM portal_users pu

                LEFT JOIN inventory_users iu
                    ON iu.portal_user_id =
                       pu.id

                WHERE
                    pu.id = $1

                LIMIT 1
                `,
                [
                    currentUser.id,
                ]
            );

        await client.query(
            "COMMIT"
        );

        const updatedProfile =
            updatedResult.rows[0];

        // ======================================
        // AUDIT LOG
        // ======================================

        try {
            await writeAuditLog({
                userId:
                    currentUser.id,

                action:
                    "UPDATE_OWN_PROFILE",

                module:
                    "PROFILE",

                recordType:
                    "PORTAL_USER",

                recordId:
                    currentUser.id,

                description:
                    `${fullName} updated own Portal profile.`,

                metadata: {
                    before: {
                        employeeId:
                            oldProfile.employee_id,

                        fullName:
                            oldProfile.full_name,

                        designation:
                            oldProfile.designation,

                        department:
                            oldProfile.department,

                        officialEmail:
                            oldProfile.official_email,

                        mobileNo:
                            inventoryResult.rowCount &&
                            inventoryResult.rowCount > 0
                                ? inventoryResult
                                    .rows[0]
                                    .mobile_no
                                : null,

                        userLocation:
                            inventoryResult.rowCount &&
                            inventoryResult.rowCount > 0
                                ? inventoryResult
                                    .rows[0]
                                    .user_location
                                : null,
                    },

                    after: {
                        employeeId,

                        fullName,

                        designation:
                            designation ||
                            null,

                        department:
                            department ||
                            null,

                        officialEmail,

                        mobileNo:
                            mobileNo ||
                            null,

                        userLocation:
                            userLocation ||
                            null,
                    },
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
                "Profile audit error:",
                auditError
            );
        }

        return Response.json({
            success: true,

            message:
                "Profile updated successfully.",

            profile:
                updatedProfile,
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
            "Update profile error:",
            error
        );

        const pgCode =
            (
                error as {
                    code?: string;
                }
            )?.code;

        if (
            pgCode ===
            "23505"
        ) {
            return Response.json(
                {
                    success: false,

                    message:
                        "Employee ID or Official Email is already being used by another account.",
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
                    "Unable to update profile.",
            },
            {
                status: 500,
            }
        );

    } finally {
        client.release();
    }
}