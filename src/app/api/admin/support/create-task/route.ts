import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createNotificationSafe } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITIES = [
    "LOW",
    "NORMAL",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
] as const;

// ==========================================
// CURRENT ADMIN
// ==========================================

async function getCurrentAdmin() {

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
                role,
                account_status

            FROM portal_users

            WHERE
                id = $1
                AND account_status = 'ACTIVE'
                AND role IN (
                    'ADMIN',
                    'SUPER_ADMIN'
                )

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
// OPTIONAL NUMBER
// ==========================================

function parseOptionalNumber(
    value: unknown
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed =
        Number(value);

    if (
        !Number.isInteger(
            parsed
        ) ||
        parsed <= 0
    ) {
        return null;
    }

    return parsed;
}

// ==========================================
// GET FORM DATA
// ==========================================

export async function GET(
    request: Request
) {

    try {

        const admin =
            await getCurrentAdmin();

        if (!admin) {

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

        const url =
            new URL(
                request.url
            );

        const rawInventoryUserId =
            url.searchParams.get(
                "inventoryUserId"
            );

        const inventoryUserId =
            rawInventoryUserId
                ? Number(
                    rawInventoryUserId
                )
                : null;

        // ======================================
        // INVENTORY EMPLOYEES
        // ======================================

        const employeeResult =
            await db.query(
                `
                SELECT
                    iu.id::int
                        AS inventory_user_id,

                    iu.portal_user_id::int
                        AS portal_user_id,

                    iu.employee_id,

                    iu.full_name,

                    iu.designation,

                    iu.department,

                    iu.mobile_no,

                    iu.user_location,

                    pu.official_email,

                    pu.account_status
                        AS portal_account_status,

                    CASE
                        WHEN
                            iu.portal_user_id
                            IS NULL
                        THEN
                            'NO_PORTAL_ACCOUNT'

                        WHEN
                            pu.account_status =
                            'ACTIVE'
                        THEN
                            'ACTIVE'

                        ELSE
                            COALESCE(
                                pu.account_status,
                                'NO_PORTAL_ACCOUNT'
                            )
                    END
                        AS portal_status

                FROM inventory_users iu

                LEFT JOIN portal_users pu
                    ON pu.id =
                       iu.portal_user_id

                ORDER BY
                    iu.full_name ASC,
                    iu.employee_id ASC
                `
            );

        // ======================================
        // ACTIVE IT SUPPORT STAFF
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

                    s.can_receive_tickets,

                    pu.employee_id,

                    pu.full_name,

                    pu.designation,

                    pu.department

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
        // EMPLOYEE CURRENT DEVICES
        // ======================================

        let assets: unknown[] =
            [];

        if (
            inventoryUserId !== null &&
            Number.isInteger(
                inventoryUserId
            ) &&
            inventoryUserId > 0
        ) {

            const assetResult =
                await db.query(
                    `
                    SELECT
                        ia.id::int
                            AS id,

                        ia.asset_code,

                        ia.brand,

                        ia.model,

                        ia.serial_number,

                        ia.asset_status,

                        ic.category_name,

                        ass.is_primary_computer

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

                        AND
                        ass.assignment_status =
                            'ACTIVE'

                    ORDER BY
                        ass.is_primary_computer DESC,
                        ic.display_order ASC,
                        ia.asset_code ASC
                    `,
                    [
                        inventoryUserId,
                    ]
                );

            assets =
                assetResult.rows;
        }

        return Response.json({
            success: true,

            admin,

            employees:
                employeeResult.rows,

            staff:
                staffResult.rows,

            assets,
        });

    } catch (error) {

        console.error(
            "Load Admin support task form error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to load support task form data.",
            },
            {
                status: 500,
            }
        );
    }
}

// ==========================================
// CREATE IT SUPPORT TASK
// ==========================================

export async function POST(
    request: Request
) {

    const client =
        await db.connect();

    try {

        const admin =
            await getCurrentAdmin();

        if (!admin) {

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
        // REQUESTER MODE
        //
        // EXISTING = Inventory Employee
        // MANUAL   = No Inventory / Portal
        // ======================================

        const requestedMode =
            String(
                body.requesterMode ||
                body.requesterType ||
                ""
            )
                .trim()
                .toUpperCase();

        /*
         * Backward compatibility:
         * previous versions used
         * createNewEmployee.
         */

        const manualRequester =
            requestedMode ===
            "MANUAL" ||
            body.manualRequester ===
            true ||
            body.createNewEmployee ===
            true;

        // ======================================
        // EXISTING EMPLOYEE INPUT
        // ======================================

        const inventoryUserIdInput =
            parseOptionalNumber(
                body.inventoryUserId
            );

        // ======================================
        // MANUAL REQUESTER INPUT
        // ======================================

        const manualData =
            body.manualEmployee ||
            body.manualRequesterDetails ||
            body.newEmployee ||
            {};

        const manualEmployeeId =
            String(
                manualData.employeeId ||
                ""
            ).trim();

        const manualName =
            String(
                manualData.fullName ||
                manualData.name ||
                ""
            ).trim();

        const manualDesignation =
            String(
                manualData.designation ||
                ""
            ).trim();

        const manualDepartment =
            String(
                manualData.department ||
                ""
            ).trim();

        const manualLocation =
            String(
                manualData.userLocation ||
                manualData.location ||
                ""
            ).trim();

        const manualMobile =
            String(
                manualData.mobileNo ||
                manualData.mobile ||
                ""
            ).trim();

        // ======================================
        // TICKET DATA
        // ======================================

        const assetId =
            parseOptionalNumber(
                body.assetId
            );

        const assignedTo =
            parseOptionalNumber(
                body.assignedTo
            );

        // ======================================
        // TNA
        // ======================================

        const tnaAt =
            String(
                body.tnaAt ||
                ""
            ).trim();

        const subject =
            String(
                body.subject ||
                ""
            ).trim();

        const issueCategory =
            String(
                body.issueCategory ||
                ""
            ).trim();

        const problemDescription =
            String(
                body.problemDescription ||
                ""
            ).trim();

        const priority =
            String(
                body.priority ||
                "NORMAL"
            )
                .trim()
                .toUpperCase();

        // ======================================
        // REQUESTER VALIDATION
        // ======================================

        if (
            !manualRequester &&
            !inventoryUserIdInput
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Please select an employee.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            manualRequester &&
            !manualEmployeeId
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Employee ID is required for a manual employee.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            manualRequester &&
            !manualName
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Employee name is required for a manual employee.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // TICKET VALIDATION
        // ======================================

        if (!subject) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Task subject is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            subject.length >
            250
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Subject cannot exceed 250 characters.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !problemDescription
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Task description is required.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !PRIORITIES.includes(
                priority as
                typeof PRIORITIES[number]
            )
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid priority.",
                },
                {
                    status: 400,
                }
            );
        }

        // ======================================
        // TNA VALIDATION
        //
        // TNA IS REQUIRED ONLY WHEN
        // AN ENGINEER IS ASSIGNED.
        // ======================================

        if (
            assignedTo !== null &&
            !tnaAt
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "Please enter TNA date and time for the assigned IT Engineer.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            assignedTo !== null
        ) {

            const tnaPattern =
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

            if (
                !tnaPattern.test(
                    tnaAt
                )
            ) {

                return Response.json(
                    {
                        success: false,

                        message:
                            "Invalid TNA date and time.",
                    },
                    {
                        status: 400,
                    }
                );
            }
        }

        // ======================================
        // MANUAL REQUESTER CANNOT HAVE
        // INVENTORY ASSET AT CREATION
        // ======================================

        if (
            manualRequester &&
            assetId !== null
        ) {

            return Response.json(
                {
                    success: false,

                    message:
                        "A manual employee cannot have an Inventory device selected.",
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
        // REQUESTER DATA
        // ======================================

        let inventoryUserId:
            | number
            | null =
            null;

        let employeePortalUserId:
            | number
            | null =
            null;

        let portalAccountStatus:
            | string
            | null =
            null;

        let requesterEmployeeId:
            | string
            | null =
            null;

        let requesterName =
            "";

        let requesterDesignation:
            | string
            | null =
            null;

        let requesterDepartment:
            | string
            | null =
            null;

        let requesterLocation:
            | string
            | null =
            null;

        let requesterMobile:
            | string
            | null =
            null;

        // ======================================
        // MANUAL REQUESTER
        // ======================================

        if (
            manualRequester
        ) {

            // ==================================
            // DO NOT ALLOW MANUAL MODE IF
            // EMPLOYEE ALREADY EXISTS
            // ==================================

            const duplicateResult =
                await client.query(
                    `
                    SELECT
                        id::int AS id,
                        employee_id,
                        full_name

                    FROM inventory_users

                    WHERE
                        employee_id = $1

                    LIMIT 1
                    `,
                    [
                        manualEmployeeId,
                    ]
                );

            if (
                duplicateResult.rowCount &&
                duplicateResult.rowCount >
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );

                const existingEmployee =
                    duplicateResult.rows[0];

                return Response.json(
                    {
                        success: false,

                        message:
                            `Employee ID ${manualEmployeeId} already exists in Inventory as ${existingEmployee.full_name}. Please select the existing employee instead.`,
                    },
                    {
                        status: 409,
                    }
                );
            }

            inventoryUserId =
                null;

            employeePortalUserId =
                null;

            portalAccountStatus =
                null;

            requesterEmployeeId =
                manualEmployeeId;

            requesterName =
                manualName;

            requesterDesignation =
                manualDesignation ||
                null;

            requesterDepartment =
                manualDepartment ||
                null;

            requesterLocation =
                manualLocation ||
                null;

            requesterMobile =
                manualMobile ||
                null;

        } else {

            // ==================================
            // EXISTING INVENTORY EMPLOYEE
            // ==================================

            const employeeResult =
                await client.query(
                    `
                    SELECT
                        iu.id::int
                            AS inventory_user_id,

                        iu.portal_user_id::int
                            AS portal_user_id,

                        iu.employee_id,

                        iu.full_name,

                        iu.designation,

                        iu.department,

                        iu.mobile_no,

                        iu.user_location,

                        pu.account_status
                            AS portal_account_status

                    FROM inventory_users iu

                    LEFT JOIN portal_users pu
                        ON pu.id =
                           iu.portal_user_id

                    WHERE
                        iu.id = $1

                    LIMIT 1
                    `,
                    [
                        inventoryUserIdInput,
                    ]
                );

            if (
                employeeResult.rowCount ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Selected employee was not found.",
                    },
                    {
                        status: 404,
                    }
                );
            }

            const employee =
                employeeResult.rows[0];

            inventoryUserId =
                employee.inventory_user_id;

            employeePortalUserId =
                employee.portal_user_id;

            portalAccountStatus =
                employee.portal_account_status;

            requesterEmployeeId =
                employee.employee_id;

            requesterName =
                employee.full_name;

            requesterDesignation =
                employee.designation;

            requesterDepartment =
                employee.department;

            requesterLocation =
                employee.user_location;

            requesterMobile =
                employee.mobile_no;
        }

        // ======================================
        // VERIFY DEVICE
        // ======================================

        if (
            body.assetId !== null &&
            body.assetId !== undefined &&
            body.assetId !== "" &&
            assetId === null
        ) {

            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid device.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            assetId !== null
        ) {

            if (
                inventoryUserId ===
                null
            ) {

                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Manual employee cannot use an Inventory device.",
                    },
                    {
                        status: 400,
                    }
                );
            }

            const assetResult =
                await client.query(
                    `
                    SELECT
                        ia.id::int AS id,
                        ia.asset_code

                    FROM inventory_assignments ass

                    INNER JOIN inventory_assets ia
                        ON ia.id =
                           ass.asset_id

                    WHERE
                        ass.inventory_user_id =
                            $1

                        AND
                        ass.asset_id =
                            $2

                        AND
                        ass.assignment_status =
                            'ACTIVE'

                    LIMIT 1
                    `,
                    [
                        inventoryUserId,
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
                            "Selected device is not currently assigned to this employee.",
                    },
                    {
                        status: 403,
                    }
                );
            }
        }

        // ======================================
        // VERIFY IT SUPPORT STAFF
        // ======================================

        let supportStaff:
            | {
                portal_user_id: number;

                full_name: string;

                employee_id:
                | string
                | null;

                staff_title:
                | string
                | null;
            }
            | null =
            null;

        if (
            body.assignedTo !== null &&
            body.assignedTo !== undefined &&
            body.assignedTo !== "" &&
            assignedTo === null
        ) {

            await client.query(
                "ROLLBACK"
            );

            return Response.json(
                {
                    success: false,

                    message:
                        "Invalid IT Support Staff.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            assignedTo !== null
        ) {

            const staffResult =
                await client.query(
                    `
                    SELECT
                        s.portal_user_id::int
                            AS portal_user_id,

                        s.staff_title,

                        pu.employee_id,

                        pu.full_name

                    FROM it_support_staff s

                    INNER JOIN portal_users pu
                        ON pu.id =
                           s.portal_user_id

                    WHERE
                        s.portal_user_id =
                            $1

                        AND
                        s.is_active =
                            TRUE

                        AND
                        s.can_receive_tickets =
                            TRUE

                        AND
                        pu.account_status =
                            'ACTIVE'

                    LIMIT 1
                    `,
                    [
                        assignedTo,
                    ]
                );

            if (
                staffResult.rowCount ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );

                return Response.json(
                    {
                        success: false,

                        message:
                            "Selected IT Support Staff is not available.",
                    },
                    {
                        status: 404,
                    }
                );
            }

            supportStaff =
                staffResult.rows[0];
        }

        // ======================================
        // INITIAL STATUS
        // ======================================

        const initialStatus =
            supportStaff
                ? "ASSIGNED"
                : "OPEN";

        // ======================================
        // CREATE TICKET
        // ======================================

        const ticketResult =
            await client.query(
                `
                INSERT INTO it_support_tickets (

                    inventory_user_id,

                    requester_employee_id,
                    requester_name,
                    requester_designation,
                    requester_department,
                    requester_location,
                    requester_mobile,

                    asset_id,

                    subject,
                    issue_category,
                    problem_description,

                    priority,
                    ticket_status,

                    created_by,

                    assigned_to,
                    assigned_by,
                    assigned_at,
                    tna_at

                )

                VALUES (

                    $1,

                    NULLIF(
                        $2,
                        ''
                    ),

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

                    $8,

                    $9,

                    NULLIF(
                        $10,
                        ''
                    ),

                    $11,

                    $12,
                    $13,

                    $14,

                    $15,
                    $16,

                    CASE
                        WHEN
                            $15::bigint
                            IS NOT NULL
                        THEN
                            CURRENT_TIMESTAMP
                        ELSE
                            NULL
                    END,

                    CASE
                        WHEN
                            $15::bigint
                            IS NOT NULL
                        THEN
                            $17::timestamp
                        ELSE
                            NULL
                    END
                )

                RETURNING
                    id::int AS id,
                    opened_at
                `,
                [
                    inventoryUserId,

                    manualRequester
                        ? requesterEmployeeId
                        : null,

                    manualRequester
                        ? requesterName
                        : null,

                    manualRequester
                        ? requesterDesignation
                        : null,

                    manualRequester
                        ? requesterDepartment
                        : null,

                    manualRequester
                        ? requesterLocation
                        : null,

                    manualRequester
                        ? requesterMobile
                        : null,

                    assetId,

                    subject,

                    issueCategory,

                    problemDescription,

                    priority,

                    initialStatus,

                    admin.id,

                    supportStaff
                        ? supportStaff.portal_user_id
                        : null,

                    supportStaff
                        ? admin.id
                        : null,

                    supportStaff
                        ? tnaAt
                        : null,
                ]
            );

        const ticket =
            ticketResult.rows[0];

        // ======================================
        // GENERATE TICKET NUMBER
        // ======================================

        const ticketNoResult =
            await client.query(
                `
                UPDATE it_support_tickets

                SET
                    ticket_no =
                        'IT-'
                        ||
                        EXTRACT(
                            YEAR FROM (
                                opened_at
                                AT TIME ZONE
                                'Asia/Dhaka'
                            )
                        )::int
                        ||
                        '-'
                        ||
                        LPAD(
                            id::text,
                            6,
                            '0'
                        ),

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE
                    id = $1

                RETURNING
                    id::int AS id,

                    ticket_no,

                    inventory_user_id::int
                        AS inventory_user_id,

                    requester_employee_id,

                    requester_name,

                    requester_designation,

                    requester_department,

                    requester_location,

                    requester_mobile,

                    asset_id::int
                        AS asset_id,

                    subject,

                    issue_category,

                    problem_description,

                    priority,

                    ticket_status,

                    assigned_to::int
                        AS assigned_to,

                    created_by::int
                        AS created_by,

                    opened_at,

                    assigned_at,

                    tna_at,

                    created_at
                `,
                [
                    ticket.id,
                ]
            );

        const createdTicket =
            ticketNoResult.rows[0];

        // ======================================
        // INITIAL COMMENT
        // ======================================

        let initialComment =
            "IT Support task created by Admin.";

        if (
            supportStaff
        ) {

            initialComment =
                `IT Support task created by Admin and assigned to ${supportStaff.full_name}. TNA: ${tnaAt.replace(
                    "T",
                    " "
                )}.`;
        }

        if (
            manualRequester
        ) {

            initialComment +=
                ` Manual/unregistered employee: ${requesterEmployeeId} - ${requesterName}. No Inventory or Portal user was created.`;

        } else if (
            !employeePortalUserId ||
            portalAccountStatus !==
            "ACTIVE"
        ) {

            initialComment +=
                " Employee does not currently have an active Portal account.";
        }

        await client.query(
            `
            INSERT INTO it_support_comments (
                ticket_id,
                commented_by,
                comment_text
            )

            VALUES (
                $1,
                $2,
                $3
            )
            `,
            [
                createdTicket.id,
                admin.id,
                initialComment,
            ]
        );

        await client.query(
            "COMMIT"
        );

        // ======================================
        // EMPLOYEE NOTIFICATION
        //
        // MANUAL REQUESTER HAS NO PORTAL USER
        // ======================================

        const canNotifyEmployee =
            !manualRequester &&
            Boolean(
                employeePortalUserId
            ) &&
            portalAccountStatus ===
            "ACTIVE";

        if (
            canNotifyEmployee &&
            employeePortalUserId
        ) {

            await createNotificationSafe({

                recipientUserId:
                    employeePortalUserId,

                actorUserId:
                    admin.id,

                module:
                    "IT_SUPPORT",

                notificationType:
                    "IT_SUPPORT_TASK_CREATED",

                title:
                    "New IT Support Task",

                message:
                    `${createdTicket.ticket_no} - ${createdTicket.subject}`,

                referenceType:
                    "IT_SUPPORT_TICKET",

                referenceId:
                    createdTicket.id,

                linkUrl:
                    `/support?ticket=${createdTicket.id}`,
            });
        }

        // ======================================
        // ENGINEER NOTIFICATION
        // ======================================

        if (
            supportStaff
        ) {

            await createNotificationSafe({

                recipientUserId:
                    supportStaff.portal_user_id,

                actorUserId:
                    admin.id,

                module:
                    "IT_SUPPORT",

                notificationType:
                    "IT_SUPPORT_TICKET_ASSIGNED",

                title:
                    "New IT Support Task Assigned",

                message:
                    `${createdTicket.ticket_no} - ${requesterName}: ${createdTicket.subject} | TNA: ${tnaAt.replace(
                        "T",
                        " "
                    )}`,

                referenceType:
                    "IT_SUPPORT_TICKET",

                referenceId:
                    createdTicket.id,

                linkUrl:
                    `/support/assigned?ticket=${createdTicket.id}`,
            });
        }

        // ======================================
        // AUDIT LOG
        // ======================================

        try {

            await writeAuditLog({

                userId:
                    admin.id,

                action:
                    "ADMIN_CREATE_IT_SUPPORT_TASK",

                module:
                    "IT_SUPPORT",

                recordType:
                    "IT_SUPPORT_TICKET",

                recordId:
                    createdTicket.id,

                description:
                    `Admin created IT support task "${createdTicket.ticket_no}" for ${requesterName}.`,

                metadata: {

                    ticketNo:
                        createdTicket.ticket_no,

                    requesterMode:
                        manualRequester
                            ? "MANUAL"
                            : "EXISTING",

                    inventoryUserId,

                    employeePortalUserId,

                    employeePortalStatus:
                        portalAccountStatus,

                    employeeId:
                        requesterEmployeeId,

                    employeeName:
                        requesterName,

                    designation:
                        requesterDesignation,

                    department:
                        requesterDepartment,

                    location:
                        requesterLocation,

                    mobile:
                        requesterMobile,

                    assetId,

                    subject:
                        createdTicket.subject,

                    issueCategory:
                        createdTicket.issue_category,

                    priority:
                        createdTicket.priority,

                    initialStatus:
                        createdTicket.ticket_status,

                    assignedTo:
                        supportStaff
                            ? supportStaff.portal_user_id
                            : null,

                    assignedToName:
                        supportStaff
                            ? supportStaff.full_name
                            : null,

                    tnaAt:
                        supportStaff
                            ? createdTicket.tna_at
                            : null,
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
                "Admin create IT task audit error:",
                auditError
            );
        }

        // ======================================
        // RESPONSE
        // ======================================

        let responseMessage =
            supportStaff
                ? "IT Support task created and assigned successfully."
                : "IT Support task created successfully.";

        if (
            manualRequester
        ) {

            responseMessage +=
                " Manual employee details were saved with the ticket. No Inventory user was created.";

        } else if (
            !canNotifyEmployee
        ) {

            responseMessage +=
                " Employee has no active Portal account, so no employee notification was sent.";
        }

        return Response.json(
            {
                success: true,

                message:
                    responseMessage,

                requesterMode:
                    manualRequester
                        ? "MANUAL"
                        : "EXISTING",

                employeeNotificationSent:
                    canNotifyEmployee,

                requester: {

                    inventoryUserId,

                    employeeId:
                        requesterEmployeeId,

                    fullName:
                        requesterName,

                    designation:
                        requesterDesignation,

                    department:
                        requesterDepartment,

                    location:
                        requesterLocation,

                    mobile:
                        requesterMobile,

                    portalUserId:
                        employeePortalUserId,
                },

                ticket:
                    createdTicket,
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
            "Admin create IT support task error:",
            error
        );

        return Response.json(
            {
                success: false,

                message:
                    "Unable to create IT Support task.",
            },
            {
                status: 500,
            }
        );

    } finally {

        client.release();
    }
}