"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import AdminNav from "../admin-nav/page";

type PortalUser = {
    id: number;
    employee_id: string;
    full_name: string;
    department: string;
    designation: string;
    official_email: string;
    role: string;
    account_status: string;
    created_at: string;
    approved_at: string | null;
    last_login_at?: string | null;
};

type Props = {
    adminName: string;
    adminRole: string;
};

export default function UsersTable({
    adminName,
    adminRole,
}: Props) {
    const [users, setUsers] =
        useState<PortalUser[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

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
    // CHANGE STATUS
    // --------------------------------

    async function changeStatus(
        userId: number,
        status: "ACTIVE" | "DISABLED"
    ) {
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
                        action: "SET_STATUS",
                        status,
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
                "Unable to update account status."
            );
        } finally {
            setProcessingId(null);
        }
    }

    // --------------------------------
    // CHANGE ROLE
    // --------------------------------

    async function changeRole(
        userId: number,
        role: string
    ) {
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
                        action: "SET_ROLE",
                        role,
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
                "Unable to change user role."
            );
        } finally {
            setProcessingId(null);
        }
    }

    // --------------------------------
    // FILTER USERS
    // --------------------------------

    const filteredUsers = useMemo(() => {
        const value =
            search.toLowerCase().trim();

        return users.filter((user) => {
            const matchesSearch =
                user.employee_id
                    .toLowerCase()
                    .includes(value) ||
                user.full_name
                    .toLowerCase()
                    .includes(value) ||
                user.department
                    .toLowerCase()
                    .includes(value) ||
                user.designation
                    .toLowerCase()
                    .includes(value) ||
                user.official_email
                    .toLowerCase()
                    .includes(value);

            const matchesStatus =
                statusFilter === "ALL" ||
                user.account_status ===
                statusFilter;

            return (
                matchesSearch &&
                matchesStatus
            );
        });
    }, [
        users,
        search,
        statusFilter,
    ]);

    // --------------------------------
    // COUNTS
    // --------------------------------

    const activeCount = users.filter(
        (user) =>
            user.account_status === "ACTIVE"
    ).length;

    const pendingCount = users.filter(
        (user) =>
            user.account_status === "PENDING"
    ).length;

    const disabledCount = users.filter(
        (user) =>
            user.account_status === "DISABLED"
    ).length;

    function statusStyle(
        status: string
    ) {
        switch (status) {
            case "ACTIVE":
                return "bg-green-100 text-green-700 border-green-300";

            case "PENDING":
                return "bg-yellow-100 text-yellow-700 border-yellow-300";

            case "REJECTED":
                return "bg-red-100 text-red-700 border-red-300";

            case "DISABLED":
                return "bg-gray-200 text-gray-700 border-gray-300";

            default:
                return "bg-gray-100 text-gray-600 border-gray-300";
        }
    }

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

                {/* NAVIGATION */}

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
                            User Management
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            View and manage all Central Portal user accounts.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="text-sm font-semibold text-gray-500 hover:text-[#b99625]"
                    >
                        ← Back to Portal
                    </Link>

                </div>

                {/* KPI */}

                <div className="mb-6 grid gap-4 md:grid-cols-4">

                    <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">
                        <p className="text-sm uppercase text-gray-500">
                            Total Users
                        </p>

                        <p className="mt-2 text-3xl font-bold">
                            {users.length}
                        </p>
                    </div>

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">
                        <p className="text-sm uppercase text-gray-500">
                            Active
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-600">
                            {activeCount}
                        </p>
                    </div>

                    <div className="border-l-[3px] border-yellow-500 bg-white p-5 shadow-sm">
                        <p className="text-sm uppercase text-gray-500">
                            Pending
                        </p>

                        <p className="mt-2 text-3xl font-bold text-yellow-600">
                            {pendingCount}
                        </p>
                    </div>

                    <div className="border-l-[3px] border-gray-500 bg-white p-5 shadow-sm">
                        <p className="text-sm uppercase text-gray-500">
                            Disabled
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-600">
                            {disabledCount}
                        </p>
                    </div>

                </div>

                {/* SEARCH */}

                <div className="mb-5 grid gap-4 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">

                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search employee ID, name, department, designation or email..."
                        className="border border-gray-300 px-4 py-3 outline-none focus:border-[#d4af37]"
                    />

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                        className="border border-gray-300 px-4 py-3 outline-none focus:border-[#d4af37]"
                    >
                        <option value="ALL">
                            All Status
                        </option>

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="PENDING">
                            Pending
                        </option>

                        <option value="REJECTED">
                            Rejected
                        </option>

                        <option value="DISABLED">
                            Disabled
                        </option>
                    </select>

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
                                        Role
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Status
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
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(
                                        (user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-gray-200 hover:bg-gray-50"
                                            >

                                                <td className="px-4 py-4 font-semibold">
                                                    {user.employee_id}
                                                </td>

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold">
                                                        {user.full_name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {user.official_email}
                                                    </p>

                                                </td>

                                                <td className="px-4 py-4">
                                                    {user.department}
                                                </td>

                                                <td className="px-4 py-4">
                                                    {user.designation}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="text-sm font-semibold">
                                                        {user.role}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-semibold ${statusStyle(
                                                            user.account_status
                                                        )}`}
                                                    >
                                                        {user.account_status}
                                                    </span>

                                                </td>

                                                <td className="px-4 py-4 text-sm text-gray-500">

                                                    {new Date(
                                                        user.created_at
                                                    ).toLocaleDateString()}

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-4 py-4">

                                                    <div className="flex min-w-[250px] items-center gap-2">

                                                        {user.account_status ===
                                                            "ACTIVE" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        processingId ===
                                                                        user.id
                                                                    }
                                                                    onClick={() =>
                                                                        changeStatus(
                                                                            user.id,
                                                                            "DISABLED"
                                                                        )
                                                                    }
                                                                    className="border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                                >
                                                                    Disable
                                                                </button>
                                                            )}

                                                        {user.account_status ===
                                                            "DISABLED" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        processingId ===
                                                                        user.id
                                                                    }
                                                                    onClick={() =>
                                                                        changeStatus(
                                                                            user.id,
                                                                            "ACTIVE"
                                                                        )
                                                                    }
                                                                    className="border border-green-300 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                                                                >
                                                                    Enable
                                                                </button>
                                                            )}

                                                        {adminRole ===
                                                            "SUPER_ADMIN" &&
                                                            user.account_status !==
                                                            "PENDING" && (
                                                                <select
                                                                    value={
                                                                        user.role
                                                                    }
                                                                    disabled={
                                                                        processingId ===
                                                                        user.id
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        changeRole(
                                                                            user.id,
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className="border border-gray-300 bg-white px-2 py-2 text-xs font-semibold outline-none focus:border-[#d4af37]"
                                                                >
                                                                    <option value="USER">
                                                                        User
                                                                    </option>

                                                                    <option value="ADMIN">
                                                                        Admin
                                                                    </option>

                                                                    <option value="SUPER_ADMIN">
                                                                        Super Admin
                                                                    </option>
                                                                </select>
                                                            )}

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

                <p className="mt-3 text-sm text-gray-500">
                    Showing {filteredUsers.length} of{" "}
                    {users.length} users
                </p>

            </div>
        </main>
    );
}