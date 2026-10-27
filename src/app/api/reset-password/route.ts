import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const headers = {
    "Cache-Control": "no-store",
};

export async function POST(request: Request) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return Response.json(
            {
                success: false,
                message: "Invalid request.",
            },
            {
                status: 400,
                headers,
            }
        );
    }

    const { token, password } = (body || {}) as {
        token?: unknown;
        password?: unknown;
    };

    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token)
    ) {
        return Response.json(
            {
                success: false,
                message: "Invalid reset link.",
            },
            {
                status: 400,
                headers,
            }
        );
    }

    if (
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 128
    ) {
        return Response.json(
            {
                success: false,
                message:
                    "Use a password between 12 and 128 characters.",
            },
            {
                status: 400,
                headers,
            }
        );
    }

    const hash = createHash("sha256")
        .update(token)
        .digest("hex");

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const found = await client.query<{
            user_id: number;
        }>(
            `
            SELECT r.user_id
            FROM portal_password_reset_tokens r
            JOIN portal_users u
                ON u.id = r.user_id
            WHERE r.token_hash = $1
              AND r.expires_at > NOW()
              AND u.account_status = 'ACTIVE'
            FOR UPDATE OF r
            `,
            [hash]
        );

        if (!found.rows[0]) {
            await client.query("ROLLBACK");

            return Response.json(
                {
                    success: false,
                    message:
                        "This link is invalid or expired. Request a new link.",
                },
                {
                    status: 400,
                    headers,
                }
            );
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        await client.query(
            `
            UPDATE portal_users
            SET password_hash = $1
            WHERE id = $2
            `,
            [
                passwordHash,
                found.rows[0].user_id,
            ]
        );

        await client.query(
            `
            DELETE FROM portal_password_reset_tokens
            WHERE user_id = $1
            `,
            [found.rows[0].user_id]
        );

        await client.query("COMMIT");

        return Response.json(
            {
                success: true,
                message:
                    "Password updated. You can now sign in.",
            },
            { headers }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Password reset error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to reset password. Try again later.",
            },
            {
                status: 500,
                headers,
            }
        );
    } finally {
        client.release();
    }
}