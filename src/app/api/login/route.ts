import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const employeeId = String(
            body.employeeId || ""
        ).trim();

        const password = String(
            body.password || ""
        );

        if (!employeeId || !password) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Employee ID and password are required.",
                },
                {
                    status: 400,
                }
            );
        }

        const result = await db.query(
            `
      SELECT
        id,
        employee_id,
        full_name,
        password_hash,
        role,
        account_status
      FROM portal_users
      WHERE employee_id = $1
      LIMIT 1
      `,
            [employeeId]
        );

        if (result.rowCount === 0) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid Employee ID or password.",
                },
                {
                    status: 401,
                }
            );
        }

        const user = result.rows[0];

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!passwordMatch) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Invalid Employee ID or password.",
                },
                {
                    status: 401,
                }
            );
        }

        if (user.account_status === "PENDING") {
            return Response.json(
                {
                    success: false,
                    message:
                        "Your account is awaiting Admin approval.",
                },
                {
                    status: 403,
                }
            );
        }

        if (user.account_status === "REJECTED") {
            return Response.json(
                {
                    success: false,
                    message:
                        "Your registration has been rejected.",
                },
                {
                    status: 403,
                }
            );
        }

        if (user.account_status === "DISABLED") {
            return Response.json(
                {
                    success: false,
                    message:
                        "Your account has been disabled.",
                },
                {
                    status: 403,
                }
            );
        }

        if (user.account_status !== "ACTIVE") {
            return Response.json(
                {
                    success: false,
                    message:
                        "Your account is not active.",
                },
                {
                    status: 403,
                }
            );
        }

        const token =
            await createSessionToken({
                userId: Number(user.id),
                employeeId: user.employee_id,
                fullName: user.full_name,
                role: user.role,
            });

        await db.query(
            `
      UPDATE portal_users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
            [user.id]
        );

        const response = Response.json({
            success: true,
            message: "Login successful.",
            user: {
                employeeId: user.employee_id,
                fullName: user.full_name,
                role: user.role,
            },
        });

        response.headers.append(
            "Set-Cookie",
            `auko_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production"
                ? "; Secure"
                : ""
            }`
        );

        return response;
    } catch (error) {
        console.error("Login error:", error);

        return Response.json(
            {
                success: false,
                message: "Unable to login.",
            },
            {
                status: 500,
            }
        );
    }
}