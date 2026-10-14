import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            employeeId,
            fullName,
            department,
            designation,
            officialEmail,
            password,
        } = body;

        if (
            !employeeId ||
            !fullName ||
            !department ||
            !designation ||
            !officialEmail ||
            !password
        ) {
            return Response.json(
                {
                    success: false,
                    message: "All fields are required.",
                },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return Response.json(
                {
                    success: false,
                    message: "Password must be at least 8 characters.",
                },
                { status: 400 }
            );
        }

        const normalizedEmployeeId = employeeId.trim();
        const normalizedEmail = officialEmail.trim().toLowerCase();

        const existingUser = await db.query(
            `
      SELECT id
      FROM portal_users
      WHERE employee_id = $1
         OR LOWER(official_email) = $2
      LIMIT 1
      `,
            [normalizedEmployeeId, normalizedEmail]
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
            return Response.json(
                {
                    success: false,
                    message:
                        "An account already exists with this Employee ID or email.",
                },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.query(
            `
      INSERT INTO portal_users (
        employee_id,
        full_name,
        department,
        designation,
        official_email,
        password_hash,
        role,
        account_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'USER', 'PENDING')
      RETURNING
        id,
        employee_id,
        full_name,
        official_email,
        role,
        account_status,
        created_at
      `,
            [
                normalizedEmployeeId,
                fullName.trim(),
                department.trim(),
                designation.trim(),
                normalizedEmail,
                passwordHash,
            ]
        );

        return Response.json(
            {
                success: true,
                message:
                    "Registration submitted successfully. Please wait for Admin approval.",
                user: result.rows[0],
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("Registration error:", error);

        const pgError = error as {
            code?: string;
        };

        if (pgError.code === "23505") {
            return Response.json(
                {
                    success: false,
                    message:
                        "Employee ID or official email is already registered.",
                },
                { status: 409 }
            );
        }

        return Response.json(
            {
                success: false,
                message: "Unable to complete registration.",
            },
            { status: 500 }
        );
    }
}