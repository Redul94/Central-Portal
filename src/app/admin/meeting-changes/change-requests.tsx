"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import AdminNav from "../admin-nav/page";

type ChangeRequest = {
    id: number;
    booking_id: number;

    request_type: string;
    request_status: string;
    reason: string;

    new_room_id: number | null;
    new_room_name: string | null;
    new_meeting_date: string | null;
    new_start_time: string | null;
    new_end_time: string | null;

    rejection_reason: string | null;
    created_at: string;

    meeting_title: string;
    meeting_date: string;
    start_time: string;
    end_time: string;
    booking_status: string;

    current_room_name: string;

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

function prettyTime(
    value: string | null
) {
    if (!value) {
        return "—";
    }

    const [hourText, minute] =
        value.split(":");

    let hour =
        Number(hourText);

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
}

function prettyDate(
    value: string | null
) {
    if (!value) {
        return "—";
    }

    return new Date(
        `${value.slice(0, 10)}T00:00:00`
    ).toLocaleDateString();
}

export default function ChangeRequests({
    adminName,
    adminRole,
}: Props) {
    const [requests, setRequests] =
        useState<ChangeRequest[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [filter, setFilter] =
        useState("PENDING");

    const [message, setMessage] =
        useState("");

    const [
        processingId,
        setProcessingId,
    ] = useState<number | null>(null);

    async function loadRequests() {
        try {
            setLoading(true);

            const response = await fetch(
                "/api/admin/meeting-changes",
                {
                    cache: "no-store",
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                setMessage(
                    data.message ||
                    "Unable to load change requests."
                );

                return;
            }

            setRequests(
                data.requests
            );
        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRequests();
    }, []);

    const filteredRequests =
        useMemo(() => {
            if (filter === "ALL") {
                return requests;
            }

            return requests.filter(
                (request) =>
                    request.request_status ===
                    filter
            );
        }, [requests, filter]);

    const pendingCount =
        requests.filter(
            (request) =>
                request.request_status ===
                "PENDING"
        ).length;

    async function approveRequest(
        requestId: number
    ) {
        const confirmed =
            window.confirm(
                "Approve this change request?"
            );

        if (!confirmed) {
            return;
        }

        setProcessingId(requestId);
        setMessage("");

        try {
            const response = await fetch(
                `/api/admin/meeting-changes/${requestId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        action: "APPROVE",
                    }),
                }
            );

            const data =
                await response.json();

            setMessage(data.message);

            if (response.ok) {
                await loadRequests();
            }
        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to approve request."
            );
        } finally {
            setProcessingId(null);
        }
    }

    async function rejectRequest(
        requestId: number
    ) {
        const reason =
            window.prompt(
                "Enter rejection reason:"
            );

        if (!reason?.trim()) {
            return;
        }

        setProcessingId(requestId);
        setMessage("");

        try {
            const response = await fetch(
                `/api/admin/meeting-changes/${requestId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        action: "REJECT",
                        rejectionReason:
                            reason,
                    }),
                }
            );

            const data =
                await response.json();

            setMessage(data.message);

            if (response.ok) {
                await loadRequests();
            }
        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to reject request."
            );
        } finally {
            setProcessingId(null);
        }
    }

    function statusStyle(
        status: string
    ) {
        switch (status) {
            case "APPROVED":
                return "border-green-300 bg-green-50 text-green-700";

            case "PENDING":
                return "border-yellow-300 bg-yellow-50 text-yellow-700";

            case "REJECTED":
                return "border-red-300 bg-red-50 text-red-700";

            default:
                return "border-gray-300 bg-gray-100 text-gray-700";
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

                {/* NAV */}

                {/* NAVIGATION */}

                <AdminNav
                    adminRole={
                        adminRole
                    }
                />
                {/* TITLE */}

                <div className="mb-7">

                    <h2 className="text-2xl font-bold text-gray-900">
                        Meeting Change Requests
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Review cancellation and reschedule requests for approved meetings.
                    </p>

                </div>

                {/* SUMMARY */}

                <div className="mb-6 w-64 border-l-[3px] border-yellow-500 bg-white p-5 shadow-sm">

                    <p className="text-sm uppercase text-gray-500">
                        Pending Requests
                    </p>

                    <p className="mt-2 text-3xl font-bold text-yellow-600">
                        {pendingCount}
                    </p>

                </div>

                {/* FILTER */}

                <div className="mb-5 flex flex-wrap gap-2">

                    {[
                        "PENDING",
                        "APPROVED",
                        "REJECTED",
                        "ALL",
                    ].map((status) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() =>
                                setFilter(status)
                            }
                            className={`px-4 py-2 text-sm font-semibold ${filter === status
                                ? "bg-[#111111] text-white"
                                : "border border-gray-300 bg-white text-gray-700"
                                }`}
                        >
                            {status}
                        </button>
                    ))}

                </div>

                {message && (
                    <div className="mb-5 border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                        {message}
                    </div>
                )}

                {/* TABLE */}

                <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-[1450px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>
                                    <th className="px-4 py-4 text-left text-sm">
                                        Type
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Meeting
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Requested By
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Current Schedule
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Requested Change
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Reason
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
                                            Loading change requests...
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            No change requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(
                                        (request) => (
                                            <tr
                                                key={request.id}
                                                className="border-b border-gray-200 align-top hover:bg-gray-50"
                                            >

                                                {/* TYPE */}

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-bold ${request.request_type ===
                                                            "CANCEL"
                                                            ? "border-red-300 bg-red-50 text-red-700"
                                                            : "border-[#d4af37] bg-[#fff8df] text-gray-900"
                                                            }`}
                                                    >
                                                        {request.request_type}
                                                    </span>

                                                </td>

                                                {/* MEETING */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {request.meeting_title}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Booking #{request.booking_id}
                                                    </p>

                                                </td>

                                                {/* USER */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {request.full_name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {request.employee_id}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {request.department}
                                                    </p>

                                                </td>

                                                {/* CURRENT */}

                                                <td className="px-4 py-4 text-sm text-gray-700">

                                                    <p className="font-semibold">
                                                        {request.current_room_name}
                                                    </p>

                                                    <p className="mt-1">
                                                        {prettyDate(
                                                            request.meeting_date
                                                        )}
                                                    </p>

                                                    <p className="mt-1">
                                                        {prettyTime(
                                                            request.start_time
                                                        )}
                                                        {" - "}
                                                        {prettyTime(
                                                            request.end_time
                                                        )}
                                                    </p>

                                                </td>

                                                {/* NEW */}

                                                <td className="px-4 py-4 text-sm text-gray-700">

                                                    {request.request_type ===
                                                        "CANCEL" ? (
                                                        <span className="font-semibold text-red-600">
                                                            Cancel Meeting
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold">
                                                                {request.new_room_name}
                                                            </p>

                                                            <p className="mt-1">
                                                                {prettyDate(
                                                                    request.new_meeting_date
                                                                )}
                                                            </p>

                                                            <p className="mt-1">
                                                                {prettyTime(
                                                                    request.new_start_time
                                                                )}
                                                                {" - "}
                                                                {prettyTime(
                                                                    request.new_end_time
                                                                )}
                                                            </p>
                                                        </>
                                                    )}

                                                </td>

                                                {/* REASON */}

                                                <td className="max-w-[280px] px-4 py-4 text-sm text-gray-700">
                                                    {request.reason}
                                                </td>

                                                {/* STATUS */}

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-semibold ${statusStyle(
                                                            request.request_status
                                                        )}`}
                                                    >
                                                        {request.request_status}
                                                    </span>

                                                    {request.rejection_reason && (
                                                        <p className="mt-2 max-w-[220px] text-xs text-red-600">
                                                            Reason:{" "}
                                                            {request.rejection_reason}
                                                        </p>
                                                    )}

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-4 py-4">

                                                    {request.request_status ===
                                                        "PENDING" ? (
                                                        <div className="flex gap-2">

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    processingId ===
                                                                    request.id
                                                                }
                                                                onClick={() =>
                                                                    approveRequest(
                                                                        request.id
                                                                    )
                                                                }
                                                                className="bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    processingId ===
                                                                    request.id
                                                                }
                                                                onClick={() =>
                                                                    rejectRequest(
                                                                        request.id
                                                                    )
                                                                }
                                                                className="bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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