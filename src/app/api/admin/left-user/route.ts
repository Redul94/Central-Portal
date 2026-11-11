
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEXT_COLUMNS = [
    "section_name",
    "user_name",
    "designation",
    "department",
    "mobile_no",
    "user_location",
    "computer_management_status",
    "data_backup_status",
    "sim_handover_status",
    "email_management",
    "whatsapp_management",
    "pending_requirements",
    "service_ensured_by",
    "remarks",
] as const;

const NUMBER_COLUMNS = [
    "desktop_set",
    "laptop",
    "aio",
] as const;

const DATA_COLUMNS = [
    "movement_type",
    ...TEXT_COLUMNS,
    ...NUMBER_COLUMNS,
    "join_left_date",
] as const;

async function getAdmin() {
    const store = await cookies();

    const token =
        store.get("auko_session")?.value;

    const session = token
        ? await verifySessionToken(token)
        : null;

    return session &&
        ["ADMIN", "SUPER_ADMIN"].includes(session.role)
        ? session
        : null;
}

function sameOrigin(request: NextRequest) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!origin || !host) return false;

    try {
        const parsed = new URL(origin);

        return (
            ["http:", "https:"].includes(parsed.protocol) &&
            parsed.host.toLowerCase() === host.toLowerCase()
        );
    } catch {
        return false;
    }
}

function parseData(
    body: unknown
): Record<string, string | number> | null {
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        return null;
    }

    const raw = body as Record<string, unknown>;

    const movement_type = raw.movement_type;

    if (
        movement_type !== "LEFT" &&
        movement_type !== "NEW_JOIN"
    ) {
        return null;
    }

    const result: Record<string, string | number> = {
        movement_type,
    };

    for (const key of TEXT_COLUMNS) {
        if (
            raw[key] != null &&
            typeof raw[key] !== "string"
        ) {
            return null;
        }

        const max =
            key === "remarks" ||
                key === "pending_requirements"
                ? 5000
                : 200;

        result[key] = String(raw[key] ?? "")
            .trim()
            .slice(0, max);
    }

    if (!result.user_name) return null;

    for (const key of NUMBER_COLUMNS) {
        const value = Number(raw[key] ?? 0);

        if (
            !Number.isSafeInteger(value) ||
            value < 0 ||
            value > 1000000
        ) {
            return null;
        }

        result[key] = value;
    }

    const date = raw.join_left_date;

    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return null;
    }

    const parsed = new Date(
        `${date}T00:00:00.000Z`
    );

    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
    ) {
        return null;
    }

    result.join_left_date = date;

    return result;
}

function idFrom(value: unknown) {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

// ============================================
// GET - LIST RECORDS
// ============================================

export async function GET() {
    if (!(await getAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const result = await db.query(`
            SELECT
                id::text AS id,
                movement_type,
                section_name,
                user_name,
                designation,
                department,
                mobile_no,
                user_location,
                desktop_set,
                laptop,
                aio,
                TO_CHAR(
                    join_left_date,
                    'YYYY-MM-DD'
                ) AS join_left_date,
                computer_management_status,
                data_backup_status,
                sim_handover_status,
                email_management,
                whatsapp_management,
                pending_requirements,
                service_ensured_by,
                remarks,
                created_by
            FROM it_left_users
            ORDER BY id ASC
        `);

        return NextResponse.json(
            { records: result.rows },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error("GET left users:", error);

        return NextResponse.json(
            {
                error: "Unable to load Left User records",
            },
            { status: 500 }
        );
    }
}

// ============================================
// POST - CREATE RECORD
// ============================================

export async function POST(request: NextRequest) {
    const session = await getAdmin();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!sameOrigin(request)) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
        );
    }

    try {
        const data = parseData(await request.json());

        if (!data) {
            return NextResponse.json(
                { error: "Invalid or missing record fields" },
                { status: 400 }
            );
        }

        const values = DATA_COLUMNS.map(
            (key) => data[key]
        );

        const params = DATA_COLUMNS.map(
            (_, i) => `$${i + 1}`
        ).join(", ");

        const result = await db.query(
            `
            INSERT INTO it_left_users (
                ${DATA_COLUMNS.join(", ")},
                created_by
            )
            VALUES (
                ${params},
                $${DATA_COLUMNS.length + 1}
            )
            RETURNING id::text AS id
            `,
            [
                ...values,
                session.fullName || "Admin",
            ]
        );

        return NextResponse.json(
            {
                success: true,
                id: result.rows[0].id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST left user:", error);

        return NextResponse.json(
            { error: "Unable to create record" },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH - UPDATE RECORD
// ============================================

export async function PATCH(request: NextRequest) {
    if (!(await getAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!sameOrigin(request)) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();

        const id = idFrom(body?.id);
        const data = parseData(body);

        if (!id || !data) {
            return NextResponse.json(
                { error: "Invalid record" },
                { status: 400 }
            );
        }

        const assignments = DATA_COLUMNS.map(
            (key, i) => `${key} = $${i + 1}`
        ).join(", ");

        const result = await db.query(
            `
            UPDATE it_left_users
            SET
                ${assignments},
                updated_at = NOW()
            WHERE id = $${DATA_COLUMNS.length + 1}
            RETURNING id
            `,
            [
                ...DATA_COLUMNS.map(
                    (key) => data[key]
                ),
                id,
            ]
        );

        if (!result.rowCount) {
            return NextResponse.json(
                { error: "Record not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("PATCH left user:", error);

        return NextResponse.json(
            { error: "Unable to update record" },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE - REMOVE RECORD
// ============================================

export async function DELETE(request: NextRequest) {
    if (!(await getAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!sameOrigin(request)) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
        );
    }

    const id = idFrom(
        request.nextUrl.searchParams.get("id")
    );

    if (!id) {
        return NextResponse.json(
            { error: "Invalid ID" },
            { status: 400 }
        );
    }

    try {
        const result = await db.query(
            `
            DELETE FROM it_left_users
            WHERE id = $1
            RETURNING id
            `,
            [id]
        );

        if (!result.rowCount) {
            return NextResponse.json(
                { error: "Record not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        console.error("DELETE left user:", error);

        return NextResponse.json(
            { error: "Unable to delete record" },
            { status: 500 }
        );
    }
}
