import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";

export const runtime = "nodejs";

const GENERIC =
    "If an active account matches, a password reset link will be sent to its official email.";

const jsonHeaders = {
    "Cache-Control": "no-store",
};

function sha256(value: string) {
    return createHash("sha256")
        .update(value)
        .digest("hex");
}

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
                headers: jsonHeaders,
            }
        );
    }

    const value = (
        body as { account?: unknown } | null
    )?.account;

    if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 254
    ) {
        return Response.json(
            {
                success: false,
                message:
                    "Enter your Employee ID or official email.",
            },
            {
                status: 400,
                headers: jsonHeaders,
            }
        );
    }

    const account = value.trim().toLowerCase();

    // This IP header must come from a trusted proxy in production.
    const ip =
        request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "unknown";

    const salt =
        process.env.RESET_RATE_LIMIT_SECRET ||
        process.env.SESSION_SECRET;

    const base = process.env.APP_BASE_URL;

    if (
        !salt ||
        !base ||
        !/^https?:\/\//.test(base)
    ) {
        console.error(
            "Password reset environment configuration is incomplete."
        );

        return Response.json(
            {
                success: false,
                message:
                    "Password reset is temporarily unavailable.",
            },
            {
                status: 503,
                headers: jsonHeaders,
            }
        );
    }

    const ipHash = sha256(`${salt}:ip:${ip}`);

    const accountHash = sha256(
        `${salt}:account:${account}`
    );

    try {
        const client = await db.connect();

        let allowed = false;

        try {
            await client.query("BEGIN");

            // Serialize concurrent checks per IP/account pair.
            await client.query(
                `SELECT pg_advisory_xact_lock(
                    hashtext($1),
                    hashtext($2)
                )`,
                [ipHash, accountHash]
            );

            const counts = await client.query<{
                ip_count: string;
                account_count: string;
            }>(
                `
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM portal_password_reset_attempts
                        WHERE ip_hash = $1
                          AND created_at >
                              NOW() - INTERVAL '1 hour'
                    ) AS ip_count,
                    (
                        SELECT COUNT(*)
                        FROM portal_password_reset_attempts
                        WHERE account_hash = $2
                          AND created_at >
                              NOW() - INTERVAL '1 hour'
                    ) AS account_count
                `,
                [ipHash, accountHash]
            );

            const ipCount = Number(
                counts.rows[0]?.ip_count ?? 0
            );

            const accountCount = Number(
                counts.rows[0]?.account_count ?? 0
            );

            allowed = ipCount < 5 && accountCount < 3;

            if (allowed) {
                await client.query(
                    `
                    INSERT INTO portal_password_reset_attempts
                        (ip_hash, account_hash)
                    VALUES ($1, $2)
                    `,
                    [ipHash, accountHash]
                );
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        if (!allowed) {
            return Response.json(
                {
                    success: true,
                    message: GENERIC,
                },
                { headers: jsonHeaders }
            );
        }

        const result = await db.query<{
            id: number;
            official_email: string;
        }>(
            `
            SELECT id, official_email
            FROM portal_users
            WHERE (
                LOWER(employee_id) = $1
                OR LOWER(official_email) = $1
            )
            AND account_status = 'ACTIVE'
            AND NULLIF(TRIM(official_email), '') IS NOT NULL
            LIMIT 1
            `,
            [account]
        );

        const user = result.rows[0];

        if (user) {
            const token = randomBytes(32).toString("hex");
            const tokenHash = sha256(token);

            await db.query(
                `
                DELETE FROM portal_password_reset_tokens
                WHERE user_id = $1
                `,
                [user.id]
            );

            await db.query(
                `
                INSERT INTO portal_password_reset_tokens
                    (user_id, token_hash, expires_at)
                VALUES (
                    $1,
                    $2,
                    NOW() + INTERVAL '15 minutes'
                )
                `,
                [user.id, tokenHash]
            );

            const resetUrl =
                `${base.replace(/\/$/, "")}` +
                `/reset-password?token=${token}`;

            try {
                await sendPasswordResetEmail(
                    user.official_email,
                    resetUrl
                );
            } catch (error) {
                console.error(
                    "Password reset email delivery error:",
                    error
                );

                await db.query(
                    `
                    DELETE FROM portal_password_reset_tokens
                    WHERE token_hash = $1
                    `,
                    [tokenHash]
                );
            }
        }

        return Response.json(
            {
                success: true,
                message: GENERIC,
            },
            { headers: jsonHeaders }
        );
    } catch (error) {
        console.error(
            "Password reset request error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to process the request. Please try again later.",
            },
            {
                status: 500,
                headers: jsonHeaders,
            }
        );
    }
}