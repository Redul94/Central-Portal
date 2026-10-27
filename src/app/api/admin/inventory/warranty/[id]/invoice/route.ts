
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

import {
    mkdir,
    readFile,
    unlink,
    writeFile,
} from "node:fs/promises";

import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================
// CONFIGURATION
// ============================================

const MAX_SIZE = 10 * 1024 * 1024;

const UPLOAD_DIR =
    process.env.PRIVATE_UPLOAD_DIR ||
    path.join(
        process.cwd(),
        "private_uploads",
        "warranty_invoices"
    );

type Context = {
    params: Promise<{ id: string }>;
};

// ============================================
// ADMIN AUTHENTICATION
// ============================================

async function isAdmin() {
    const store = await cookies();

    const token = store.get("auko_session")?.value;

    if (!token) {
        return false;
    }

    const session = await verifySessionToken(token);

    return Boolean(
        session &&
        ["ADMIN", "SUPER_ADMIN"].includes(session.role)
    );
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validId(id: string) {
    return /^[1-9]\d*$/.test(id);
}

function isSafeStoredName(name: string) {
    return /^[a-f0-9-]{36}\.(pdf|jpg)$/.test(name);
}

function privateFilePath(name: string) {
    return path.join(UPLOAD_DIR, name);
}

function fileType(buffer: Buffer) {
    // PDF signature
    if (
        buffer.length >= 5 &&
        buffer.subarray(0, 5).toString("ascii") === "%PDF-"
    ) {
        return {
            extension: "pdf",
            mime: "application/pdf",
        };
    }

    // JPEG signature
    if (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
    ) {
        return {
            extension: "jpg",
            mime: "image/jpeg",
        };
    }

    return null;
}

// ============================================
// SAME-ORIGIN VERIFICATION
// ============================================

function isValidOrigin(request: NextRequest) {
    const origin = request.headers.get("origin");
    const requestHost = request.headers.get("host");

    if (!origin || !requestHost) {
        return false;
    }

    try {
        const parsedOrigin = new URL(origin);

        if (
            parsedOrigin.protocol !== "http:" &&
            parsedOrigin.protocol !== "https:"
        ) {
            return false;
        }

        if (
            parsedOrigin.username ||
            parsedOrigin.password ||
            parsedOrigin.pathname !== "/" ||
            parsedOrigin.search ||
            parsedOrigin.hash
        ) {
            return false;
        }

        // Compare browser origin against the actual
        // Host header instead of request.nextUrl.origin.
        //
        // This avoids false mismatches when Next.js
        // is started with -H 0.0.0.0.

        return (
            parsedOrigin.host.toLowerCase() ===
            requestHost.toLowerCase()
        );
    } catch {
        return false;
    }
}

// ============================================
// POST: UPLOAD OR REPLACE INVOICE
// ============================================

export async function POST(
    request: NextRequest,
    context: Context
) {
    // 1. Check administrator permission

    if (!(await isAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // 2. Verify request origin

    if (!isValidOrigin(request)) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 }
        );
    }

    // 3. Validate warranty ID

    const { id } = await context.params;

    if (!validId(id)) {
        return NextResponse.json(
            { error: "Invalid warranty ID" },
            { status: 400 }
        );
    }

    // 4. Check declared request size

    const contentLength = Number(
        request.headers.get("content-length") || 0
    );

    if (
        contentLength > MAX_SIZE + 1024 * 1024
    ) {
        return NextResponse.json(
            { error: "File exceeds 10 MB limit" },
            { status: 413 }
        );
    }

    let newFilePath: string | null = null;
    let databaseSaved = false;

    try {
        // 5. Read uploaded file

        const formData = await request.formData();

        const file = formData.get("invoice");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Select an invoice file" },
                { status: 400 }
            );
        }

        // 6. Validate filename extension

        const extension = path
            .extname(file.name)
            .toLowerCase();

        if (
            ![".pdf", ".jpg", ".jpeg"].includes(extension)
        ) {
            return NextResponse.json(
                {
                    error:
                        "Only PDF, JPG and JPEG files are allowed",
                },
                { status: 400 }
            );
        }

        // 7. Validate file size

        if (
            file.size === 0 ||
            file.size > MAX_SIZE
        ) {
            return NextResponse.json(
                {
                    error:
                        "File must be between 1 byte and 10 MB",
                },
                { status: 400 }
            );
        }

        // 8. Read file content

        const buffer = Buffer.from(
            await file.arrayBuffer()
        );

        // 9. Validate actual file signature

        const detected = fileType(buffer);

        if (!detected) {
            return NextResponse.json(
                {
                    error: "Invalid PDF or JPEG file",
                },
                { status: 400 }
            );
        }

        // 10. Check extension matches actual content

        if (
            (
                detected.extension === "pdf" &&
                extension !== ".pdf"
            ) ||
            (
                detected.extension === "jpg" &&
                ![".jpg", ".jpeg"].includes(extension)
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "File extension does not match its content",
                },
                { status: 400 }
            );
        }

        // 11. Confirm warranty record exists

        const record = await db.query<{
            invoice_scan_copy: string | null;
        }>(
            `
            SELECT invoice_scan_copy
            FROM it_asset_warranties
            WHERE id = $1
            `,
            [id]
        );

        if (!record.rows.length) {
            return NextResponse.json(
                {
                    error: "Warranty record not found",
                },
                { status: 404 }
            );
        }

        // 12. Create private upload directory

        await mkdir(UPLOAD_DIR, {
            recursive: true,
        });

        // 13. Generate unique filename

        const storedName =
            `${randomUUID()}.${detected.extension}`;

        newFilePath = privateFilePath(storedName);

        // 14. Save file privately

        await writeFile(
            newFilePath,
            buffer,
            {
                flag: "wx",
                mode: 0o600,
            }
        );

        // 15. Update database reference
        //
        // Return the old file reference from the
        // same UPDATE operation to reduce the
        // chance of deleting the wrong file.

        const result = await db.query<{
            old_invoice: string | null;
        }>(
            `
            UPDATE it_asset_warranties
            SET
                invoice_scan_copy = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING
                (
                    SELECT $3::text
                ) AS old_invoice
            `,
            [
                storedName,
                id,
                record.rows[0].invoice_scan_copy,
            ]
        );

        if (result.rowCount !== 1) {
            throw new Error(
                "Warranty database update failed"
            );
        }

        databaseSaved = true;

        // 16. Remove previous invoice, if any
        //
        // Only delete filenames generated by
        // our private upload system.

        const oldName =
            record.rows[0].invoice_scan_copy;

        if (
            oldName &&
            oldName !== storedName &&
            isSafeStoredName(oldName)
        ) {
            try {
                await unlink(
                    privateFilePath(oldName)
                );
            } catch (error) {
                console.warn(
                    "Previous invoice cleanup failed:",
                    error
                );
            }
        }

        // 17. Success response

        return NextResponse.json({
            success: true,
            filename: storedName,
            message:
                "Invoice uploaded successfully",
        });
    } catch (error) {
        // Delete a newly written file only if
        // its database reference was not saved.

        if (newFilePath && !databaseSaved) {
            await unlink(newFilePath).catch(() => { });
        }

        console.error(
            "Invoice upload error:",
            error
        );

        return NextResponse.json(
            {
                error: "Unable to upload invoice",
            },
            { status: 500 }
        );
    }
}

// ============================================
// GET: AUTHENTICATED INVOICE VIEWING
// ============================================

export async function GET(
    _request: NextRequest,
    context: Context
) {
    // 1. Check administrator permission

    if (!(await isAdmin())) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // 2. Validate warranty ID

    const { id } = await context.params;

    if (!validId(id)) {
        return NextResponse.json(
            { error: "Invalid warranty ID" },
            { status: 400 }
        );
    }

    try {
        // 3. Load invoice reference

        const result = await db.query<{
            invoice_scan_copy: string | null;
        }>(
            `
            SELECT invoice_scan_copy
            FROM it_asset_warranties
            WHERE id = $1
            `,
            [id]
        );

        const name =
            result.rows[0]?.invoice_scan_copy;

        // 4. Validate stored filename

        if (
            !name ||
            !isSafeStoredName(name)
        ) {
            return NextResponse.json(
                {
                    error: "Invoice not found",
                },
                { status: 404 }
            );
        }

        // 5. Read private file

        const buffer = await readFile(
            privateFilePath(name)
        );

        // 6. Set correct content type

        const mime = name.endsWith(".pdf")
            ? "application/pdf"
            : "image/jpeg";

        const extension = name.endsWith(".pdf")
            ? "pdf"
            : "jpg";

        // 7. Return invoice to authorized admin

        return new Response(
            new Uint8Array(buffer),
            {
                status: 200,
                headers: {
                    "Content-Type": mime,

                    "Content-Disposition":
                        `inline; filename="invoice.${extension}"`,

                    "Cache-Control":
                        "private, no-store",

                    "X-Content-Type-Options":
                        "nosniff",

                    "Content-Security-Policy":
                        "default-src 'none'; sandbox",

                    "Referrer-Policy":
                        "no-referrer",
                },
            }
        );
    } catch (error) {
        console.error(
            "Invoice read error:",
            error
        );

        return NextResponse.json(
            {
                error: "Unable to open invoice",
            },
            { status: 404 }
        );
    }
}
