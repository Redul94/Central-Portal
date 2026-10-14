import { db } from "@/lib/db";

type AuditLogInput = {
    userId?: number | null;
    action: string;
    module: string;
    recordType?: string | null;
    recordId?: number | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
};

export async function writeAuditLog({
    userId = null,
    action,
    module,
    recordType = null,
    recordId = null,
    description = null,
    metadata = null,
    ipAddress = null,
}: AuditLogInput) {
    try {
        await db.query(
            `
      INSERT INTO audit_log (
        user_id,
        action,
        module,
        record_type,
        record_id,
        description,
        metadata,
        ip_address
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        $8
      )
      `,
            [
                userId,
                action,
                module,
                recordType,
                recordId,
                description,
                metadata
                    ? JSON.stringify(metadata)
                    : null,
                ipAddress,
            ]
        );
    } catch (error) {
        console.error(
            "Unable to write audit log:",
            error
        );
    }
}