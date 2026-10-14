"use client";

import Link from "next/link";
import {
    useEffect,
    useState,
} from "react";
import AdminNav from "./admin-nav/page";

type PortalUser = {
    id: number;
    employee_id: string;
    full_name: string;
    department: string;
    designation: string;
    official_email: string;
    role: string;
    account_status: string;
    rejection_reason: string | null;
    created_at: string;
};

type Props = {
    adminName: string;
    adminRole: string;
};

export default function PendingUsers({
    adminName,
    adminRole,
}: Props) {
    const [users, setUsers] =
        useState<PortalUser[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [message, setMessage] =
        useState("");

    const [processingId, setProcessingId] =
        useState<number | null>(null);

    // --------------------------------
    // LOAD USERS
    // --------------------------------

    async function loadUsers() {
        try {
            setLoading(true);

            const response = await fetch(
                "/api/admin/users",
                {
                    cache: "no-store",
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                setMessage(
                    data.message ||
                    "Unable to load users."
                );

                return;
            }

            setUsers(data.users);
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
        loadUsers();
    }, []);

    // --------------------------------
    // APPROVE USER
    // --------------------------------

    async function approveUser(
        userId: number
    ) {
        const confirmed =
            window.confirm(
                "Approve this user registration?"
            );

        if (!confirmed) {
            return;
        }

        setProcessingId(userId);
        setMessage("");

        try {
            const response = await fetch(
                `/api/admin/users/${userId}`,
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
                await loadUsers();
            }
        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to approve user."
            );
        } finally {
            setProcessingId(null);
        }
    }

    // --------------------------------
    // REJECT USER
    // --------------------------------

    async function rejectUser(
        userId: number
    ) {
        const reason =
            window.prompt(
                "Enter rejection reason:"
            );

        if (!reason) {
            return;
        }

        setProcessingId(userId);
        setMessage("");

        try {
            const response = await fetch(
                `/api/admin/users/${userId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        action: "REJECT",
                        rejectionReason: reason,
                    }),
                }
            );

            const data =
                await response.json();

            setMessage(data.message);

            if (response.ok) {
                await loadUsers();
            }
        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to reject user."
            );
        } finally {
            setProcessingId(null);
        }
    }

    // --------------------------------
    // FILTER PENDING USERS
    // --------------------------------

    const pendingUsers =
        users.filter(
            (user) =>
                user.account_status ===
                "PENDING"
        );

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

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

            <div className="mx-auto max-w-7xl px-6 py-8">

                {/* ADMIN NAVIGATION */}

                {/* NAVIGATION */}

                <AdminNav
                    adminRole={
                        adminRole
                    }
                />

                {/* TITLE */}

                <div className="mb-7 flex items-start justify-between">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Pending User Approvals
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Review new employee portal registrations.
                        </p>

                    </div>

                    <Link
                        href="/"
                        className="text-sm font-semibold text-gray-500 hover:text-[#b99625]"
                    >
                        ← Back to Portal
                    </Link>

                </div>

                {/* SUMMARY */}

                <div className="mb-6 w-64 border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                    <p className="text-sm uppercase text-gray-500">
                        Pending Requests
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {pendingUsers.length}
                    </p>

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

                        <table className="min-w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Employee ID
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Name
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Department
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Designation
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Email
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Registered
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
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            Loading...
                                        </td>

                                    </tr>
                                ) : pendingUsers.length === 0 ? (
                                    <tr>

                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            No pending registrations.
                                        </td>

                                    </tr>
                                ) : (
                                    pendingUsers.map(
                                        (user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-gray-200 hover:bg-gray-50"
                                            >

                                                {/* EMPLOYEE ID */}

                                                <td className="px-4 py-4 font-semibold text-gray-900">
                                                    {user.employee_id}
                                                </td>

                                                {/* NAME */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {user.full_name}
                                                    </p>

                                                </td>

                                                {/* DEPARTMENT */}

                                                <td className="px-4 py-4 text-gray-700">
                                                    {user.department}
                                                </td>

                                                {/* DESIGNATION */}

                                                <td className="px-4 py-4 text-gray-700">
                                                    {user.designation}
                                                </td>

                                                {/* EMAIL */}

                                                <td className="px-4 py-4 text-gray-700">
                                                    {user.official_email}
                                                </td>

                                                {/* REGISTERED */}

                                                <td className="px-4 py-4 text-sm text-gray-500">

                                                    {new Date(
                                                        user.created_at
                                                    ).toLocaleString()}

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-4 py-4">

                                                    <div className="flex gap-2">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                approveUser(
                                                                    user.id
                                                                )
                                                            }
                                                            disabled={
                                                                processingId ===
                                                                user.id
                                                            }
                                                            className="bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {processingId ===
                                                                user.id
                                                                ? "Processing..."
                                                                : "Approve"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                rejectUser(
                                                                    user.id
                                                                )
                                                            }
                                                            disabled={
                                                                processingId ===
                                                                user.id
                                                            }
                                                            className="bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>

                                                    </div>

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
                    Showing {pendingUsers.length} pending registration
                    {pendingUsers.length !== 1
                        ? "s"
                        : ""}
                </p>

            </div>

        </main>
    );
}