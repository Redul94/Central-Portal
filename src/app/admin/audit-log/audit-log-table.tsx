"use client";

import Link from "next/link";
import {
    Fragment,
    useEffect,
    useMemo,
    useState,
} from "react";
import AdminNav from "../admin-nav/page";

type AuditLog = {
    id: number;

    user_id:
    | number
    | null;

    action: string;

    module: string;

    record_type:
    | string
    | null;

    record_id:
    | number
    | null;

    description:
    | string
    | null;

    metadata:
    | Record<string, unknown>
    | null;

    ip_address:
    | string
    | null;

    created_at: string;

    employee_id:
    | string
    | null;

    full_name:
    | string
    | null;

    role:
    | string
    | null;
};

type Props = {
    adminName: string;
    adminRole: string;
};

export default function AuditLogTable({
    adminName,
    adminRole,
}: Props) {
    const [logs, setLogs] =
        useState<AuditLog[]>([]);

    const [modules, setModules] =
        useState<string[]>([]);

    const [actions, setActions] =
        useState<string[]>([]);

    const [search, setSearch] =
        useState("");

    const [moduleFilter, setModuleFilter] =
        useState("");

    const [actionFilter, setActionFilter] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [message, setMessage] =
        useState("");

    const [
        expandedId,
        setExpandedId,
    ] = useState<number | null>(
        null
    );

    // --------------------------------
    // LOAD AUDIT LOG
    // --------------------------------

    async function loadLogs() {
        try {
            setLoading(true);
            setMessage("");

            const params =
                new URLSearchParams();

            if (search.trim()) {
                params.set(
                    "search",
                    search.trim()
                );
            }

            if (moduleFilter) {
                params.set(
                    "module",
                    moduleFilter
                );
            }

            if (actionFilter) {
                params.set(
                    "action",
                    actionFilter
                );
            }

            const query =
                params.toString();

            const response =
                await fetch(
                    `/api/admin/audit-log${query
                        ? `?${query}`
                        : ""
                    }`,
                    {
                        cache: "no-store",
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                setMessage(
                    data.message ||
                    "Unable to load audit log."
                );

                return;
            }

            setLogs(
                data.logs || []
            );

            setModules(
                data.modules || []
            );

            setActions(
                data.actions || []
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

    // --------------------------------
    // INITIAL LOAD
    // --------------------------------

    useEffect(() => {
        loadLogs();

        // Initial load only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --------------------------------
    // SEARCH
    // --------------------------------

    function handleSearch(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        loadLogs();
    }

    // --------------------------------
    // CLEAR FILTER
    // --------------------------------

    async function clearFilters() {
        setSearch("");
        setModuleFilter("");
        setActionFilter("");
        setExpandedId(null);

        try {
            setLoading(true);
            setMessage("");

            const response =
                await fetch(
                    "/api/admin/audit-log",
                    {
                        cache: "no-store",
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                setMessage(
                    data.message ||
                    "Unable to load audit log."
                );

                return;
            }

            setLogs(
                data.logs || []
            );

            setModules(
                data.modules || []
            );

            setActions(
                data.actions || []
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

    // --------------------------------
    // TODAY COUNT
    // --------------------------------

    const todayCount =
        useMemo(() => {
            const now =
                new Date();

            return logs.filter(
                (log) => {
                    const date =
                        new Date(
                            log.created_at
                        );

                    return (
                        date.getFullYear() ===
                        now.getFullYear() &&
                        date.getMonth() ===
                        now.getMonth() &&
                        date.getDate() ===
                        now.getDate()
                    );
                }
            ).length;

        }, [logs]);

    // --------------------------------
    // ACTION STYLE
    // --------------------------------

    function actionStyle(
        action: string
    ) {
        if (
            action.includes(
                "APPROVE"
            )
        ) {
            return "border-green-300 bg-green-50 text-green-700";
        }

        if (
            action.includes(
                "REJECT"
            ) ||
            action.includes(
                "DISABLE"
            )
        ) {
            return "border-red-300 bg-red-50 text-red-700";
        }

        if (
            action.includes(
                "CANCEL"
            )
        ) {
            return "border-orange-300 bg-orange-50 text-orange-700";
        }

        if (
            action.includes(
                "CHANGE"
            ) ||
            action.includes(
                "RESCHEDULE"
            )
        ) {
            return "border-yellow-300 bg-yellow-50 text-yellow-800";
        }

        if (
            action.includes(
                "COMPLETE"
            )
        ) {
            return "border-blue-300 bg-blue-50 text-blue-700";
        }

        return "border-gray-300 bg-gray-100 text-gray-700";
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5">

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

            <div className="mx-auto max-w-[1600px] px-6 py-8">

                {/* NAVIGATION */}

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
                            Audit Log
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Review important administrative and system activities.
                        </p>

                    </div>

                    <Link
                        href="/"
                        className="text-sm font-semibold text-gray-600 hover:text-[#b99625]"
                    >
                        ← Back to Portal
                    </Link>

                </div>

                {/* SUMMARY */}

                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Displayed Logs
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            {logs.length}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Today
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            {todayCount}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-gray-700 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Access
                        </p>

                        <p className="mt-2 text-lg font-bold text-gray-900">
                            Super Admin Only
                        </p>

                    </div>

                </div>

                {/* FILTER */}

                <form
                    onSubmit={
                        handleSearch
                    }
                    className="mb-6 bg-white p-5 shadow-sm"
                >

                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_auto_auto]">

                        {/* SEARCH */}

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search user, employee ID, action, description..."
                            className="border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                        />

                        {/* MODULE */}

                        <select
                            value={
                                moduleFilter
                            }
                            onChange={(event) =>
                                setModuleFilter(
                                    event.target.value
                                )
                            }
                            className="border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#d4af37]"
                        >

                            <option value="">
                                All Modules
                            </option>

                            {modules.map(
                                (module) => (
                                    <option
                                        key={
                                            module
                                        }
                                        value={
                                            module
                                        }
                                    >
                                        {module}
                                    </option>
                                )
                            )}

                        </select>

                        {/* ACTION */}

                        <select
                            value={
                                actionFilter
                            }
                            onChange={(event) =>
                                setActionFilter(
                                    event.target.value
                                )
                            }
                            className="border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#d4af37]"
                        >

                            <option value="">
                                All Actions
                            </option>

                            {actions.map(
                                (action) => (
                                    <option
                                        key={
                                            action
                                        }
                                        value={
                                            action
                                        }
                                    >
                                        {action}
                                    </option>
                                )
                            )}

                        </select>

                        {/* SEARCH BUTTON */}

                        <button
                            type="submit"
                            className="bg-[#d4af37] px-6 py-3 font-bold text-black hover:bg-[#b99625]"
                        >
                            Search
                        </button>

                        {/* CLEAR BUTTON */}

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:border-gray-500"
                        >
                            Clear
                        </button>

                    </div>

                </form>

                {/* MESSAGE */}

                {message && (
                    <div className="mb-5 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {message}
                    </div>
                )}

                {/* TABLE */}

                <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-[1350px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Date / Time
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        User
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Module
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Action
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Record
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Description
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        IP
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Details
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
                                            Loading audit log...
                                        </td>

                                    </tr>

                                ) : logs.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            No audit records found.
                                        </td>

                                    </tr>

                                ) : (

                                    logs.map(
                                        (log) => (

                                            <Fragment key={log.id}>

                                                {/* MAIN ROW */}

                                                <tr className="border-b border-gray-200 align-top hover:bg-gray-50">

                                                    {/* DATE */}

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">

                                                        {new Date(
                                                            log.created_at
                                                        ).toLocaleString()}

                                                    </td>

                                                    {/* USER */}

                                                    <td className="px-4 py-4">

                                                        <p className="font-semibold text-gray-900">
                                                            {log.full_name ||
                                                                "System"}
                                                        </p>

                                                        {log.employee_id && (
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {
                                                                    log.employee_id
                                                                }
                                                            </p>
                                                        )}

                                                        {log.role && (
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {
                                                                    log.role
                                                                }
                                                            </p>
                                                        )}

                                                    </td>

                                                    {/* MODULE */}

                                                    <td className="px-4 py-4">

                                                        <span className="inline-block border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                                                            {log.module}
                                                        </span>

                                                    </td>

                                                    {/* ACTION */}

                                                    <td className="px-4 py-4">

                                                        <span
                                                            className={`inline-block whitespace-nowrap border px-3 py-1 text-xs font-semibold ${actionStyle(
                                                                log.action
                                                            )}`}
                                                        >
                                                            {log.action}
                                                        </span>

                                                    </td>

                                                    {/* RECORD */}

                                                    <td className="px-4 py-4 text-sm text-gray-700">

                                                        <p>
                                                            {log.record_type ||
                                                                "—"}
                                                        </p>

                                                        {log.record_id !==
                                                            null && (
                                                                <p className="mt-1 text-xs text-gray-500">
                                                                    ID:{" "}
                                                                    {
                                                                        log.record_id
                                                                    }
                                                                </p>
                                                            )}

                                                    </td>

                                                    {/* DESCRIPTION */}

                                                    <td className="max-w-[420px] px-4 py-4 text-sm text-gray-700">
                                                        {log.description ||
                                                            "—"}
                                                    </td>

                                                    {/* IP */}

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                                                        {log.ip_address ||
                                                            "—"}
                                                    </td>

                                                    {/* DETAILS */}

                                                    <td className="px-4 py-4">

                                                        {log.metadata ? (

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setExpandedId(
                                                                        expandedId ===
                                                                            log.id
                                                                            ? null
                                                                            : log.id
                                                                    )
                                                                }
                                                                className="border border-[#d4af37] bg-[#fff8df] px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-[#f6e9b0]"
                                                            >
                                                                {expandedId ===
                                                                    log.id
                                                                    ? "Hide"
                                                                    : "View"}
                                                            </button>

                                                        ) : (

                                                            <span className="text-gray-400">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                </tr>

                                                {/* EXPANDED DETAILS */}

                                                {expandedId ===
                                                    log.id &&
                                                    log.metadata && (

                                                        <tr className="border-b border-gray-200 bg-[#fafafa]">

                                                            <td
                                                                colSpan={8}
                                                                className="px-6 py-5"
                                                            >

                                                                <div className="flex items-center justify-between">

                                                                    <p className="text-sm font-bold text-gray-900">
                                                                        Audit Details
                                                                    </p>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setExpandedId(
                                                                                null
                                                                            )
                                                                        }
                                                                        className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                                                                    >
                                                                        Close
                                                                    </button>

                                                                </div>

                                                                <pre className="mt-3 max-h-[350px] overflow-auto whitespace-pre-wrap border border-gray-200 bg-white p-4 text-xs leading-6 text-gray-700">
                                                                    {JSON.stringify(
                                                                        log.metadata,
                                                                        null,
                                                                        2
                                                                    )}
                                                                </pre>

                                                            </td>

                                                        </tr>

                                                    )}

                                            </Fragment>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

                {/* FOOTER */}

                <p className="mt-3 text-sm text-gray-500">
                    Maximum 500 records are displayed per search.
                </p>

            </div>

        </main>
    );
}