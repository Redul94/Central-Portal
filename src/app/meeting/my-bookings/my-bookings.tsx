"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
} from "react";

type Booking = {
    id: number;
    meeting_title: string;
    meeting_date: string;
    start_time: string;
    end_time: string;

    expected_participants:
    | number
    | null;

    agenda: string;

    special_requirement:
    | string
    | null;

    booking_status: string;

    rejection_reason:
    | string
    | null;

    room_name: string;
    created_at: string;

    change_request_id:
    | number
    | null;

    change_request_type:
    | string
    | null;

    change_request_status:
    | string
    | null;
};

type Props = {
    fullName: string;
    employeeId: string;
};

// --------------------------------
// FORMAT TIME
// --------------------------------

function prettyTime(
    value: string
) {
    if (!value) {
        return "—";
    }

    const [
        hourText,
        minute,
    ] = value.split(":");

    let hour =
        Number(hourText);

    if (
        Number.isNaN(hour)
    ) {
        return value;
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
}

// --------------------------------
// FORMAT DATE
// --------------------------------

function prettyDate(
    value: string
) {
    if (!value) {
        return "—";
    }

    // Supports both:
    // 2026-09-21
    // 2026-09-21T00:00:00.000Z

    const dateOnly =
        String(value).slice(
            0,
            10
        );

    const date =
        new Date(
            `${dateOnly}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return dateOnly;
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}

export default function MyBookings({
    fullName,
    employeeId,
}: Props) {
    const [
        bookings,
        setBookings,
    ] =
        useState<Booking[]>(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        filter,
        setFilter,
    ] =
        useState("ALL");

    const [
        message,
        setMessage,
    ] =
        useState("");

    const [
        processingId,
        setProcessingId,
    ] =
        useState<
            number | null
        >(null);

    // --------------------------------
    // LOAD BOOKINGS
    // --------------------------------

    async function loadBookings() {
        try {
            setLoading(true);

            const response =
                await fetch(
                    "/api/meeting/my-bookings",
                    {
                        cache:
                            "no-store",
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setMessage(
                    data.message ||
                    "Unable to load bookings."
                );

                return;
            }

            setBookings(
                data.bookings ||
                []
            );

        } catch (error) {
            console.error(
                error
            );

            setMessage(
                "Unable to connect to meeting service."
            );

        } finally {
            setLoading(
                false
            );
        }
    }

    useEffect(() => {
        loadBookings();
    }, []);

    // --------------------------------
    // CANCEL PENDING BOOKING
    // --------------------------------

    async function cancelBooking(
        bookingId: number
    ) {
        const confirmed =
            window.confirm(
                "Cancel this pending booking request?"
            );

        if (!confirmed) {
            return;
        }

        setProcessingId(
            bookingId
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/meeting/my-bookings/${bookingId}`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action:
                                    "CANCEL",
                            }),
                    }
                );

            const data =
                await response.json();

            setMessage(
                data.message
            );

            if (
                response.ok
            ) {
                await loadBookings();
            }

        } catch (error) {
            console.error(
                error
            );

            setMessage(
                "Unable to cancel booking."
            );

        } finally {
            setProcessingId(
                null
            );
        }
    }

    // --------------------------------
    // REQUEST CANCELLATION
    // --------------------------------

    async function requestCancellation(
        bookingId: number
    ) {
        const reason =
            window.prompt(
                "Please enter the reason for cancellation:"
            );

        if (
            !reason?.trim()
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "Submit cancellation request? The approved meeting will remain booked until Admin approval."
            );

        if (!confirmed) {
            return;
        }

        setProcessingId(
            bookingId
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/meeting/change-request",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                bookingId,

                                requestType:
                                    "CANCEL",

                                reason:
                                    reason.trim(),
                            }),
                    }
                );

            const data =
                await response.json();

            setMessage(
                data.message
            );

            if (
                response.ok
            ) {
                await loadBookings();
            }

        } catch (error) {
            console.error(
                error
            );

            setMessage(
                "Unable to submit cancellation request."
            );

        } finally {
            setProcessingId(
                null
            );
        }
    }

    // --------------------------------
    // FILTER
    // --------------------------------

    const filteredBookings =
        useMemo(() => {
            if (
                filter ===
                "ALL"
            ) {
                return bookings;
            }

            return bookings.filter(
                (booking) =>
                    booking.booking_status ===
                    filter
            );

        }, [
            bookings,
            filter,
        ]);

    // --------------------------------
    // COUNTS
    // --------------------------------

    const pendingCount =
        bookings.filter(
            (booking) =>
                booking.booking_status ===
                "PENDING"
        ).length;

    const approvedCount =
        bookings.filter(
            (booking) =>
                booking.booking_status ===
                "APPROVED"
        ).length;

    const completedCount =
        bookings.filter(
            (booking) =>
                booking.booking_status ===
                "COMPLETED"
        ).length;

    // --------------------------------
    // STATUS STYLE
    // --------------------------------

    function statusStyle(
        status: string
    ) {
        switch (
        status
        ) {
            case "APPROVED":
                return "border-green-300 bg-green-50 text-green-700";

            case "PENDING":
                return "border-yellow-300 bg-yellow-50 text-yellow-700";

            case "REJECTED":
                return "border-red-300 bg-red-50 text-red-700";

            case "CANCELLED":
                return "border-gray-300 bg-gray-100 text-gray-600";

            case "COMPLETED":
                return "border-blue-300 bg-blue-50 text-blue-700";

            default:
                return "border-gray-300 bg-white text-gray-600";
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

                    <div>



                        <h1 className="mt-1 text-2xl font-bold">
                            Meeting Management
                        </h1>

                    </div>

                    <div className="text-right">

                        <p className="font-semibold">
                            {fullName}
                        </p>

                        <p className="text-xs text-gray-400">
                            {employeeId}
                        </p>

                    </div>

                </div>

            </header>

            <div className="mx-auto max-w-7xl px-6 py-8">

                {/* TITLE + BUTTONS */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            My Bookings
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            View and manage your meeting room requests.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-3">

                        <Link
                            href="/meeting/book"
                            className="bg-[#d4af37] px-5 py-3 text-sm font-bold text-black hover:bg-[#b99625]"
                        >
                            + Book Meeting
                        </Link>

                        <Link
                            href="/meeting"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            ← Dashboard
                        </Link>

                    </div>

                </div>

                {/* KPI */}

                <div className="mb-6 grid gap-4 sm:grid-cols-3">

                    <div className="border-l-[3px] border-yellow-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Pending
                        </p>

                        <p className="mt-2 text-3xl font-bold text-yellow-600">
                            {pendingCount}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Approved
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-600">
                            {approvedCount}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Completed
                        </p>

                        <p className="mt-2 text-3xl font-bold text-blue-600">
                            {completedCount}
                        </p>

                    </div>

                </div>

                {/* FILTER */}

                <div className="mb-5 flex flex-wrap gap-2">

                    {[
                        "ALL",
                        "PENDING",
                        "APPROVED",
                        "COMPLETED",
                        "REJECTED",
                        "CANCELLED",
                    ].map(
                        (
                            status
                        ) => (

                            <button
                                key={
                                    status
                                }
                                type="button"
                                onClick={() =>
                                    setFilter(
                                        status
                                    )
                                }
                                className={`px-4 py-2 text-sm font-semibold ${filter ===
                                    status
                                    ? "bg-[#111111] text-white"
                                    : "border border-gray-300 bg-white text-gray-700 hover:border-[#d4af37]"
                                    }`}
                            >
                                {
                                    status
                                }
                            </button>

                        )
                    )}

                </div>

                {/* MESSAGE */}

                {message && (
                    <div className="mb-5 border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                        {message}
                    </div>
                )}

                {/* TABLE */}

                <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-[1100px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Meeting
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Room
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Date
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Time
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Status
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan={6}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            Loading bookings...
                                        </td>

                                    </tr>

                                ) : filteredBookings.length ===
                                    0 ? (

                                    <tr>

                                        <td
                                            colSpan={6}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            No bookings found.
                                        </td>

                                    </tr>

                                ) : (

                                    filteredBookings.map(
                                        (
                                            booking
                                        ) => (

                                            <tr
                                                key={
                                                    booking.id
                                                }
                                                className="border-b border-gray-200 align-top hover:bg-gray-50"
                                            >

                                                {/* MEETING */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {
                                                            booking.meeting_title
                                                        }
                                                    </p>

                                                    <p className="mt-1 max-w-[300px] text-xs text-gray-500">
                                                        {
                                                            booking.agenda
                                                        }
                                                    </p>

                                                    {booking.special_requirement && (

                                                        <p className="mt-2 max-w-[300px] text-xs text-gray-500">

                                                            Requirement:{" "}

                                                            {
                                                                booking.special_requirement
                                                            }

                                                        </p>

                                                    )}

                                                </td>

                                                {/* ROOM */}

                                                <td className="px-4 py-4 text-gray-700">

                                                    {
                                                        booking.room_name
                                                    }

                                                </td>

                                                {/* DATE */}

                                                <td className="whitespace-nowrap px-4 py-4 text-gray-700">

                                                    {prettyDate(
                                                        booking.meeting_date
                                                    )}

                                                </td>

                                                {/* TIME */}

                                                <td className="whitespace-nowrap px-4 py-4 text-gray-700">

                                                    {prettyTime(
                                                        booking.start_time
                                                    )}

                                                    {" - "}

                                                    {prettyTime(
                                                        booking.end_time
                                                    )}

                                                </td>

                                                {/* STATUS */}

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-semibold ${statusStyle(
                                                            booking.booking_status
                                                        )}`}
                                                    >
                                                        {
                                                            booking.booking_status
                                                        }
                                                    </span>

                                                    {booking.booking_status ===
                                                        "REJECTED" &&
                                                        booking.rejection_reason && (

                                                            <p className="mt-2 max-w-[220px] text-xs text-red-600">

                                                                Reason:{" "}

                                                                {
                                                                    booking.rejection_reason
                                                                }

                                                            </p>

                                                        )}

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-4 py-4">

                                                    {/* PENDING */}

                                                    {booking.booking_status ===
                                                        "PENDING" && (

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    processingId ===
                                                                    booking.id
                                                                }
                                                                onClick={() =>
                                                                    cancelBooking(
                                                                        booking.id
                                                                    )
                                                                }
                                                                className="border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {processingId ===
                                                                    booking.id
                                                                    ? "Processing..."
                                                                    : "Cancel"}
                                                            </button>

                                                        )}

                                                    {/* APPROVED + CHANGE REQUEST PENDING */}

                                                    {booking.booking_status ===
                                                        "APPROVED" &&
                                                        booking.change_request_status ===
                                                        "PENDING" && (

                                                            <div>

                                                                <span className="inline-block border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">

                                                                    {booking.change_request_type ===
                                                                        "CANCEL"
                                                                        ? "Cancellation Pending"
                                                                        : "Reschedule Pending"}

                                                                </span>

                                                                <p className="mt-2 max-w-[200px] text-xs text-gray-500">
                                                                    Waiting for Admin approval
                                                                </p>

                                                            </div>

                                                        )}

                                                    {/* APPROVED + NO CHANGE REQUEST */}

                                                    {booking.booking_status ===
                                                        "APPROVED" &&
                                                        !booking.change_request_status && (

                                                            <div className="flex flex-col gap-2">

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        processingId ===
                                                                        booking.id
                                                                    }
                                                                    onClick={() =>
                                                                        requestCancellation(
                                                                            booking.id
                                                                        )
                                                                    }
                                                                    className="border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    Request Cancellation
                                                                </button>

                                                                <Link
                                                                    href={`/meeting/my-bookings/${booking.id}/reschedule`}
                                                                    className="border border-[#d4af37] bg-[#fff8df] px-3 py-2 text-center text-xs font-semibold text-gray-900 hover:bg-[#f6e9b0]"
                                                                >
                                                                    Request Reschedule
                                                                </Link>

                                                            </div>

                                                        )}

                                                    {/* COMPLETED / REJECTED / CANCELLED */}

                                                    {![
                                                        "PENDING",
                                                        "APPROVED",
                                                    ].includes(
                                                        booking.booking_status
                                                    ) && (

                                                            <span className="text-sm text-gray-400">
                                                                —
                                                            </span>

                                                        )}

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

                {/* FOOTER */}

                <p className="mt-3 text-sm text-gray-500">
                    Showing {filteredBookings.length} booking
                    {filteredBookings.length !== 1
                        ? "s"
                        : ""}
                </p>

            </div>

        </main>
    );
}