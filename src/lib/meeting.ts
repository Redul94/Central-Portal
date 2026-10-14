import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

/**
 * Automatically:
 *
 * 1. Marks approved meetings as COMPLETED
 *    after their scheduled end date/time has passed
 *    using Bangladesh time (Asia/Dhaka).
 *
 * 2. Automatically closes any PENDING
 *    cancellation/reschedule request belonging
 *    to a COMPLETED meeting.
 */
export async function syncCompletedMeetings() {
  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    // =================================
    // COMPLETE EXPIRED MEETINGS
    // BANGLADESH TIME
    // =================================

    const completedResult =
      await client.query(
        `
                UPDATE meeting_bookings

                SET
                    booking_status =
                        'COMPLETED',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE
                    booking_status =
                        'APPROVED'

                    AND (
                        meeting_date <
                            (
                                CURRENT_TIMESTAMP
                                AT TIME ZONE
                                'Asia/Dhaka'
                            )::date

                        OR (
                            meeting_date =
                                (
                                    CURRENT_TIMESTAMP
                                    AT TIME ZONE
                                    'Asia/Dhaka'
                                )::date

                            AND
                            end_time <=
                                (
                                    CURRENT_TIMESTAMP
                                    AT TIME ZONE
                                    'Asia/Dhaka'
                                )::time
                        )
                    )

                RETURNING
                    id::int
                        AS id,

                    meeting_title,

                    meeting_date::text
                        AS meeting_date,

                    start_time::text
                        AS start_time,

                    end_time::text
                        AS end_time
                `
      );

    // =================================
    // CLOSE STALE CHANGE REQUESTS
    // =================================

    const closedRequestResult =
      await client.query(
        `
                UPDATE meeting_change_requests mcr

                SET
                    request_status =
                        'REJECTED',

                    rejection_reason =
                        'Automatically closed because the meeting has already been completed.',

                    reviewed_by =
                        NULL,

                    reviewed_at =
                        CURRENT_TIMESTAMP,

                    updated_at =
                        CURRENT_TIMESTAMP

                FROM meeting_bookings mb

                WHERE
                    mcr.booking_id =
                        mb.id

                    AND
                    mcr.request_status =
                        'PENDING'

                    AND
                    mb.booking_status =
                        'COMPLETED'

                RETURNING
                    mcr.id::int
                        AS id,

                    mcr.booking_id::int
                        AS booking_id,

                    mcr.request_type,

                    mcr.reason,

                    mcr.rejection_reason
                `
      );

    await client.query(
      "COMMIT"
    );

    // =================================
    // AUDIT COMPLETED BOOKINGS
    // =================================

    for (
      const booking
      of completedResult.rows
    ) {
      await writeAuditLog({
        userId:
          null,

        action:
          "COMPLETE_BOOKING",

        module:
          "MEETING",

        recordType:
          "MEETING_BOOKING",

        recordId:
          booking.id,

        description:
          `Meeting "${booking.meeting_title}" automatically marked as completed.`,

        metadata: {
          meetingTitle:
            booking.meeting_title,

          meetingDate:
            booking.meeting_date,

          startTime:
            booking.start_time,

          endTime:
            booking.end_time,

          previousStatus:
            "APPROVED",

          newStatus:
            "COMPLETED",

          timezone:
            "Asia/Dhaka",

          completedAutomatically:
            true,
        },

        ipAddress:
          null,
      });
    }

    // =================================
    // AUDIT CLOSED CHANGE REQUESTS
    // =================================

    for (
      const changeRequest
      of closedRequestResult.rows
    ) {
      await writeAuditLog({
        userId:
          null,

        action:
          "AUTO_CLOSE_CHANGE_REQUEST",

        module:
          "MEETING",

        recordType:
          "MEETING_CHANGE_REQUEST",

        recordId:
          changeRequest.id,

        description:
          `${changeRequest.request_type} request automatically closed because the meeting was already completed.`,

        metadata: {
          bookingId:
            changeRequest.booking_id,

          requestType:
            changeRequest.request_type,

          originalReason:
            changeRequest.reason,

          previousStatus:
            "PENDING",

          newStatus:
            "REJECTED",

          rejectionReason:
            changeRequest.rejection_reason,

          closedAutomatically:
            true,
        },

        ipAddress:
          null,
      });
    }

    return {
      completedBookings:
        completedResult.rowCount ||
        0,

      closedChangeRequests:
        closedRequestResult.rowCount ||
        0,
    };

  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {
      // Ignore rollback error
    }

    console.error(
      "Meeting completion sync error:",
      error
    );

    return {
      completedBookings: 0,
      closedChangeRequests: 0,
    };

  } finally {
    client.release();
  }
}