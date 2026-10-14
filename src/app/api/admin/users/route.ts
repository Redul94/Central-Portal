import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

async function getAdminSession() {
    const cookieStore = await cookies();

    const token =
        cookieStore.get("auko_session")?.value;

    if (!token) {
        return null;
    }

    const session =
        await verifySessionToken(token);

    if (
        !session ||
        !["ADMIN", "SUPER_ADMIN"].includes(
            session.role
        )
    ) {
        return null;
    }

    return session;
}

export async function GET() {
    try {
        const session =
            await getAdminSession();

        if (!session) {
            return Response.json(
                {
                    success: false,
                    message: "Unauthorized.",
                },
                {
                    status: 403,
                }
            );
        }

        const result = await db.query(`
  SELECT
    id,
    employee_id,
    full_name,
    department,
    designation,
    official_email,
    role,
    account_status,
    rejection_reason,
    created_at,
    approved_at,
    last_login_at
  FROM portal_users
  ORDER BY created_at DESC
`);

        return Response.json({
            success: true,
            users: result.rows,
        });

    } catch (error) {
        console.error(
            "Admin users error:",
            error
        );

        return Response.json(
            {
                success: false,
                message:
                    "Unable to retrieve users.",
            },
            {
                status: 500,
            }
        );
    }
}