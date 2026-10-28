
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink } from "node:fs/promises";
import path from "node:path";

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

function clean(value: unknown, max = 200) {
    return typeof value === "string"
        ? value.trim().slice(0, max)
        : "";
}

function validDate(value: string) {
    if (!value) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function parseRecord(body: Record<string, unknown>) {
    // Keep current DB column names for compatibility.
    const record = {
        product_id: clean(body.product_id, 100),
        product_name: clean(body.product_name),
        serial: clean(body.serial),
        employee_id: clean(body.employee_id, 50),
        name: clean(body.name),
        designation: clean(body.designation),
        dept: clean(body.dept),
        contact: clean(body.contact, 50),
        number_desk_location: clean(
            body.number_desk_location,
            1000
        ),
        invoice_no: clean(body.invoice_no, 150),
        supplier_name: clean(body.supplier_name),
        supplier_contact: clean(body.supplier_contact, 50),
        start_date: clean(body.start_date, 10),
        end_date: clean(body.end_date, 10),
        issue_by: clean(body.issue_by),
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

type WarrantyInput = NonNullable<
    ReturnType<typeof parseRecord>
>;

function values(record: WarrantyInput) {
    return [
        record.product_id,
        record.product_name,
        record.serial,
        record.employee_id || null,
        record.name,
        record.designation,
        record.dept,
        record.contact || null,
        record.number_desk_location,
        record.invoice_no,
        record.supplier_name || null,
        record.supplier_contact || null,
        record.start_date || null,
        record.end_date || null,
        record.issue_by || null,
    ];
}

const SELECT_SQL = `
    SELECT
        id::text AS id,
        COALESCE(product_id, '') AS product_id,
        COALESCE(product_name, '') AS product_name,
        COALESCE(serial, '') AS serial,
        COALESCE(employee_id, '') AS employee_id,
        COALESCE(name, '') AS name,
        COALESCE(designation, '') AS designation,
        COALESCE(dept, '') AS dept,
        COALESCE(contact, '') AS contact,
        COALESCE(number_desk_location, '')
            AS number_desk_location,
        COALESCE(invoice_no, '') AS invoice_no,
        COALESCE(supplier_name, '') AS supplier_name,
        COALESCE(supplier_contact, '')
            AS supplier_contact,
        COALESCE(invoice_scan_copy, '')
            AS invoice_scan_copy,
        COALESCE(
            TO_CHAR(start_date, 'YYYY-MM-DD'),
            ''
        ) AS start_date,
        COALESCE(
            TO_CHAR(end_date, 'YYYY-MM-DD'),
            ''
        ) AS end_date,
        CASE
            WHEN start_date IS NOT NULL
             AND end_date IS NOT NULL
            THEN (end_date - start_date)::integer
            ELSE NULL
        END AS duration_days,
        COALESCE(issue_by, '') AS issue_by,
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
                product_id,
                product_name,
                serial,
                employee_id,
                name,
                designation,
                dept,
                contact,
                number_desk_location,
                invoice_no,
                supplier_name,
                supplier_contact,
                start_date,
                end_date,
                issue_by,
                entry_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12,
                $13::date, $14::date, $15, $16
            )
            RETURNING id::text AS id
            `,
            [
                ...values(data).slice(0, 14),
                session.fullName,
                session.fullName,
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
        console.error("Warranty POST:", error);

        return NextResponse.json(
            { error: "Unable to add warranty record" },
            { status: 500 }
        );
    }
}

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

        if (
            !data ||
            !/^[1-9]\d*$/.test(id)
        ) {
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
                employee_id = $4,
                name = $5,
                designation = $6,
                dept = $7,
                contact = $8,
                number_desk_location = $9,
                invoice_no = $10,
                supplier_name = $11,
                supplier_contact = $12,
                start_date = $13::date,
                end_date = $14::date,
                // issue_by = $15,
                updated_at = NOW()
            WHERE id = $15
            RETURNING id
            `,
            [...values(data).slice(0, 14), id]
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

// ============================================
// DELETE - Remove warranty record
// ============================================

export async function DELETE(request: NextRequest) {
    const session = await getAdmin();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // Check same-origin request
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!origin || !host) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
        );
    }

    try {
        const url = new URL(origin);

        if (
            !["http:", "https:"].includes(url.protocol) ||
            url.host.toLowerCase() !== host.toLowerCase()
        ) {
            return NextResponse.json(
                { error: "Invalid request origin" },
                { status: 403 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
        );
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id || !/^[1-9]\d*$/.test(id)) {
        return NextResponse.json(
            { error: "Invalid record ID" },
            { status: 400 }
        );
    }

    try {
        // Delete the selected database record.
        // A foreign-key restriction will block deletion
        // if another table requires the record.

        const result = await db.query<{
            invoice_scan_copy: string | null;
        }>(
            `
            DELETE FROM it_asset_warranties
            WHERE id = $1
            RETURNING invoice_scan_copy
            `,
            [id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json(
                { error: "Warranty record not found" },
                { status: 404 }
            );
        }

        const invoiceName =
            result.rows[0].invoice_scan_copy;

        // Delete the associated private invoice only
        // when its filename matches our upload format.

        if (
            invoiceName &&
            /^[a-f0-9-]{36}\.(pdf|jpg)$/.test(invoiceName)
        ) {
            const uploadDir =
                process.env.PRIVATE_UPLOAD_DIR ||
                path.join(
                    process.cwd(),
                    "private_uploads",
                    "warranty_invoices"
                );

            const invoicePath = path.join(
                uploadDir,
                invoiceName
            );

            try {
                await unlink(invoicePath);
            } catch (error) {
                console.error(
                    "Invoice cleanup failed:",
                    error
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Warranty record deleted successfully",
        });
    } catch (error) {
        console.error(
            "Warranty DELETE error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Unable to delete warranty record. " +
                    "It may be referenced by another record.",
            },
            { status: 500 }
        );
    }
}