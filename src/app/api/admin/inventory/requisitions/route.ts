import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function authorized() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auko_session")?.value;

    if (!token) return false;

    const session = await verifySessionToken(token);

    return Boolean(
        session &&
        ["ADMIN", "SUPER_ADMIN"].includes(session.role)
    );
}

function clean(value: unknown, max = 500) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

function validate(data: Record<string, unknown>) {
    const item = clean(data.item, 200);
    const qty = Number(data.qty);
    const requisitionBy = clean(data.requisition_by, 200);
    const date = clean(data.requisition_date, 10);
    const status = clean(data.status, 30);

    if (
        !item ||
        !requisitionBy ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isInteger(qty) ||
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
        requisition_by: requisitionBy,
        requisition_for: clean(data.requisition_for, 5000),
        on_hold_for: clean(data.on_hold_for, 5000),
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

// GET - List requisitions
export async function GET() {
    if (!(await authorized())) {
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
                GREATEST(
                    CURRENT_DATE - requisition_date,
                    0
                )::integer AS due_days
            FROM it_requisitions
            ORDER BY requisition_date DESC, id DESC
        `);

        return NextResponse.json({
            requisitions: result.rows,
        });
    } catch (error) {
        console.error("GET requisitions:", error);

        return NextResponse.json(
            { error: "Unable to load requisitions" },
            { status: 500 }
        );
    }
}

// POST - Add requisition
export async function POST(request: NextRequest) {
    if (!(await authorized())) {
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
                { error: "Invalid requisition information" },
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
                $1,$2,$3,$4,$5,$6,$7,$8,$9
            )
            RETURNING id::text AS id
            `,
            [
                data.requisition_date,
                data.item,
                data.model,
                data.qty,
                data.requisition_by,
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
        console.error("POST requisition:", error);

        return NextResponse.json(
            { error: "Unable to create requisition" },
            { status: 500 }
        );
    }
}

// PATCH - Update requisition
export async function PATCH(request: NextRequest) {
    if (!(await authorized())) {
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
                { error: "Invalid requisition information" },
                { status: 400 }
            );
        }

        const result = await db.query(
            `
            UPDATE it_requisitions
            SET
                requisition_date = $1,
                item = $2,
                model = $3,
                qty = $4,
                requisition_by = $5,
                requisition_for = $6,
                on_hold_for = $7,
                status = $8,
                remarks = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING id
            `,
            [
                data.requisition_date,
                data.item,
                data.model,
                data.qty,
                data.requisition_by,
                data.requisition_for,
                data.on_hold_for,
                data.status,
                data.remarks,
                id,
            ]
        );

        if (result.rowCount === 0) {
            return NextResponse.json(
                { error: "Requisition not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH requisition:", error);

        return NextResponse.json(
            { error: "Unable to update requisition" },
            { status: 500 }
        );
    }
}

// DELETE - Remove requisition
export async function DELETE(request: NextRequest) {
    if (!(await authorized())) {
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
            { error: "Invalid requisition ID" },
            { status: 400 }
        );
    }

    try {
        const result = await db.query(
            "DELETE FROM it_requisitions WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json(
                { error: "Requisition not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE requisition:", error);

        return NextResponse.json(
            { error: "Unable to delete requisition" },
            { status: 500 }
        );
    }
}