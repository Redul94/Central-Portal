import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdmin() {
    const store = await cookies();
    const token = store.get("auko_session")?.value;

    if (!token) return null;

    const session = await verifySessionToken(token);

    if (
        !session ||
        !["ADMIN", "SUPER_ADMIN"].includes(session.role)
    ) {
        return null;
    }

    return session;
}

function str(value: unknown, max = 200) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

function validDate(value: string) {
    if (!value) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const d = new Date(value + "T00:00:00Z");

    return (
        !Number.isNaN(d.getTime()) &&
        d.toISOString().slice(0, 10) === value
    );
}

function parseRecord(body: Record<string, unknown>) {
    const record = {
        product_id: str(body.product_id, 100),
        product_name: str(body.product_name),
        serial: str(body.serial),
        name: str(body.name),
        designation: str(body.designation),
        dept: str(body.dept),
        number_desk_location: str(
            body.number_desk_location,
            1000
        ),
        invoice_no: str(body.invoice_no, 150),
        supplier_no: str(body.supplier_no, 150),
        invoice_scan_copy: str(
            body.invoice_scan_copy,
            1000
        ),
        start_date: str(body.start_date, 10),
        end_date: str(body.end_date, 10),
    };

    if (!record.product_id || !record.product_name) {
        return null;
    }

    if (
        !validDate(record.start_date) ||
        !validDate(record.end_date)
    ) {
        return null;
    }

    if (
        record.start_date &&
        record.end_date &&
        record.end_date < record.start_date
    ) {
        return null;
    }

    return record;
}

const SELECT_SQL = `
    SELECT
        id::text AS id,
        product_id,
        product_name,
        COALESCE(serial, '') AS serial,
        COALESCE(name, '') AS name,
        COALESCE(designation, '') AS designation,
        COALESCE(dept, '') AS dept,
        COALESCE(number_desk_location, '')
            AS number_desk_location,
        COALESCE(invoice_no, '') AS invoice_no,
        COALESCE(supplier_no, '') AS supplier_no,
        COALESCE(invoice_scan_copy, '')
            AS invoice_scan_copy,
        COALESCE(
            TO_CHAR(start_date, 'YYYY-MM-DD'), ''
        ) AS start_date,
        COALESCE(
            TO_CHAR(end_date, 'YYYY-MM-DD'), ''
        ) AS end_date,
        CASE
            WHEN start_date IS NOT NULL
             AND end_date IS NOT NULL
            THEN (end_date - start_date)::integer
            ELSE NULL
        END AS duration_days,
        COALESCE(entry_by, '') AS entry_by,
        CASE
            WHEN end_date IS NULL THEN 'UNKNOWN'
            WHEN end_date < CURRENT_DATE THEN 'EXPIRED'
            WHEN end_date <= CURRENT_DATE + 30
                THEN 'EXPIRING_SOON'
            ELSE 'ACTIVE'
        END AS warranty_status
    FROM it_asset_warranties
`;

const FIELDS = `
    product_id,
    product_name,
    serial,
    name,
    designation,
    dept,
    number_desk_location,
    invoice_no,
    supplier_no,
    invoice_scan_copy,
    start_date,
    end_date
`;

function params(data: NonNullable<ReturnType<typeof parseRecord>>) {
    return [
        data.product_id,
        data.product_name,
        data.serial,
        data.name,
        data.designation,
        data.dept,
        data.number_desk_location,
        data.invoice_no,
        data.supplier_no,
        data.invoice_scan_copy,
        data.start_date || null,
        data.end_date || null,
    ];
}

// GET - List warranty records
export async function GET() {
    if (!(await getAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const result = await db.query(
            SELECT_SQL + " ORDER BY id DESC"
        );

        return NextResponse.json(
            { warranties: result.rows },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    } catch (error) {
        console.error("Warranty GET:", error);

        return NextResponse.json(
            { error: "Unable to load warranty records" },
            { status: 500 }
        );
    }
}

// POST - Create warranty record
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
        const data = parseRecord(body);

        if (!data) {
            return NextResponse.json(
                { error: "Invalid warranty information" },
                { status: 400 }
            );
        }

        const result = await db.query(
            `
            INSERT INTO it_asset_warranties (
                ${FIELDS},
                entry_by
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                $8,$9,$10,$11,$12,$13
            )
            RETURNING id::text AS id
            `,
            [...params(data), session.fullName]
        );

        return NextResponse.json(
            {
                success: true,
                id: result.rows[0].id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Warranty POST:", error);

        return NextResponse.json(
            { error: "Unable to add warranty record" },
            { status: 500 }
        );
    }
}

// PATCH - Update warranty record
export async function PATCH(request: NextRequest) {
    if (!(await getAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const data = parseRecord(body);
        const id = String(body.id ?? "");

        if (!data || !/^[1-9]\d*$/.test(id)) {
            return NextResponse.json(
                { error: "Invalid warranty record" },
                { status: 400 }
            );
        }

        const result = await db.query(
            `
            UPDATE it_asset_warranties
            SET
                product_id = $1,
                product_name = $2,
                serial = $3,
                name = $4,
                designation = $5,
                dept = $6,
                number_desk_location = $7,
                invoice_no = $8,
                supplier_no = $9,
                invoice_scan_copy = $10,
                start_date = $11,
                end_date = $12,
                updated_at = NOW()
            WHERE id = $13
            RETURNING id
            `,
            [...params(data), id]
        );

        if (!result.rowCount) {
            return NextResponse.json(
                { error: "Warranty record not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Warranty PATCH:", error);

        return NextResponse.json(
            { error: "Unable to update warranty record" },
            { status: 500 }
        );
    }
}