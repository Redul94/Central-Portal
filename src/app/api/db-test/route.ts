import { db } from "@/lib/db";

export async function GET() {
    try {
        const result = await db.query(`
      SELECT
        current_database() AS database,
        current_user AS user,
        NOW() AS server_time
    `);

        return Response.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error("Database connection failed:", error);

        return Response.json(
            {
                success: false,
                message: "Database connection failed",
            },
            {
                status: 500,
            }
        );
    }
}