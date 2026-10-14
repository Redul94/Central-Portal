"use client";

import Link from "next/link";

import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

// ==========================================
// TYPES
// ==========================================

type PortalUser = {
    id: number;

    employee_id:
        | string
        | null;

    full_name: string;

    designation:
        | string
        | null;

    department:
        | string
        | null;

    official_email:
        | string
        | null;

    role: string;
};

type SupportStaff = {
    id: number;

    portal_user_id: number;

    staff_title:
        | string
        | null;

    can_receive_tickets: boolean;

    is_active: boolean;

    created_at: string;

    updated_at: string;

    employee_id:
        | string
        | null;

    full_name: string;

    designation:
        | string
        | null;

    department:
        | string
        | null;

    official_email:
        | string
        | null;

    role: string;

    account_status: string;

    active_ticket_count: number;
};

// ==========================================
// COMPONENT
// ==========================================

export default function SupportStaffManagement() {
    const [
        staff,
        setStaff,
    ] =
        useState<
            SupportStaff[]
        >([]);

    const [
        portalUsers,
        setPortalUsers,
    ] =
        useState<
            PortalUser[]
        >([]);

    const [
        portalUserId,
        setPortalUserId,
    ] =
        useState("");

    const [
        staffTitle,
        setStaffTitle,
    ] =
        useState("");

    const [
        canReceiveTickets,
        setCanReceiveTickets,
    ] =
        useState(true);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        processing,
        setProcessing,
    ] =
        useState(false);

    const [
        processingStaffId,
        setProcessingStaffId,
    ] =
        useState<
            number |
            null
        >(null);

    const [
        message,
        setMessage,
    ] =
        useState("");

    const [
        success,
        setSuccess,
    ] =
        useState(false);

    // ==========================================
    // LOAD
    // ==========================================

    const loadStaff =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const response =
                        await fetch(
                            "/api/admin/support/staff",
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
                        setSuccess(
                            false
                        );

                        setMessage(
                            data.message ||
                            "Unable to load IT Support Staff."
                        );

                        return;
                    }

                    setStaff(
                        data.staff ||
                        []
                    );

                    setPortalUsers(
                        data.availablePortalUsers ||
                        []
                    );

                } catch (error) {
                    console.error(
                        error
                    );

                    setSuccess(
                        false
                    );

                    setMessage(
                        "Unable to connect to server."
                    );

                } finally {
                    setLoading(
                        false
                    );
                }
            },
            []
        );

    useEffect(() => {
        loadStaff();
    }, [
        loadStaff,
    ]);

    // ==========================================
    // ADD STAFF
    // ==========================================

    async function addStaff(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !portalUserId
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select a portal user."
            );

            return;
        }

        setProcessing(
            true
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/admin/support/staff",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                portalUserId,
                                staffTitle,
                                canReceiveTickets,
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to add IT Support Staff."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "IT Support Staff added successfully."
            );

            setPortalUserId(
                ""
            );

            setStaffTitle(
                ""
            );

            setCanReceiveTickets(
                true
            );

            await loadStaff();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to connect to server."
            );

        } finally {
            setProcessing(
                false
            );
        }
    }

    // ==========================================
    // UPDATE STAFF
    // ==========================================

    async function updateStaff(
        member:
            SupportStaff,
        updates: {
            staffTitle?: string;
            canReceiveTickets?: boolean;
            isActive?: boolean;
        }
    ) {
        setProcessingStaffId(
            member.id
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/admin/support/staff/${member.id}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                staffTitle:
                                    updates.staffTitle ??
                                    member.staff_title ??
                                    "",

                                canReceiveTickets:
                                    updates.canReceiveTickets ??
                                    member.can_receive_tickets,

                                isActive:
                                    updates.isActive ??
                                    member.is_active,
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to update IT Support Staff."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "IT Support Staff updated successfully."
            );

            await loadStaff();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to connect to server."
            );

        } finally {
            setProcessingStaffId(
                null
            );
        }
    }

    // ==========================================
    // INLINE TITLE
    // ==========================================

    function changeLocalTitle(
        staffId: number,
        value: string
    ) {
        setStaff(
            (
                previous
            ) =>
                previous.map(
                    (
                        member
                    ) =>
                        member.id ===
                        staffId
                            ? {
                                ...member,
                                staff_title:
                                    value,
                            }
                            : member
                )
        );
    }

    // ==========================================
    // CLASSES
    // ==========================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-semibold text-gray-700";

    return (
        <>
            {/* TITLE */}

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                <div>

                    <h2 className="text-2xl font-bold text-gray-900">
                        IT Support Staff
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Select which portal users can receive
                        and process IT Support tickets.
                    </p>

                </div>

                <div className="flex flex-wrap gap-3">

                    <Link
                        href="/admin/support"
                        className="bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#292929]"
                    >
                        ← IT Support Management
                    </Link>

                    <Link
                        href="/admin/inventory"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        Inventory
                    </Link>

                </div>

            </div>

            {/* MESSAGE */}

            {message && (

                <div
                    className={`mb-6 border px-4 py-3 text-sm font-semibold ${
                        success
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-red-300 bg-red-50 text-red-700"
                    }`}
                >
                    {message}
                </div>

            )}

            {/* KPI */}

            <div className="mb-6 grid gap-4 sm:grid-cols-3">

                <Kpi
                    label="Total IT Staff"
                    value={
                        staff.length
                    }
                />

                <Kpi
                    label="Active Staff"
                    value={
                        staff.filter(
                            (
                                member
                            ) =>
                                member.is_active
                        ).length
                    }
                />

                <Kpi
                    label="Can Receive Tickets"
                    value={
                        staff.filter(
                            (
                                member
                            ) =>
                                member.is_active &&
                                member.can_receive_tickets
                        ).length
                    }
                />

            </div>

            {/* ================================= */}
            {/* ADD STAFF                         */}
            {/* ================================= */}

            <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                <h3 className="text-lg font-bold text-gray-900">
                    Add IT Support Staff
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                    Select an existing active portal user.
                    Their main portal role does not need to be changed.
                </p>

                <form
                    onSubmit={
                        addStaff
                    }
                    className="mt-6"
                >

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                        <div className="xl:col-span-2">

                            <label className={labelClass}>
                                Portal User *
                            </label>

                            <select
                                value={
                                    portalUserId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setPortalUserId(
                                        event.target.value
                                    )
                                }
                                required
                                className={inputClass}
                            >

                                <option value="">
                                    Select employee
                                </option>

                                {portalUsers.map(
                                    (
                                        user
                                    ) => (

                                        <option
                                            key={
                                                user.id
                                            }
                                            value={
                                                user.id
                                            }
                                        >
                                            {user.employee_id
                                                ? `${user.employee_id} - `
                                                : ""}
                                            {user.full_name}
                                            {user.department
                                                ? ` (${user.department})`
                                                : ""}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        <div>

                            <label className={labelClass}>
                                Support Title
                            </label>

                            <input
                                type="text"
                                value={
                                    staffTitle
                                }
                                onChange={(
                                    event
                                ) =>
                                    setStaffTitle(
                                        event.target.value
                                    )
                                }
                                placeholder="e.g. IT Engineer"
                                className={inputClass}
                            />

                        </div>

                        <div>

                            <label className={labelClass}>
                                Ticket Assignment
                            </label>

                            <label className="flex h-11 items-center gap-3 border border-gray-300 bg-white px-3">

                                <input
                                    type="checkbox"
                                    checked={
                                        canReceiveTickets
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCanReceiveTickets(
                                            event.target.checked
                                        )
                                    }
                                    className="h-4 w-4"
                                />

                                <span className="text-sm font-semibold text-gray-700">
                                    Can receive tickets
                                </span>

                            </label>

                        </div>

                    </div>

                    <div className="mt-6 flex justify-end">

                        <button
                            type="submit"
                            disabled={
                                processing ||
                                !portalUserId
                            }
                            className="h-11 bg-[#d4af37] px-8 font-bold text-black hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing
                                ? "Adding..."
                                : "Add IT Support Staff"}
                        </button>

                    </div>

                </form>

            </section>

            {/* ================================= */}
            {/* STAFF TABLE                       */}
            {/* ================================= */}

            <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-200 px-5 py-4">

                    <h3 className="font-bold text-gray-900">
                        Current IT Support Staff
                    </h3>

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-[1300px] w-full">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="px-4 py-4 text-left text-sm">
                                    Employee
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Department
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Portal Designation
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Support Title
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Active Tickets
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Receive Tickets
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Staff Status
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Action
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        Loading IT Support Staff...
                                    </td>

                                </tr>

                            ) : staff.length ===
                                0 ? (

                                <tr>

                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        No IT Support Staff configured yet.
                                    </td>

                                </tr>

                            ) : (

                                staff.map(
                                    (
                                        member
                                    ) => (

                                        <tr
                                            key={
                                                member.id
                                            }
                                            className="border-b border-gray-200 align-top hover:bg-gray-50"
                                        >

                                            {/* EMPLOYEE */}

                                            <td className="px-4 py-4">

                                                <p className="font-semibold text-gray-900">
                                                    {member.full_name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {member.employee_id ||
                                                        "No Employee ID"}
                                                </p>

                                                {member.official_email && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {member.official_email}
                                                    </p>

                                                )}

                                            </td>

                                            {/* DEPARTMENT */}

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {member.department ||
                                                    "—"}
                                            </td>

                                            {/* DESIGNATION */}

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {member.designation ||
                                                    "—"}
                                            </td>

                                            {/* SUPPORT TITLE */}

                                            <td className="min-w-[230px] px-4 py-4">

                                                <input
                                                    type="text"
                                                    value={
                                                        member.staff_title ||
                                                        ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        changeLocalTitle(
                                                            member.id,
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="IT Engineer"
                                                    className="h-10 w-full border border-gray-300 px-3 text-sm outline-none focus:border-[#d4af37]"
                                                />

                                            </td>

                                            {/* ACTIVE TICKETS */}

                                            <td className="px-4 py-4 text-center">

                                                <span className="inline-flex min-w-10 justify-center bg-[#fff8df] px-3 py-1 text-sm font-bold text-gray-900">
                                                    {member.active_ticket_count}
                                                </span>

                                            </td>

                                            {/* RECEIVE */}

                                            <td className="px-4 py-4 text-center">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        member.can_receive_tickets
                                                    }
                                                    disabled={
                                                        processingStaffId ===
                                                        member.id
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateStaff(
                                                            member,
                                                            {
                                                                canReceiveTickets:
                                                                    event.target.checked,
                                                            }
                                                        )
                                                    }
                                                    className="h-5 w-5"
                                                />

                                            </td>

                                            {/* ACTIVE */}

                                            <td className="px-4 py-4 text-center">

                                                {member.is_active ? (

                                                    <span className="border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                                        ACTIVE
                                                    </span>

                                                ) : (

                                                    <span className="border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                                        INACTIVE
                                                    </span>

                                                )}

                                            </td>

                                            {/* ACTION */}

                                            <td className="px-4 py-4">

                                                <div className="flex justify-center gap-2">

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processingStaffId ===
                                                            member.id
                                                        }
                                                        onClick={() =>
                                                            updateStaff(
                                                                member,
                                                                {
                                                                    staffTitle:
                                                                        member.staff_title ||
                                                                        "",
                                                                }
                                                            )
                                                        }
                                                        className="h-9 border border-[#d4af37] bg-[#fff8df] px-3 text-xs font-bold text-gray-900 hover:bg-[#f6e6a7] disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processingStaffId ===
                                                            member.id
                                                        }
                                                        onClick={() =>
                                                            updateStaff(
                                                                member,
                                                                {
                                                                    isActive:
                                                                        !member.is_active,
                                                                }
                                                            )
                                                        }
                                                        className={
                                                            member.is_active
                                                                ? "h-9 border border-red-300 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                                : "h-9 border border-green-300 bg-green-50 px-3 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                                                        }
                                                    >
                                                        {member.is_active
                                                            ? "Deactivate"
                                                            : "Activate"}
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

            </section>
        </>
    );
}

// ==========================================
// KPI
// ==========================================

function Kpi({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

            <p className="text-xs font-semibold uppercase text-gray-500">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
                {value}
            </p>

        </div>
    );
}