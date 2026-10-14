import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type AdminUser = {
  id: number;
  employee_id: string;
  full_name: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  account_status: string;
};

async function getCurrentAdmin() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("auko_session")?.value;

  if (!token) {
    return null;
  }

  const session =
    await verifySessionToken(token);

  if (!session) {
    return null;
  }

  const result = await db.query(
    `
    SELECT
      id::int AS id,
      employee_id,
      full_name,
      role,
      account_status
    FROM portal_users
    WHERE id = $1
    LIMIT 1
    `,
    [session.userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const admin =
    result.rows[0] as AdminUser;

  if (
    admin.account_status !== "ACTIVE" ||
    !["ADMIN", "SUPER_ADMIN"].includes(
      admin.role
    )
  ) {
    return null;
  }

  return admin;
}

function getIpAddress(
  request: Request
) {
  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    request.headers.get(
      "x-real-ip"
    ) || null
  );
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const admin =
      await getCurrentAdmin();

    if (!admin) {
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

    const { id } =
      await context.params;

    const targetUserId =
      Number(id);

    if (
      !Number.isInteger(
        targetUserId
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Invalid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const action =
      String(
        body.action || ""
      ).toUpperCase();

    const targetResult =
      await db.query(
        `
        SELECT
          id::int AS id,
          employee_id,
          full_name,
          role,
          account_status
        FROM portal_users
        WHERE id = $1
        LIMIT 1
        `,
        [targetUserId]
      );

    if (
      targetResult.rowCount === 0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    const targetUser =
      targetResult.rows[0];

    const ipAddress =
      getIpAddress(request);

    // =================================
    // SECURITY RULE
    // ADMIN cannot modify SUPER_ADMIN
    // =================================

    if (
      admin.role === "ADMIN" &&
      targetUser.role ===
      "SUPER_ADMIN"
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Admin cannot modify a Super Admin account.",
        },
        {
          status: 403,
        }
      );
    }

    // =================================
    // APPROVE USER
    // =================================

    if (action === "APPROVE") {
      if (
        targetUser.account_status !==
        "PENDING"
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Only pending users can be approved.",
          },
          {
            status: 409,
          }
        );
      }

      await db.query(
        `
        UPDATE portal_users
        SET
          account_status = 'ACTIVE',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          admin.id,
          targetUserId,
        ]
      );

      await writeAuditLog({
        userId: admin.id,
        action: "APPROVE_USER",
        module: "USER_MANAGEMENT",
        recordType: "PORTAL_USER",
        recordId: targetUserId,

        description:
          `Approved portal account for ${targetUser.full_name} (${targetUser.employee_id}).`,

        metadata: {
          employeeId:
            targetUser.employee_id,

          fullName:
            targetUser.full_name,

          previousStatus:
            targetUser.account_status,

          newStatus:
            "ACTIVE",
        },

        ipAddress,
      });

      return Response.json({
        success: true,
        message:
          "User approved successfully.",
      });
    }

    // =================================
    // REJECT USER
    // =================================

    if (action === "REJECT") {
      if (
        targetUser.account_status !==
        "PENDING"
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Only pending users can be rejected.",
          },
          {
            status: 409,
          }
        );
      }

      const rejectionReason =
        String(
          body.rejectionReason || ""
        ).trim();

      if (!rejectionReason) {
        return Response.json(
          {
            success: false,
            message:
              "Rejection reason is required.",
          },
          {
            status: 400,
          }
        );
      }

      await db.query(
        `
        UPDATE portal_users
        SET
          account_status = 'REJECTED',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [
          admin.id,
          rejectionReason,
          targetUserId,
        ]
      );

      await writeAuditLog({
        userId: admin.id,
        action: "REJECT_USER",
        module: "USER_MANAGEMENT",
        recordType: "PORTAL_USER",
        recordId: targetUserId,

        description:
          `Rejected portal account for ${targetUser.full_name} (${targetUser.employee_id}).`,

        metadata: {
          employeeId:
            targetUser.employee_id,

          fullName:
            targetUser.full_name,

          rejectionReason,
        },

        ipAddress,
      });

      return Response.json({
        success: true,
        message:
          "User rejected successfully.",
      });
    }

    // =================================
    // CHANGE STATUS
    // =================================

    if (action === "SET_STATUS") {
      const newStatus =
        String(
          body.status || ""
        ).toUpperCase();

      if (
        ![
          "ACTIVE",
          "DISABLED",
        ].includes(newStatus)
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Invalid account status.",
          },
          {
            status: 400,
          }
        );
      }

      // Prevent admin disabling themselves
      if (
        admin.id === targetUserId &&
        newStatus === "DISABLED"
      ) {
        return Response.json(
          {
            success: false,
            message:
              "You cannot disable your own account.",
          },
          {
            status: 409,
          }
        );
      }

      const previousStatus =
        targetUser.account_status;

      await db.query(
        `
        UPDATE portal_users
        SET
          account_status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          newStatus,
          targetUserId,
        ]
      );

      const auditAction =
        newStatus === "ACTIVE"
          ? "ENABLE_USER"
          : "DISABLE_USER";

      await writeAuditLog({
        userId: admin.id,
        action: auditAction,
        module: "USER_MANAGEMENT",
        recordType: "PORTAL_USER",
        recordId: targetUserId,

        description:
          `${newStatus === "ACTIVE" ? "Enabled" : "Disabled"} portal account for ${targetUser.full_name} (${targetUser.employee_id}).`,

        metadata: {
          employeeId:
            targetUser.employee_id,

          fullName:
            targetUser.full_name,

          previousStatus,
          newStatus,
        },

        ipAddress,
      });

      return Response.json({
        success: true,
        message:
          newStatus === "ACTIVE"
            ? "User account enabled successfully."
            : "User account disabled successfully.",
      });
    }

    // =================================
    // CHANGE ROLE
    // =================================

    if (action === "SET_ROLE") {
      // Only Super Admin
      if (
        admin.role !==
        "SUPER_ADMIN"
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Only Super Admin can change user roles.",
          },
          {
            status: 403,
          }
        );
      }

      const newRole =
        String(
          body.role || ""
        ).toUpperCase();

      if (
        ![
          "USER",
          "ADMIN",
          "SUPER_ADMIN",
        ].includes(newRole)
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Invalid role.",
          },
          {
            status: 400,
          }
        );
      }

      // Prevent changing own role
      if (
        admin.id === targetUserId
      ) {
        return Response.json(
          {
            success: false,
            message:
              "You cannot change your own role.",
          },
          {
            status: 409,
          }
        );
      }

      const previousRole =
        targetUser.role;

      if (
        previousRole === newRole
      ) {
        return Response.json({
          success: true,
          message:
            "User already has this role.",
        });
      }

      await db.query(
        `
        UPDATE portal_users
        SET
          role = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          newRole,
          targetUserId,
        ]
      );

      await writeAuditLog({
        userId: admin.id,
        action: "CHANGE_ROLE",
        module: "USER_MANAGEMENT",
        recordType: "PORTAL_USER",
        recordId: targetUserId,

        description:
          `Changed role for ${targetUser.full_name} (${targetUser.employee_id}) from ${previousRole} to ${newRole}.`,

        metadata: {
          employeeId:
            targetUser.employee_id,

          fullName:
            targetUser.full_name,

          previousRole,
          newRole,
        },

        ipAddress,
      });

      return Response.json({
        success: true,
        message:
          `User role changed to ${newRole}.`,
      });
    }

    // =================================
    // INVALID ACTION
    // =================================

    return Response.json(
      {
        success: false,
        message:
          "Invalid action.",
      },
      {
        status: 400,
      }
    );

  } catch (error) {
    console.error(
      "Admin user action error:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to process user action.",
      },
      {
        status: 500,
      }
    );
  }
}