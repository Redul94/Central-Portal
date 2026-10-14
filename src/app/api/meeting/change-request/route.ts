import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =================================
// GET CURRENT USER
// =================================

async function getCurrentUser() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "auko_session"
    )?.value;

  if (!token) {
    return null;
  }

  const session =
    await verifySessionToken(
      token
    );

  if (!session) {
    return null;
  }

  const result =
    await db.query(
      `
            SELECT
                id::int AS id,
                employee_id,
                full_name,
                account_status
            FROM portal_users
            WHERE id = $1
            LIMIT 1
            `,
      [
        session.userId,
      ]
    );

  if (
    result.rowCount === 0
  ) {
    return null;
  }

  const user =
    result.rows[0];

  if (
    user.account_status !==
    "ACTIVE"
  ) {
    return null;
  }

  return user;
}

// =================================
// IP ADDRESS
// =================================

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

// =================================
// POST CHANGE REQUEST
// =================================

export async function POST(
  request: Request
) {
  try {
    // --------------------------------
    // USER
    // --------------------------------

    const user =
      await getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------
    // BODY
    // --------------------------------

    const body =
      await request.json();

    const bookingId =
      Number(
        body.bookingId
      );

    const requestType =
      String(
        body.requestType ||
        ""
      ).toUpperCase();

    const reason =
      String(
        body.reason ||
        ""
      ).trim();

    // --------------------------------
    // BASIC VALIDATION
    // --------------------------------

    if (
      !Number.isInteger(
        bookingId
      ) ||
      bookingId <= 0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Invalid booking ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "CANCEL",
        "RESCHEDULE",
      ].includes(
        requestType
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Invalid request type.",
        },
        {
          status: 400,
        }
      );
    }

    if (!reason) {
      return Response.json(
        {
          success: false,
          message:
            "Please provide a reason.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================
    // GET ORIGINAL BOOKING
    // =================================

    const bookingResult =
      await db.query(
        `
                SELECT
                    mb.id::int AS id,

                    mb.meeting_title,

                    mb.room_id::int
                        AS room_id,

                    mb.meeting_date::text
                        AS meeting_date,

                    mb.start_time::text
                        AS start_time,

                    mb.end_time::text
                        AS end_time,

                    mb.booking_status,

                    mb.requested_by::int
                        AS requested_by,

                    mr.room_name

                FROM meeting_bookings mb

                INNER JOIN meeting_rooms mr
                    ON mr.id =
                       mb.room_id

                WHERE mb.id = $1

                LIMIT 1
                `,
        [
          bookingId,
        ]
      );

    if (
      bookingResult.rowCount ===
      0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Booking not found.",
        },
        {
          status: 404,
        }
      );
    }

    const booking =
      bookingResult.rows[0];

    // --------------------------------
    // OWNERSHIP
    // --------------------------------

    if (
      Number(
        booking.requested_by
      ) !==
      Number(
        user.id
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "You cannot modify this booking.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------
    // ONLY APPROVED BOOKINGS
    // --------------------------------

    if (
      booking.booking_status !==
      "APPROVED"
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Only approved meetings can use change requests.",
        },
        {
          status: 409,
        }
      );
    }

    // =================================
    // CHECK EXISTING PENDING REQUEST
    // =================================

    const existingRequest =
      await db.query(
        `
                SELECT
                    id::int AS id,
                    request_type

                FROM meeting_change_requests

                WHERE
                    booking_id = $1

                    AND request_status =
                        'PENDING'

                LIMIT 1
                `,
        [
          bookingId,
        ]
      );

    if (
      existingRequest.rowCount &&
      existingRequest.rowCount >
      0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "A change request is already pending for this booking.",
        },
        {
          status: 409,
        }
      );
    }

    const ipAddress =
      getIpAddress(
        request
      );

    // =================================
    // CANCELLATION REQUEST
    // =================================

    if (
      requestType ===
      "CANCEL"
    ) {
      const result =
        await db.query(
          `
                    INSERT INTO
                        meeting_change_requests (
                            booking_id,
                            requested_by,
                            request_type,
                            request_status,
                            reason
                        )

                    VALUES (
                        $1,
                        $2,
                        'CANCEL',
                        'PENDING',
                        $3
                    )

                    RETURNING
                        id::int AS id,

                        booking_id::int
                            AS booking_id,

                        request_type,

                        request_status,

                        created_at
                    `,
          [
            bookingId,
            user.id,
            reason,
          ]
        );

      const changeRequest =
        result.rows[0];

      // --------------------------------
      // AUDIT
      // --------------------------------

      await writeAuditLog({
        userId:
          user.id,

        action:
          "REQUEST_CANCELLATION",

        module:
          "MEETING",

        recordType:
          "MEETING_CHANGE_REQUEST",

        recordId:
          changeRequest.id,

        description:
          `Requested cancellation of approved meeting "${booking.meeting_title}".`,

        metadata: {
          bookingId,

          meetingTitle:
            booking.meeting_title,

          room:
            booking.room_name,

          meetingDate:
            booking.meeting_date,

          startTime:
            booking.start_time,

          endTime:
            booking.end_time,

          reason,

          requestStatus:
            "PENDING",
        },

        ipAddress,
      });

      return Response.json(
        {
          success: true,

          message:
            "Cancellation request submitted. The meeting remains booked until Admin approval.",

          request:
            changeRequest,
        },
        {
          status: 201,
        }
      );
    }

    // =================================
    // RESCHEDULE REQUEST
    // =================================

    const newRoomId =
      Number(
        body.newRoomId
      );

    const newMeetingDate =
      String(
        body.newMeetingDate ||
        ""
      ).trim();

    const newStartTime =
      String(
        body.newStartTime ||
        ""
      ).trim();

    const newEndTime =
      String(
        body.newEndTime ||
        ""
      ).trim();

    // --------------------------------
    // REQUIRED DATA
    // --------------------------------

    if (
      !Number.isInteger(
        newRoomId
      ) ||
      newRoomId <= 0 ||
      !newMeetingDate ||
      !newStartTime ||
      !newEndTime
    ) {
      return Response.json(
        {
          success: false,

          message:
            "New room, date, start time and end time are required.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================
    // CHECK NEW ROOM
    // =================================

    const roomResult =
      await db.query(
        `
                SELECT
                    id::int AS id,
                    room_name,
                    room_status

                FROM meeting_rooms

                WHERE id = $1

                LIMIT 1
                `,
        [
          newRoomId,
        ]
      );

    if (
      roomResult.rowCount ===
      0
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Meeting room not found.",
        },
        {
          status: 404,
        }
      );
    }

    const newRoom =
      roomResult.rows[0];

    // --------------------------------
    // ROOM MUST BE ACTIVE
    // --------------------------------

    if (
      newRoom.room_status !==
      "ACTIVE"
    ) {
      return Response.json(
        {
          success: false,

          message:
            `Selected meeting room is currently ${newRoom.room_status}.`,
        },
        {
          status: 409,
        }
      );
    }

    // =================================
    // CHECK DATE
    // =================================

    const dateResult =
      await db.query(
        `
                SELECT
                    $1::date <
                    CURRENT_DATE
                    AS is_past
                `,
        [
          newMeetingDate,
        ]
      );

    if (
      dateResult.rows[0]
        .is_past
    ) {
      return Response.json(
        {
          success: false,
          message:
            "New meeting date cannot be in the past.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================
    // CHECK TIME
    // =================================

    const timeResult =
      await db.query(
        `
                SELECT
                    $1::time <
                    $2::time
                    AS valid_time
                `,
        [
          newStartTime,
          newEndTime,
        ]
      );

    if (
      !timeResult.rows[0]
        .valid_time
    ) {
      return Response.json(
        {
          success: false,
          message:
            "End time must be later than start time.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================
    // CHECK APPROVED MEETING CONFLICT
    // =================================

    const conflictResult =
      await db.query(
        `
                SELECT
                    id::int AS id,

                    meeting_title,

                    start_time::text
                        AS start_time,

                    end_time::text
                        AS end_time

                FROM meeting_bookings

                WHERE
                    room_id = $1

                    AND meeting_date =
                        $2::date

                    AND booking_status =
                        'APPROVED'

                    AND id <> $3

                    AND start_time <
                        $5::time

                    AND end_time >
                        $4::time

                LIMIT 1
                `,
        [
          newRoomId,
          newMeetingDate,
          bookingId,
          newStartTime,
          newEndTime,
        ]
      );

    if (
      conflictResult.rowCount &&
      conflictResult.rowCount >
      0
    ) {
      const conflict =
        conflictResult.rows[0];

      return Response.json(
        {
          success: false,

          message:
            `The selected room already has an approved meeting "${conflict.meeting_title}" from ${conflict.start_time.slice(
              0,
              5
            )} to ${conflict.end_time.slice(
              0,
              5
            )}.`,
        },
        {
          status: 409,
        }
      );
    }

    // =================================
    // CHECK SCHEDULED ROOM BLOCK
    // =================================

    const blockConflict =
      await db.query(
        `
                SELECT
                    id::int AS id,

                    start_time::text
                        AS start_time,

                    end_time::text
                        AS end_time,

                    reason

                FROM meeting_room_blocks

                WHERE
                    room_id = $1

                    AND block_date =
                        $2::date

                    AND block_status =
                        'ACTIVE'

                    AND start_time <
                        $4::time

                    AND end_time >
                        $3::time

                LIMIT 1
                `,
        [
          newRoomId,
          newMeetingDate,
          newStartTime,
          newEndTime,
        ]
      );

    if (
      blockConflict.rowCount &&
      blockConflict.rowCount >
      0
    ) {
      const block =
        blockConflict.rows[0];

      return Response.json(
        {
          success: false,

          message:
            `The selected room is unavailable from ${block.start_time.slice(
              0,
              5
            )} to ${block.end_time.slice(
              0,
              5
            )}. Reason: ${block.reason}`,
        },
        {
          status: 409,
        }
      );
    }

    // =================================
    // CREATE RESCHEDULE REQUEST
    // =================================

    const result =
      await db.query(
        `
                INSERT INTO
                    meeting_change_requests (
                        booking_id,
                        requested_by,
                        request_type,
                        request_status,
                        reason,
                        new_room_id,
                        new_meeting_date,
                        new_start_time,
                        new_end_time
                    )

                VALUES (
                    $1,
                    $2,
                    'RESCHEDULE',
                    'PENDING',
                    $3,
                    $4,
                    $5::date,
                    $6::time,
                    $7::time
                )

                RETURNING
                    id::int AS id,

                    booking_id::int
                        AS booking_id,

                    request_type,

                    request_status,

                    created_at
                `,
        [
          bookingId,
          user.id,
          reason,
          newRoomId,
          newMeetingDate,
          newStartTime,
          newEndTime,
        ]
      );

    const changeRequest =
      result.rows[0];

    // =================================
    // AUDIT
    // =================================

    await writeAuditLog({
      userId:
        user.id,

      action:
        "REQUEST_RESCHEDULE",

      module:
        "MEETING",

      recordType:
        "MEETING_CHANGE_REQUEST",

      recordId:
        changeRequest.id,

      description:
        `Requested reschedule of approved meeting "${booking.meeting_title}".`,

      metadata: {
        bookingId,

        meetingTitle:
          booking.meeting_title,

        reason,

        oldSchedule: {
          room:
            booking.room_name,

          roomId:
            booking.room_id,

          meetingDate:
            booking.meeting_date,

          startTime:
            booking.start_time,

          endTime:
            booking.end_time,
        },

        requestedSchedule: {
          room:
            newRoom.room_name,

          roomId:
            newRoomId,

          meetingDate:
            newMeetingDate,

          startTime:
            newStartTime,

          endTime:
            newEndTime,
        },

        requestStatus:
          "PENDING",
      },

      ipAddress,
    });

    // =================================
    // SUCCESS
    // =================================

    return Response.json(
      {
        success: true,

        message:
          "Reschedule request submitted successfully. The original meeting remains booked until Admin approval.",

        request:
          changeRequest,
      },
      {
        status: 201,
      }
    );

  } catch (error) {
    console.error(
      "Meeting change request error:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          "Unable to submit change request.",
      },
      {
        status: 500,
      }
    );
  }
}