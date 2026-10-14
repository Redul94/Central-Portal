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

type HistoryRecord = {
    id: number;

    asset_id: number;

    inventory_user_id: number;

    assigned_at: string;

    returned_at:
        | string
        | null;

    assignment_status:
        | "ACTIVE"
        | "RETURNED"
        | "TRANSFERRED";

    is_primary_computer: boolean;

    remarks:
        | string
        | null;

    asset_code: string;

    brand:
        | string
        | null;

    model:
        | string
        | null;

    serial_number:
        | string
        | null;

    asset_status: string;

    category_code: string;

    category_name: string;

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

    mobile_no:
        | string
        | null;

    user_location:
        | string
        | null;

    assigned_by_name:
        | string
        | null;

    created_at: string;

    updated_at: string;
};

type AssetFilter = {
    id: number;

    asset_code: string;

    brand:
        | string
        | null;

    model:
        | string
        | null;

    category_name: string;
};

type UserFilter = {
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
};

type Summary = {
    total_history: number;
    active_count: number;
    returned_count: number;
    transferred_count: number;
};

// ==========================================
// DATE
// ==========================================

function prettyDate(
    value:
        | string
        | null
) {
    if (!value) {
        return "—";
    }

    const dateOnly =
        String(
            value
        ).slice(
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

// ==========================================
// COMPONENT
// ==========================================

export default function InventoryHistory() {
    const [
        history,
        setHistory,
    ] =
        useState<
            HistoryRecord[]
        >([]);

    const [
        assets,
        setAssets,
    ] =
        useState<
            AssetFilter[]
        >([]);

    const [
        users,
        setUsers,
    ] =
        useState<
            UserFilter[]
        >([]);

    const [
        summary,
        setSummary,
    ] =
        useState<Summary>({
            total_history: 0,
            active_count: 0,
            returned_count: 0,
            transferred_count: 0,
        });

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        status,
        setStatus,
    ] =
        useState("");

    const [
        assetId,
        setAssetId,
    ] =
        useState("");

    const [
        userId,
        setUserId,
    ] =
        useState("");

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

    // ==========================================
    // LOAD HISTORY
    // ==========================================

    const loadHistory =
        useCallback(
            async (
                searchValue = "",
                statusValue = "",
                assetValue = "",
                userValue = ""
            ) => {
                try {
                    setLoading(
                        true
                    );

                    setMessage("");

                    const params =
                        new URLSearchParams();

                    if (
                        searchValue.trim()
                    ) {
                        params.set(
                            "search",
                            searchValue.trim()
                        );
                    }

                    if (
                        statusValue
                    ) {
                        params.set(
                            "status",
                            statusValue
                        );
                    }

                    if (
                        assetValue
                    ) {
                        params.set(
                            "assetId",
                            assetValue
                        );
                    }

                    if (
                        userValue
                    ) {
                        params.set(
                            "userId",
                            userValue
                        );
                    }

                    const query =
                        params.toString();

                    const response =
                        await fetch(
                            `/api/admin/inventory/history${
                                query
                                    ? `?${query}`
                                    : ""
                            }`,
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
                            "Unable to load inventory history."
                        );

                        return;
                    }

                    setHistory(
                        data.history ||
                        []
                    );

                    setAssets(
                        data.assets ||
                        []
                    );

                    setUsers(
                        data.users ||
                        []
                    );

                    setSummary(
                        data.summary || {
                            total_history: 0,
                            active_count: 0,
                            returned_count: 0,
                            transferred_count: 0,
                        }
                    );

                } catch (error) {
                    console.error(
                        error
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
        loadHistory();
    }, [
        loadHistory,
    ]);

    // ==========================================
    // FILTER
    // ==========================================

    async function submitFilter(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        await loadHistory(
            search,
            status,
            assetId,
            userId
        );
    }

    function clearFilter() {
        setSearch("");

        setStatus("");

        setAssetId("");

        setUserId("");

        loadHistory();
    }

    // ==========================================
    // STATUS STYLE
    // ==========================================

    function statusStyle(
        value: string
    ) {
        switch (
            value
        ) {
            case "ACTIVE":
                return "border-green-300 bg-green-50 text-green-700";

            case "RETURNED":
                return "border-blue-300 bg-blue-50 text-blue-700";

            case "TRANSFERRED":
                return "border-orange-300 bg-orange-50 text-orange-700";

            default:
                return "border-gray-300 bg-gray-100 text-gray-700";
        }
    }

    // ==========================================
    // CLASSES
    // ==========================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]";

    return (
        <>
            {/* TITLE */}

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                <div>

                    <h2 className="text-2xl font-bold text-gray-900">
                        Asset History
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Complete device ownership history including
                        assignments, returns and transfers.
                    </p>

                </div>

                <div className="flex flex-wrap gap-3">

                    <Link
                        href="/admin/inventory"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        ← Inventory Dashboard
                    </Link>

                    <Link
                        href="/admin/inventory/assignments"
                        className="bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#292929]"
                    >
                        Asset Assignment
                    </Link>

                </div>

            </div>

            {/* KPI */}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Total History
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {summary.total_history}
                    </p>

                </div>

                <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Active
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {summary.active_count}
                    </p>

                </div>

                <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Returned
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-600">
                        {summary.returned_count}
                    </p>

                </div>

                <div className="border-l-[3px] border-orange-500 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Transferred
                    </p>

                    <p className="mt-2 text-3xl font-bold text-orange-600">
                        {summary.transferred_count}
                    </p>

                </div>

            </div>

            {/* MESSAGE */}

            {message && (

                <div className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {message}
                </div>

            )}

            {/* FILTER */}

            <section className="mb-5 border border-gray-200 bg-white p-4 shadow-sm">

                <form
                    onSubmit={
                        submitFilter
                    }
                    className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]"
                >

                    <input
                        type="text"
                        value={
                            search
                        }
                        onChange={(
                            event
                        ) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search Asset ID, employee, department, brand, model or serial..."
                        className={inputClass}
                    />

                    <select
                        value={
                            assetId
                        }
                        onChange={(
                            event
                        ) =>
                            setAssetId(
                                event.target.value
                            )
                        }
                        className={inputClass}
                    >

                        <option value="">
                            All Assets
                        </option>

                        {assets.map(
                            (
                                asset
                            ) => (

                                <option
                                    key={
                                        asset.id
                                    }
                                    value={
                                        asset.id
                                    }
                                >
                                    {asset.asset_code}
                                    {" - "}
                                    {asset.category_name}
                                </option>

                            )
                        )}

                    </select>

                    <select
                        value={
                            userId
                        }
                        onChange={(
                            event
                        ) =>
                            setUserId(
                                event.target.value
                            )
                        }
                        className={inputClass}
                    >

                        <option value="">
                            All Employees
                        </option>

                        {users.map(
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
                                </option>

                            )
                        )}

                    </select>

                    <select
                        value={
                            status
                        }
                        onChange={(
                            event
                        ) =>
                            setStatus(
                                event.target.value
                            )
                        }
                        className={inputClass}
                    >

                        <option value="">
                            All Status
                        </option>

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="RETURNED">
                            Returned
                        </option>

                        <option value="TRANSFERRED">
                            Transferred
                        </option>

                    </select>

                    <button
                        type="submit"
                        className="h-11 bg-[#111111] px-6 text-sm font-bold text-white hover:bg-[#292929]"
                    >
                        Search
                    </button>

                    <button
                        type="button"
                        onClick={
                            clearFilter
                        }
                        className="h-11 border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        Clear
                    </button>

                </form>

            </section>

            {/* HISTORY TABLE */}

            <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-200 px-5 py-4">

                    <h3 className="font-bold text-gray-900">
                        Assignment History
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        Showing {history.length} record(s)
                    </p>

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-[1600px] w-full">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="px-4 py-4 text-left text-sm">
                                    Asset
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Device Type
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Employee
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Department
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Assigned Date
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Return / Transfer Date
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Assigned By
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Primary
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Status
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Remarks
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan={
                                            10
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        Loading asset history...
                                    </td>

                                </tr>

                            ) : history.length ===
                                0 ? (

                                <tr>

                                    <td
                                        colSpan={
                                            10
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        No asset history found.
                                    </td>

                                </tr>

                            ) : (

                                history.map(
                                    (
                                        record
                                    ) => (

                                        <tr
                                            key={
                                                record.id
                                            }
                                            className="border-b border-gray-200 align-top hover:bg-gray-50"
                                        >

                                            {/* ASSET */}

                                            <td className="px-4 py-4">

                                                <p className="font-bold text-gray-900">
                                                    {record.asset_code}
                                                </p>

                                                {record.brand && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {record.brand}
                                                        {record.model
                                                            ? ` ${record.model}`
                                                            : ""}
                                                    </p>

                                                )}

                                                {record.serial_number && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        SN:{" "}
                                                        {record.serial_number}
                                                    </p>

                                                )}

                                            </td>

                                            {/* TYPE */}

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {record.category_name}
                                            </td>

                                            {/* EMPLOYEE */}

                                            <td className="px-4 py-4">

                                                <p className="font-semibold text-gray-900">
                                                    {record.full_name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {record.employee_id ||
                                                        "No Employee ID"}
                                                </p>

                                                {record.designation && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {record.designation}
                                                    </p>

                                                )}

                                            </td>

                                            {/* DEPARTMENT */}

                                            <td className="px-4 py-4">

                                                <p className="text-sm text-gray-700">
                                                    {record.department ||
                                                        "—"}
                                                </p>

                                                {record.user_location && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {record.user_location}
                                                    </p>

                                                )}

                                            </td>

                                            {/* ASSIGNED */}

                                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                {prettyDate(
                                                    record.assigned_at
                                                )}
                                            </td>

                                            {/* RETURNED */}

                                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                {prettyDate(
                                                    record.returned_at
                                                )}
                                            </td>

                                            {/* ASSIGNED BY */}

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {record.assigned_by_name ||
                                                    "—"}
                                            </td>

                                            {/* PRIMARY */}

                                            <td className="px-4 py-4 text-center">

                                                {record.is_primary_computer ? (

                                                    <span className="inline-block border border-[#d4af37] bg-[#fff8df] px-3 py-1 text-xs font-bold text-gray-900">
                                                        PRIMARY
                                                    </span>

                                                ) : (

                                                    <span className="text-gray-400">
                                                        —
                                                    </span>

                                                )}

                                            </td>

                                            {/* STATUS */}

                                            <td className="px-4 py-4">

                                                <span
                                                    className={`inline-block border px-3 py-1 text-xs font-bold ${statusStyle(
                                                        record.assignment_status
                                                    )}`}
                                                >
                                                    {record.assignment_status}
                                                </span>

                                            </td>

                                            {/* REMARKS */}

                                            <td className="max-w-[280px] px-4 py-4 text-sm whitespace-pre-line text-gray-700">
                                                {record.remarks ||
                                                    "—"}
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