
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================
// REQUISITION STATUSES
// ============================================

const STATUSES = [
    "PENDING",
    "APPROVED",
    "ORDERED",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "ON_HOLD",
    "CANCELLED",
    "REJECTED",
];

// ============================================
// ADMIN AUTHENTICATION
// ============================================

async function getAdmin() {
    const cookieStore = await cookies();

    const token =
        cookieStore.get("auko_session")?.value;

    if (!token) {
        return null;
    }

    const session = await verifySessionToken(token);

    if (
        !session ||
        !["ADMIN", "SUPER_ADMIN"].includes(session.role)
    ) {
        return null;
    }

    return session;
}

// ============================================
// HELPERS
// ============================================

function clean(value: unknown, max = 500) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

function validDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function validate(data: Record<string, unknown>) {
    const item = clean(data.item, 200);
    const qty = Number(data.qty);
    const date = clean(data.requisition_date, 10);
    const status = clean(data.status, 30);

    if (
        !item ||
        !validDate(date) ||
        !Number.isSafeInteger(qty) ||
        qty <= 0 ||
        !STATUSES.includes(status)
    ) {
        return null;
    }

    return {
        requisition_date: date,
        item,
        model: clean(data.model, 5000),
        qty,
        requisition_for: clean(
            data.requisition_for,
            5000
        ),
        on_hold_for: clean(
            data.on_hold_for,
            5000
        ),
        status,
        remarks: clean(data.remarks, 5000),
    };
}

function validId(value: unknown) {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

// ============================================
// GET - LIST REQUISITIONS
// ============================================

export async function GET() {
    const session = await getAdmin();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const result = await db.query(`
            SELECT
                id::text AS id,
                TO_CHAR(
                    requisition_date,
                    'YYYY-MM-DD'
                ) AS requisition_date,
                item,
                model,
                qty,
                requisition_by,
                requisition_for,
                on_hold_for,
                status,
                remarks,
                CASE
    WHEN status = 'RECEIVED' THEN
        CASE
            WHEN received_at IS NOT NULL
            THEN GREATEST(
                received_at - requisition_date,
                0
            )
            ELSE NULL
        END
    ELSE GREATEST(
        CURRENT_DATE - requisition_date,
        0
    )
END::integer AS due_days
            FROM it_requisitions
            ORDER BY requisition_date DESC, id DESC
        `);

        return NextResponse.json(
            {
                requisitions: result.rows,
            },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "GET requisitions:",
            error
        );

        return NextResponse.json(
            {
                error: "Unable to load requisitions",
            },
            { status: 500 }
        );
    }
}

// ============================================
// POST - CREATE REQUISITION
// ============================================

export async function POST(request: NextRequest) {
    const session = await getAdmin();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const data = validate(body);

        if (!data) {
            return NextResponse.json(
                {
                    error:
                        "Invalid requisition information",
                },
                { status: 400 }
            );
        }

        // Requisition By is taken from the
        // authenticated administrator session.
        // The frontend cannot override it.

        const requisitionBy = session.fullName;

        if (!requisitionBy?.trim()) {
            return NextResponse.json(
                {
                    error:
                        "Administrator name is unavailable",
                },
                { status: 400 }
            );
        }

        const result = await db.query(
            `
            INSERT INTO it_requisitions (
                requisition_date,
                item,
                model,
                qty,
                requisition_by,
                requisition_for,
                on_hold_for,
                status,
                remarks
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9
            )
            RETURNING id::text AS id
            `,
            [
                data.requisition_date,
                data.item,
                data.model,
                data.qty,
                requisitionBy,
                data.requisition_for,
                data.on_hold_for,
                data.status,
                data.remarks,
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
        console.error(
            "POST requisition:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Unable to create requisition",
            },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH - UPDATE REQUISITION
// ============================================

export async function PATCH(request: NextRequest) {
    const session = await getAdmin();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        const id = validId(body.id);
        const data = validate(body);

        if (!id || !data) {
            return NextResponse.json(
                {
                    error:
                        "Invalid requisition information",
                },
                { status: 400 }
            );
        }

        // IMPORTANT:
        // requisition_by is intentionally excluded
        // from UPDATE.
        //
        // This preserves the original administrator
        // who created the requisition.


        const result = await db.query(
            `
    UPDATE it_requisitions
    SET
        requisition_date = $1,
        item = $2,
        model = $3,
        qty = $4,
        requisition_for = $5,
        on_hold_for = $6,

        received_at = CASE
            WHEN $7 = 'RECEIVED'
                 AND status <> 'RECEIVED'
            THEN CURRENT_DATE

            WHEN $7 <> 'RECEIVED'
            THEN NULL

            ELSE received_at
        END,

        status = $7,
        remarks = $8,
        updated_at = NOW()
    WHERE id = $9
    RETURNING id
    `,
            [
                data.requisition_date,
                data.item,
                data.model,
                data.qty,
                data.requisition_for,
                data.on_hold_for,
                data.status,
                data.remarks,
                id,
            ]
        );


        if (result.rowCount === 0) {
            return NextResponse.json(
                {
                    error: "Requisition not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message:
                "Requisition updated successfully",
        });
    } catch (error) {
        console.error(
            "PATCH requisition:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Unable to update requisition",
            },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE - REMOVE REQUISITION
// ============================================

export async function DELETE(request: NextRequest) {
    const session = await getAdmin();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const id = validId(
        request.nextUrl.searchParams.get("id")
    );

    if (!id) {
        return NextResponse.json(
            {
                error: "Invalid requisition ID",
            },
            { status: 400 }
        );
    }

    try {
        const result = await db.query(
            `
            DELETE FROM it_requisitions
            WHERE id = $1
            `,
            [id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json(
                {
                    error: "Requisition not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message:
                "Requisition deleted successfully",
        });
    } catch (error) {
        console.error(
            "DELETE requisition:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Unable to delete requisition",
            },
            { status: 500 }
        );
    }
}
