"use client";

import Link from "next/link";

import {
    useEffect,
    useMemo,
    useState,
} from "react";
import AdminNav from "../admin-nav/page";

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

    created_at: string;

    room_id: number;
    room_name: string;

    employee_id: string;
    full_name: string;
    department: string;
    designation: string;
    official_email: string;
};

type Props = {
    adminName: string;
    adminRole: string;
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

    const [hourText, minute] =
        value.split(":");

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

    // Handles both:
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
        return value;
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

export default function MeetingApprovals({
    adminName,
    adminRole,
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
        message,
        setMessage,
    ] =
        useState("");

    const [
        filter,
        setFilter,
    ] =
        useState(
            "PENDING"
        );

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
                    "/api/admin/meetings",
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
                    "Unable to load meeting requests."
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
    // KPI
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

    const rejectedCount =
        bookings.filter(
            (booking) =>
                booking.booking_status ===
                "REJECTED"
        ).length;

    // --------------------------------
    // APPROVE
    // --------------------------------

    async function approveBooking(
        bookingId: number
    ) {
        const confirmed =
            window.confirm(
                "Approve this meeting booking?"
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
                    `/api/admin/meetings/${bookingId}`,
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
                                    "APPROVE",
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
                "Unable to approve meeting."
            );

        } finally {
            setProcessingId(
                null
            );
        }
    }

    // --------------------------------
    // REJECT
    // --------------------------------

    async function rejectBooking(
        bookingId: number
    ) {
        const reason =
            window.prompt(
                "Enter rejection reason:"
            );

        if (
            !reason?.trim()
        ) {
            return;
        }

        setProcessingId(
            bookingId
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/admin/meetings/${bookingId}`,
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
                                    "REJECT",

                                rejectionReason:
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
                "Unable to reject meeting."
            );

        } finally {
            setProcessingId(
                null
            );
        }
    }

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
                return "border-gray-300 bg-white text-gray-700";
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5">

                    <div>

                        

                        <h1 className="mt-1 text-2xl font-bold">
                            Admin Panel
                        </h1>

                    </div>

                    <div className="text-right">

                        <p className="font-semibold">
                            {adminName}
                        </p>

                        <p className="text-xs text-gray-400">
                            {adminRole}
                        </p>

                    </div>

                </div>

            </header>

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                {/* NAVIGATION */}


                <AdminNav
                    adminRole={
                        adminRole
                    }
                />

                {/* TITLE */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Meeting Approvals
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Review and approve meeting room booking requests.
                        </p>

                    </div>

                    <Link
                        href="/meeting"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        Meeting Dashboard →
                    </Link>

                </div>

                {/* KPI */}

                <div className="mb-6 grid gap-4 md:grid-cols-3">

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

                    <div className="border-l-[3px] border-red-600 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Rejected
                        </p>

                        <p className="mt-2 text-3xl font-bold text-red-600">
                            {rejectedCount}
                        </p>

                    </div>

                </div>

                {/* FILTER */}

                <div className="mb-5 flex flex-wrap gap-2">

                    {[
                        "PENDING",
                        "APPROVED",
                        "COMPLETED",
                        "REJECTED",
                        "ALL",
                    ].map(
                        (status) => (
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
                                {status}
                            </button>
                        )
                    )}

                </div>

                {/* MESSAGE */}

                {message && (
                    <div className="mb-5 border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                        {message}
                    </div>
                )}

                {/* TABLE */}

                <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-[1300px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Meeting
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Requested By
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
                                        Participants
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
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            Loading meeting requests...
                                        </td>

                                    </tr>

                                ) : filteredBookings.length ===
                                    0 ? (

                                    <tr>

                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            No meeting requests found.
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

                                                {/* REQUESTED BY */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {
                                                            booking.full_name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {
                                                            booking.employee_id
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {
                                                            booking.department
                                                        }
                                                    </p>

                                                    {booking.designation && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {
                                                                booking.designation
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

                                                {/* PARTICIPANTS */}

                                                <td className="px-4 py-4 text-gray-700">

                                                    {
                                                        booking.expected_participants ??
                                                        "—"
                                                    }

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

                                                    {booking.rejection_reason && (

                                                        <p className="mt-2 max-w-[200px] text-xs text-red-600">

                                                            Reason:{" "}
                                                            {
                                                                booking.rejection_reason
                                                            }

                                                        </p>

                                                    )}

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-4 py-4">

                                                    {booking.booking_status ===
                                                        "PENDING" ? (

                                                        <div className="flex gap-2">

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    processingId ===
                                                                    booking.id
                                                                }
                                                                onClick={() =>
                                                                    approveBooking(
                                                                        booking.id
                                                                    )
                                                                }
                                                                className="bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {processingId ===
                                                                    booking.id
                                                                    ? "Processing..."
                                                                    : "Approve"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    processingId ===
                                                                    booking.id
                                                                }
                                                                onClick={() =>
                                                                    rejectBooking(
                                                                        booking.id
                                                                    )
                                                                }
                                                                className="bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>

                                                        </div>

                                                    ) : (

                                                        <span className="text-gray-400">
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

            </div>

        </main>
    );
}