import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { verifySessionToken } from "@/lib/auth";

import RescheduleForm from "./reschedule-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

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
// PAGE
// =================================

export default async function ReschedulePage({
    params,
}: PageProps) {
    // --------------------------------
    // AUTH
    // --------------------------------

    const user =
        await getCurrentUser();

    if (!user) {
        redirect(
            "/login"
        );
    }

    // --------------------------------
    // BOOKING ID
    // --------------------------------

    const resolvedParams =
        await params;

    const bookingId =
        Number(
            resolvedParams.id
        );

    if (
        !Number.isInteger(
            bookingId
        ) ||
        bookingId <= 0
    ) {
        redirect(
            "/meeting/my-bookings"
        );
    }

    // =================================
    // LOAD BOOKING
    // =================================

    const bookingResult =
        await db.query(
            `
            SELECT
                mb.id::int
                    AS id,

                mb.meeting_title,

                mb.room_id::int
                    AS room_id,

                mr.room_name,

                mb.meeting_date::text
                    AS meeting_date,

                mb.start_time::text
                    AS start_time,

                mb.end_time::text
                    AS end_time,

                mb.booking_status,

                mb.requested_by::int
                    AS requested_by

            FROM meeting_bookings mb

            INNER JOIN meeting_rooms mr
                ON mr.id =
                   mb.room_id

            WHERE
                mb.id = $1

                AND
                mb.requested_by = $2

            LIMIT 1
            `,
            [
                bookingId,
                user.id,
            ]
        );

    // --------------------------------
    // NOT FOUND / NOT OWNER
    // --------------------------------

    if (
        bookingResult.rowCount ===
        0
    ) {
        redirect(
            "/meeting/my-bookings"
        );
    }

    const booking =
        bookingResult.rows[0];

    // --------------------------------
    // ONLY APPROVED BOOKINGS
    // --------------------------------

    if (
        booking.booking_status !==
        "APPROVED"
    ) {
        redirect(
            "/meeting/my-bookings"
        );
    }

    // =================================
    // CHECK PENDING CHANGE REQUEST
    // =================================

    const pendingRequestResult =
        await db.query(
            `
            SELECT
                id::int AS id

            FROM meeting_change_requests

            WHERE
                booking_id = $1

                AND
                request_status =
                    'PENDING'

            LIMIT 1
            `,
            [
                bookingId,
            ]
        );

    if (
        pendingRequestResult.rowCount &&
        pendingRequestResult.rowCount >
        0
    ) {
        redirect(
            "/meeting/my-bookings"
        );
    }

    // =================================
    // LOAD ACTIVE ROOMS
    // =================================

    const roomResult =
        await db.query(
            `
            SELECT
                id::int AS id,
                room_name

            FROM meeting_rooms

            WHERE
                room_status =
                    'ACTIVE'

            ORDER BY
                room_name
            `
        );

    // =================================
    // PAGE
    // =================================

    return (
        <RescheduleForm
            booking={{
                id:
                    booking.id,

                meeting_title:
                    booking.meeting_title,

                room_id:
                    booking.room_id,

                room_name:
                    booking.room_name,

                meeting_date:
                    booking.meeting_date,

                start_time:
                    booking.start_time,

                end_time:
                    booking.end_time,
            }}
            rooms={
                roomResult.rows
            }
        />
    );
}