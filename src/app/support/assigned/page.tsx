"use client";

import Link from "next/link";
import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";

import PortalHeader from "@/components/portal-header";

// ==========================================
// TYPES
// ==========================================

type Staff = {
    id: number;
    supportStaffId: number;
    employeeId: string | null;
    fullName: string;
    designation: string | null;
    department: string | null;
    staffTitle: string | null;
    canReceiveTickets: boolean;
};

type TicketStatus =
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "WAITING_FOR_ADMIN"
    | "WAITING_FOR_USER"
    | "DONE"
    | "CANCELLED";

type Priority =
    | "LOW"
    | "NORMAL"
    | "HIGH"
    | "CRITICAL";

type Ticket = {
    id: number;

    ticket_no: string | null;

    inventory_user_id:
    | number
    | null;

    requester_mode:
    | "EXISTING"
    | "MANUAL";

    asset_id:
    | number
    | null;

    subject: string;

    issue_category:
    | string
    | null;

    problem_description: string;

    priority: Priority;

    ticket_status: TicketStatus;

    admin_note:
    | string
    | null;

    resolution_summary:
    | string
    | null;

    opened_at: string;

    assigned_at:
    | string
    | null;

    tna_at:
    | string
    | null;

    work_started_at:
    | string
    | null;

    completed_at:
    | string
    | null;

    employee_id:
    | string
    | null;

    user_name: string;

    user_designation:
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

    asset_code:
    | string
    | null;

    brand:
    | string
    | null;

    model:
    | string
    | null;

    serial_number:
    | string
    | null;

    processor:
    | string
    | null;

    ram_version:
    | string
    | null;

    storage_info:
    | string
    | null;

    windows_version:
    | string
    | null;

    office_version:
    | string
    | null;

    ad_or_workgroup:
    | string
    | null;

    email_365:
    | string
    | null;

    endpoint_security:
    | string
    | null;

    category_name:
    | string
    | null;

    created_by_name:
    | string
    | null;

    assigned_by_name:
    | string
    | null;

    comment_count: number;
};

type Summary = {
    total: number;
    assigned: number;
    in_progress: number;
    waiting_for_admin: number;
    waiting_for_user: number;
    done: number;
};

type ListResponse = {
    success: boolean;

    message?: string;

    staff: Staff;

    tickets: Ticket[];

    summary: Summary;
};

type TicketDetail = {
    id: number;

    ticket_no:
    | string
    | null;

    inventory_user_id?:
    | number
    | null;

    requester_mode?:
    | "EXISTING"
    | "MANUAL";

    subject: string;

    issue_category:
    | string
    | null;

    problem_description: string;

    priority: string;

    ticket_status: string;

    admin_note:
    | string
    | null;

    resolution_summary:
    | string
    | null;

    opened_at: string;

    assigned_at:
    | string
    | null;

    tna_at:
    | string
    | null;

    work_started_at:
    | string
    | null;

    completed_at:
    | string
    | null;

    employee_id:
    | string
    | null;

    user_name: string;

    user_designation:
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

    asset_id:
    | number
    | null;

    asset_code:
    | string
    | null;

    brand:
    | string
    | null;

    model:
    | string
    | null;

    serial_number:
    | string
    | null;

    processor:
    | string
    | null;

    ram_version:
    | string
    | null;

    storage_info:
    | string
    | null;

    windows_version:
    | string
    | null;

    office_version:
    | string
    | null;

    ad_or_workgroup:
    | string
    | null;

    email_365:
    | string
    | null;

    endpoint_security:
    | string
    | null;

    computer_maintenance_status:
    | string
    | null;

    data_backup_status:
    | string
    | null;

    category_name:
    | string
    | null;
};

type Comment = {
    id: number;

    comment_text: string;

    created_at: string;

    commented_by_id: number;

    employee_id:
    | string
    | null;

    commented_by_name: string;

    commented_by_designation:
    | string
    | null;

    commented_by_role: string;
};

// ==========================================
// HELPERS
// ==========================================

function prettyDateTime(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function statusText(
    status: string
) {
    return status.replaceAll(
        "_",
        " "
    );
}

function statusStyle(
    status: string
) {
    switch (status) {
        case "ASSIGNED":
            return "border-purple-300 bg-purple-50 text-purple-700";

        case "IN_PROGRESS":
            return "border-[#d4af37] bg-[#fff8df] text-[#6f5a12]";

        case "WAITING_FOR_ADMIN":
            return "border-orange-300 bg-orange-50 text-orange-700";

        case "WAITING_FOR_USER":
            return "border-yellow-300 bg-yellow-50 text-yellow-700";

        case "DONE":
            return "border-green-300 bg-green-50 text-green-700";

        case "CANCELLED":
            return "border-gray-300 bg-gray-100 text-gray-600";

        default:
            return "border-gray-300 bg-white text-gray-700";
    }
}

function priorityStyle(
    priority: string
) {
    switch (priority) {
        case "CRITICAL":
            return "bg-red-100 text-red-700";

        case "HIGH":
            return "bg-orange-100 text-orange-700";

        case "NORMAL":
            return "bg-blue-100 text-blue-700";

        case "MEDIUM":
            return "bg-yellow-100 text-yellow-800";

        case "LOW":
            return "bg-gray-100 text-gray-700";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

// ==========================================
// PAGE
// ==========================================

export default function AssignedSupportPage() {
    const [
        staff,
        setStaff,
    ] =
        useState<
            Staff |
            null
        >(null);

    const [
        tickets,
        setTickets,
    ] =
        useState<
            Ticket[]
        >([]);

    const [
        summary,
        setSummary,
    ] =
        useState<Summary>({
            total: 0,
            assigned: 0,
            in_progress: 0,
            waiting_for_admin: 0,
            waiting_for_user: 0,
            done: 0,
        });

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState("");

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
    // FILTERS
    // ==========================================

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
        priority,
        setPriority,
    ] =
        useState("");

    // ==========================================
    // SELECTED TICKET
    // ==========================================

    const [
        selectedTicketId,
        setSelectedTicketId,
    ] =
        useState<
            number |
            null
        >(null);

    const [
        ticketDetail,
        setTicketDetail,
    ] =
        useState<
            TicketDetail |
            null
        >(null);

    const [
        comments,
        setComments,
    ] =
        useState<
            Comment[]
        >([]);

    const [
        detailLoading,
        setDetailLoading,
    ] =
        useState(false);

    // ==========================================
    // ACTION FIELDS
    // ==========================================

    const [
        commentText,
        setCommentText,
    ] =
        useState("");

    const [
        actionNote,
        setActionNote,
    ] =
        useState("");

    const [
        resolution,
        setResolution,
    ] =
        useState("");

    const [
        processing,
        setProcessing,
    ] =
        useState(false);

    // ==========================================
    // LOAD TICKETS
    // ==========================================

    const loadTickets =
        useCallback(
            async (
                searchValue = "",
                statusValue = "",
                priorityValue = ""
            ) => {
                try {
                    setLoading(
                        true
                    );

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
                        priorityValue
                    ) {
                        params.set(
                            "priority",
                            priorityValue
                        );
                    }

                    const query =
                        params.toString();

                    const response =
                        await fetch(
                            `/api/support/assigned${query
                                ? `?${query}`
                                : ""
                            }`,
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    const data:
                        ListResponse =
                        await response.json();

                    if (
                        !response.ok
                    ) {
                        setError(
                            data.message ||
                            "Unable to load assigned tickets."
                        );

                        return;
                    }

                    setError("");

                    setStaff(
                        data.staff
                    );

                    setTickets(
                        data.tickets ||
                        []
                    );

                    setSummary(
                        data.summary || {
                            total: 0,
                            assigned: 0,
                            in_progress: 0,
                            waiting_for_admin: 0,
                            waiting_for_user: 0,
                            done: 0,
                        }
                    );

                } catch (err) {
                    console.error(
                        err
                    );

                    setError(
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
        void loadTickets();
    }, [
        loadTickets,
    ]);

    // ==========================================
    // LOAD TICKET DETAIL
    // ==========================================

    const loadTicketDetail =
        useCallback(
            async (
                ticketId: number
            ) => {
                try {
                    setDetailLoading(
                        true
                    );

                    const response =
                        await fetch(
                            `/api/support/assigned/${ticketId}`,
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
                            "Unable to load ticket details."
                        );

                        return;
                    }

                    setSelectedTicketId(
                        ticketId
                    );

                    setTicketDetail(
                        data.ticket
                    );

                    setComments(
                        data.comments ||
                        []
                    );

                    setActionNote("");

                    setResolution("");

                } catch (err) {
                    console.error(
                        err
                    );

                    setSuccess(
                        false
                    );

                    setMessage(
                        "Unable to load ticket details."
                    );

                } finally {
                    setDetailLoading(
                        false
                    );
                }
            },
            []
        );

    // ==========================================
    // NOTIFICATION DEEP LINK
    //
    // /support/assigned?ticket=25
    // ==========================================

    useEffect(() => {
        const ticketValue =
            new URLSearchParams(
                window.location.search
            ).get(
                "ticket"
            );

        if (!ticketValue) {
            return;
        }

        const ticketId =
            Number(
                ticketValue
            );

        if (
            !Number.isInteger(
                ticketId
            ) ||
            ticketId <= 0
        ) {
            return;
        }

        if (
            selectedTicketId ===
            ticketId
        ) {
            return;
        }

        void loadTicketDetail(
            ticketId
        );

    }, [
        selectedTicketId,
        loadTicketDetail,
    ]);

    // ==========================================
    // SCROLL DEEP LINK
    // ==========================================

    useEffect(() => {
        if (
            !ticketDetail ||
            !selectedTicketId
        ) {
            return;
        }

        const ticketValue =
            new URLSearchParams(
                window.location.search
            ).get(
                "ticket"
            );

        if (
            Number(
                ticketValue
            ) !==
            selectedTicketId
        ) {
            return;
        }

        const timer =
            window.setTimeout(
                () => {
                    document
                        .getElementById(
                            "engineer-ticket-detail"
                        )
                        ?.scrollIntoView({
                            behavior:
                                "smooth",

                            block:
                                "start",
                        });
                },
                150
            );

        return () =>
            window.clearTimeout(
                timer
            );

    }, [
        ticketDetail,
        selectedTicketId,
    ]);

    // ==========================================
    // FILTER
    // ==========================================

    async function submitFilter(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        await loadTickets(
            search,
            status,
            priority
        );
    }

    async function clearFilter() {
        setSearch("");

        setStatus("");

        setPriority("");

        await loadTickets();
    }

    // ==========================================
    // ADD COMMENT
    // ==========================================

    async function addComment(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !selectedTicketId ||
            !commentText.trim()
        ) {
            return;
        }

        setProcessing(
            true
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/support/assigned/${selectedTicketId}`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                comment:
                                    commentText,
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
                    "Unable to add comment."
                );

                return;
            }

            setCommentText("");

            setSuccess(
                true
            );

            setMessage(
                "Comment added successfully."
            );

            await loadTicketDetail(
                selectedTicketId
            );

            await loadTickets(
                search,
                status,
                priority
            );

        } catch (err) {
            console.error(
                err
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
    // ACTION
    // ==========================================

    async function performAction(
        action: string
    ) {
        if (
            !selectedTicketId
        ) {
            return;
        }

        if (
            (
                action ===
                "WAITING_FOR_ADMIN" ||
                action ===
                "WAITING_FOR_USER"
            ) &&
            !actionNote.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please enter the reason / required information first."
            );

            return;
        }

        if (
            action ===
            "DONE" &&
            !resolution.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please enter the final resolution before completing the ticket."
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
                    `/api/support/assigned/${selectedTicketId}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action,

                                note:
                                    actionNote,

                                resolution,
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
                    "Unable to update ticket."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Ticket updated successfully."
            );

            setActionNote("");

            if (
                action ===
                "DONE"
            ) {
                setResolution("");
            }

            await loadTickets(
                search,
                status,
                priority
            );

            await loadTicketDetail(
                selectedTicketId
            );

        } catch (err) {
            console.error(
                err
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
    // ACCESS ERROR
    // ==========================================

    if (
        !loading &&
        error &&
        !staff
    ) {
        return (
            <main className="min-h-screen bg-[#f4f4f4] p-6">

                <div className="mx-auto max-w-3xl border border-red-300 bg-red-50 p-6">

                    <h1 className="text-xl font-bold text-red-700">
                        IT Engineer Workbench
                    </h1>

                    <p className="mt-3 text-red-700">
                        {error}
                    </p>

                    <Link
                        href="/"
                        className="mt-5 inline-block bg-[#111111] px-5 py-3 text-sm font-bold text-white"
                    >
                        Back to Home
                    </Link>

                </div>

            </main>
        );
    }

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]";

    // ==========================================
    // PAGE
    // ==========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* ================================= */}
            {/* HEADER                            */}
            {/* ================================= */}

            <PortalHeader
                title="IT Engineer Workbench"
                fullName={
                    staff?.fullName
                }
                employeeId={
                    staff?.employeeId
                }
                department={
                    staff?.department
                }
                role={
                    staff?.staffTitle ||
                    staff?.designation ||
                    "IT Support"
                }
            />

            {/* ================================= */}
            {/* CONTENT                           */}
            {/* ================================= */}

            <div className="mx-auto max-w-[1700px] px-6 py-8">

                {/* ================================= */}
                {/* TITLE                             */}
                {/* ================================= */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            My Assigned Tickets
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Work on IT tickets assigned to you,
                            follow the TNA and record final resolution.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-3">

                        <Link
                            href="/support"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            IT Support
                        </Link>

                        <Link
                            href="/inventory"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            My Inventory
                        </Link>

                        <Link
                            href="/"
                            className="bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#292929]"
                        >
                            Home
                        </Link>

                    </div>

                </div>

                {/* ================================= */}
                {/* MESSAGE                           */}
                {/* ================================= */}

                {message && (

                    <div
                        className={`mb-6 border px-4 py-3 text-sm font-semibold ${success
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-red-300 bg-red-50 text-red-700"
                            }`}
                    >
                        {message}
                    </div>

                )}

                {/* ================================= */}
                {/* KPI                               */}
                {/* ================================= */}

                <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                    <Kpi
                        label="Total"
                        value={
                            summary.total
                        }
                    />

                    <Kpi
                        label="Assigned"
                        value={
                            summary.assigned
                        }
                    />

                    <Kpi
                        label="In Progress"
                        value={
                            summary.in_progress
                        }
                    />

                    <Kpi
                        label="Wait Admin"
                        value={
                            summary.waiting_for_admin
                        }
                    />

                    <Kpi
                        label="Wait User"
                        value={
                            summary.waiting_for_user
                        }
                    />

                    <Kpi
                        label="Done"
                        value={
                            summary.done
                        }
                    />

                </div>

                {/* ================================= */}
                {/* FILTER                            */}
                {/* ================================= */}

                <section className="mb-6 border border-gray-200 bg-white p-4 shadow-sm">

                    <form
                        onSubmit={
                            submitFilter
                        }
                        className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto_auto]"
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
                            placeholder="Search ticket, employee, asset or problem..."
                            className={
                                inputClass
                            }
                        />

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
                            className={
                                inputClass
                            }
                        >

                            <option value="">
                                All Status
                            </option>

                            <option value="ASSIGNED">
                                Assigned
                            </option>

                            <option value="IN_PROGRESS">
                                In Progress
                            </option>

                            <option value="WAITING_FOR_ADMIN">
                                Waiting for Admin
                            </option>

                            <option value="WAITING_FOR_USER">
                                Waiting for User
                            </option>

                            <option value="DONE">
                                Done
                            </option>

                            <option value="CANCELLED">
                                Cancelled
                            </option>

                        </select>

                        <select
                            value={
                                priority
                            }
                            onChange={(
                                event
                            ) =>
                                setPriority(
                                    event.target.value
                                )
                            }
                            className={
                                inputClass
                            }
                        >

                            <option value="">
                                All Priority
                            </option>

                            <option value="CRITICAL">
                                Critical
                            </option>

                            <option value="HIGH">
                                High
                            </option>
                            <option value="MEDIUM">
                                Medium
                            </option>

                            <option value="NORMAL">
                                Normal
                            </option>

                            <option value="LOW">
                                Low
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

                {/* ================================= */}
                {/* TICKET LIST                       */}
                {/* ================================= */}

                <section className="mb-8 overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="border-b border-gray-200 px-5 py-4">

                        <h3 className="font-bold text-gray-900">
                            Assigned Ticket List
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            TNA is the scheduled date and time set by Admin.
                        </p>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="min-w-[1650px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Ticket
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Employee
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Subject
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Device
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Priority
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Status
                                    </th>

                                    <th className="px-4 py-4 text-center text-sm">
                                        Comments
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Assigned
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        TNA
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
                                                10
                                            }
                                            className="px-4 py-14 text-center text-gray-500"
                                        >
                                            Loading assigned tickets...
                                        </td>

                                    </tr>

                                ) : tickets.length ===
                                    0 ? (

                                    <tr>

                                        <td
                                            colSpan={
                                                10
                                            }
                                            className="px-4 py-14 text-center text-gray-500"
                                        >
                                            No assigned IT support tickets found.
                                        </td>

                                    </tr>

                                ) : (

                                    tickets.map(
                                        (
                                            ticket
                                        ) => (

                                            <tr
                                                key={
                                                    ticket.id
                                                }
                                                className={`border-b border-gray-200 align-top hover:bg-gray-50 ${selectedTicketId ===
                                                    ticket.id
                                                    ? "bg-[#fffbea]"
                                                    : ""
                                                    }`}
                                            >

                                                {/* TICKET */}

                                                <td className="whitespace-nowrap px-4 py-4">

                                                    <p className="font-bold text-gray-900">
                                                        {ticket.ticket_no ||
                                                            `#${ticket.id}`}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {ticket.issue_category ||
                                                            "General IT"}
                                                    </p>

                                                </td>

                                                {/* EMPLOYEE */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {ticket.user_name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {ticket.employee_id ||
                                                            "—"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {ticket.department ||
                                                            "—"}
                                                    </p>

                                                    {ticket.requester_mode ===
                                                        "MANUAL" && (

                                                            <span className="mt-2 inline-block bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700">
                                                                MANUAL USER
                                                            </span>

                                                        )}

                                                </td>

                                                {/* SUBJECT */}

                                                <td className="max-w-[320px] px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {ticket.subject}
                                                    </p>

                                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                                        {ticket.problem_description}
                                                    </p>

                                                </td>

                                                {/* DEVICE */}

                                                <td className="px-4 py-4">

                                                    {ticket.asset_code ? (

                                                        <>

                                                            <p className="font-bold text-gray-900">
                                                                {ticket.asset_code}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {ticket.category_name}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {ticket.brand}
                                                                {" "}
                                                                {ticket.model}
                                                            </p>

                                                        </>

                                                    ) : (

                                                        <span className="text-sm text-gray-500">
                                                            General Support
                                                        </span>

                                                    )}

                                                </td>

                                                {/* PRIORITY */}

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block px-3 py-1 text-xs font-bold ${priorityStyle(
                                                            ticket.priority
                                                        )}`}
                                                    >
                                                        {ticket.priority}
                                                    </span>

                                                </td>

                                                {/* STATUS */}

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-bold ${statusStyle(
                                                            ticket.ticket_status
                                                        )}`}
                                                    >
                                                        {statusText(
                                                            ticket.ticket_status
                                                        )}
                                                    </span>

                                                </td>

                                                {/* COMMENTS */}

                                                <td className="px-4 py-4 text-center">

                                                    <span className="inline-block min-w-9 bg-gray-100 px-3 py-1 text-sm font-bold">
                                                        {ticket.comment_count}
                                                    </span>

                                                </td>

                                                {/* ASSIGNED */}

                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">

                                                    {prettyDateTime(
                                                        ticket.assigned_at
                                                    )}

                                                </td>

                                                {/* TNA */}

                                                <td className="min-w-[190px] px-4 py-4">

                                                    {ticket.tna_at ? (

                                                        <div className="border-l-[3px] border-[#d4af37] bg-[#fff8df] px-3 py-2">

                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8c731e]">
                                                                TNA
                                                            </p>

                                                            <p className="mt-1 text-sm font-bold text-gray-900">
                                                                {prettyDateTime(
                                                                    ticket.tna_at
                                                                )}
                                                            </p>

                                                        </div>

                                                    ) : (

                                                        <span className="text-sm text-gray-400">
                                                            —
                                                        </span>

                                                    )}

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-4 py-4 text-center">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            loadTicketDetail(
                                                                ticket.id
                                                            )
                                                        }
                                                        className="bg-[#d4af37] px-4 py-2 text-xs font-bold text-black hover:bg-[#b99625]"
                                                    >
                                                        {ticket.ticket_status ===
                                                            "DONE"
                                                            ? "View"
                                                            : "Work / View"}
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>

                {/* ================================= */}
                {/* DETAIL LOADING                    */}
                {/* ================================= */}

                {detailLoading && (

                    <div className="mb-8 border border-gray-200 bg-white p-8 text-center text-gray-500">
                        Loading ticket details...
                    </div>

                )}

                {/* ================================= */}
                {/* TICKET DETAIL                     */}
                {/* ================================= */}

                {!detailLoading &&
                    ticketDetail && (

                        <section
                            id="engineer-ticket-detail"
                            className="mb-8 scroll-mt-6"
                        >

                            {/* ================================= */}
                            {/* DETAIL CARD                       */}
                            {/* ================================= */}

                            <div className="border border-gray-200 bg-white shadow-sm">

                                {/* DETAIL HEADER */}

                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-6">

                                    <div>

                                        <p className="text-sm font-bold text-[#8c731e]">
                                            {ticketDetail.ticket_no ||
                                                `#${ticketDetail.id}`}
                                        </p>

                                        <h3 className="mt-1 text-xl font-bold text-gray-900">
                                            {ticketDetail.subject}
                                        </h3>

                                    </div>

                                    <div className="flex flex-wrap gap-2">

                                        <span
                                            className={`border px-3 py-1 text-xs font-bold ${statusStyle(
                                                ticketDetail.ticket_status
                                            )}`}
                                        >
                                            {statusText(
                                                ticketDetail.ticket_status
                                            )}
                                        </span>

                                        <span
                                            className={`px-3 py-1 text-xs font-bold ${priorityStyle(
                                                ticketDetail.priority
                                            )}`}
                                        >
                                            {ticketDetail.priority}
                                        </span>

                                    </div>

                                </div>

                                {/* ================================= */}
                                {/* TNA - PROMINENT                    */}
                                {/* ================================= */}

                                <div className="border-b border-[#e4cf7a] bg-[#fff8df] p-6">

                                    <div className="flex flex-wrap items-center justify-between gap-6">

                                        <div>

                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c731e]">
                                                TNA - Date & Time
                                            </p>

                                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                                {prettyDateTime(
                                                    ticketDetail.tna_at
                                                )}
                                            </p>

                                        </div>

                                        <div className="text-left md:text-right">

                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Assigned At
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-gray-800">
                                                {prettyDateTime(
                                                    ticketDetail.assigned_at
                                                )}
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                {/* EMPLOYEE INFO */}

                                <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">

                                    <Info
                                        label="Employee"
                                        value={
                                            ticketDetail.user_name
                                        }
                                    />

                                    <Info
                                        label="Employee ID"
                                        value={
                                            ticketDetail.employee_id
                                        }
                                    />

                                    <Info
                                        label="Designation"
                                        value={
                                            ticketDetail.user_designation
                                        }
                                    />

                                    <Info
                                        label="Department"
                                        value={
                                            ticketDetail.department
                                        }
                                    />

                                    <Info
                                        label="Mobile"
                                        value={
                                            ticketDetail.mobile_no
                                        }
                                    />

                                    <Info
                                        label="Location"
                                        value={
                                            ticketDetail.user_location
                                        }
                                    />

                                    <Info
                                        label="Issue Category"
                                        value={
                                            ticketDetail.issue_category
                                        }
                                    />

                                    <Info
                                        label="Opened"
                                        value={
                                            prettyDateTime(
                                                ticketDetail.opened_at
                                            )
                                        }
                                    />

                                </div>

                                {/* MANUAL REQUESTER */}

                                {ticketDetail.requester_mode ===
                                    "MANUAL" && (

                                        <div className="border-t border-orange-200 bg-orange-50 px-6 py-4">

                                            <p className="text-sm font-bold text-orange-800">
                                                Manual / Unregistered Employee
                                            </p>

                                            <p className="mt-1 text-xs text-orange-700">
                                                This requester does not have a linked Portal account.
                                                Waiting for User is therefore not available.
                                            </p>

                                        </div>

                                    )}

                                {/* PROBLEM */}

                                <div className="border-t border-gray-200 p-6">

                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                        Problem Description
                                    </p>

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                        {ticketDetail.problem_description}
                                    </p>

                                </div>

                                {/* ADMIN NOTE */}

                                {ticketDetail.admin_note && (

                                    <div className="border-t border-orange-200 bg-orange-50 p-6">

                                        <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                                            Latest Admin Instruction
                                        </p>

                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-orange-900">
                                            {ticketDetail.admin_note}
                                        </p>

                                    </div>

                                )}

                                {/* DEVICE */}

                                <div className="border-t border-gray-200 p-6">

                                    <h4 className="font-bold text-gray-900">
                                        Related Device
                                    </h4>

                                    {ticketDetail.asset_code ? (

                                        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                                            <Info
                                                label="Asset ID"
                                                value={
                                                    ticketDetail.asset_code
                                                }
                                            />

                                            <Info
                                                label="Device"
                                                value={
                                                    ticketDetail.category_name
                                                }
                                            />

                                            <Info
                                                label="Brand"
                                                value={
                                                    ticketDetail.brand
                                                }
                                            />

                                            <Info
                                                label="Model"
                                                value={
                                                    ticketDetail.model
                                                }
                                            />

                                            <Info
                                                label="Serial"
                                                value={
                                                    ticketDetail.serial_number
                                                }
                                            />

                                            <Info
                                                label="Processor"
                                                value={
                                                    ticketDetail.processor
                                                }
                                            />

                                            <Info
                                                label="RAM"
                                                value={
                                                    ticketDetail.ram_version
                                                }
                                            />

                                            <Info
                                                label="Storage"
                                                value={
                                                    ticketDetail.storage_info
                                                }
                                            />

                                            <Info
                                                label="Windows"
                                                value={
                                                    ticketDetail.windows_version
                                                }
                                            />

                                            <Info
                                                label="Office"
                                                value={
                                                    ticketDetail.office_version
                                                }
                                            />

                                            <Info
                                                label="AD / Workgroup"
                                                value={
                                                    ticketDetail.ad_or_workgroup
                                                }
                                            />

                                            <Info
                                                label="Endpoint Security"
                                                value={
                                                    ticketDetail.endpoint_security
                                                }
                                            />

                                        </div>

                                    ) : (

                                        <p className="mt-3 text-sm text-gray-500">
                                            General IT support ticket — no specific asset selected.
                                        </p>

                                    )}

                                </div>

                            </div>

                            {/* ================================= */}
                            {/* ACTION PANEL                      */}
                            {/* ================================= */}

                            <div className="mt-6 border border-gray-200 bg-white p-6 shadow-sm">

                                <h3 className="text-lg font-bold text-gray-900">
                                    Ticket Action
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    Update the current work status of this ticket.
                                </p>

                                {/* ASSIGNED */}

                                {ticketDetail.ticket_status ===
                                    "ASSIGNED" && (

                                        <div className="mt-6">

                                            <button
                                                type="button"
                                                disabled={
                                                    processing
                                                }
                                                onClick={() =>
                                                    performAction(
                                                        "START_WORK"
                                                    )
                                                }
                                                className="bg-[#111111] px-7 py-3 font-bold text-white hover:bg-[#292929] disabled:opacity-50"
                                            >
                                                Start Work
                                            </button>

                                        </div>

                                    )}

                                {/* IN PROGRESS */}

                                {ticketDetail.ticket_status ===
                                    "IN_PROGRESS" && (

                                        <div className="mt-6">

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Waiting Reason / Action Note
                                            </label>

                                            <textarea
                                                value={
                                                    actionNote
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setActionNote(
                                                        event.target.value
                                                    )
                                                }
                                                rows={
                                                    3
                                                }
                                                placeholder="Write details if you need Admin approval or information from the user..."
                                                className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#d4af37]"
                                            />

                                            <div className="mt-4 flex flex-wrap gap-3">

                                                <button
                                                    type="button"
                                                    disabled={
                                                        processing
                                                    }
                                                    onClick={() =>
                                                        performAction(
                                                            "WAITING_FOR_ADMIN"
                                                        )
                                                    }
                                                    className="border border-orange-300 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                                                >
                                                    Wait for Admin
                                                </button>

                                                {ticketDetail.requester_mode !==
                                                    "MANUAL" && (

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                processing
                                                            }
                                                            onClick={() =>
                                                                performAction(
                                                                    "WAITING_FOR_USER"
                                                                )
                                                            }
                                                            className="border border-yellow-300 bg-yellow-50 px-5 py-3 text-sm font-bold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                                                        >
                                                            Wait for User
                                                        </button>

                                                    )}

                                            </div>

                                            {/* FINAL RESOLUTION */}

                                            <div className="mt-7 border-t border-gray-200 pt-6">

                                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                    Final Resolution
                                                </label>

                                                <textarea
                                                    value={
                                                        resolution
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setResolution(
                                                            event.target.value
                                                        )
                                                    }
                                                    rows={
                                                        4
                                                    }
                                                    placeholder="Example: Faulty RAM replaced, Windows checked and PC tested successfully."
                                                    className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#d4af37]"
                                                />

                                                <button
                                                    type="button"
                                                    disabled={
                                                        processing ||
                                                        !resolution.trim()
                                                    }
                                                    onClick={() =>
                                                        performAction(
                                                            "DONE"
                                                        )
                                                    }
                                                    className="mt-4 bg-green-700 px-7 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Complete Ticket
                                                </button>

                                            </div>

                                        </div>

                                    )}

                                {/* WAITING */}

                                {(
                                    ticketDetail.ticket_status ===
                                    "WAITING_FOR_ADMIN" ||
                                    ticketDetail.ticket_status ===
                                    "WAITING_FOR_USER"
                                ) && (

                                        <div className="mt-6">

                                            <p className="mb-4 text-sm text-gray-600">
                                                Required information/approval received?
                                                Resume the ticket to continue work.
                                            </p>

                                            <button
                                                type="button"
                                                disabled={
                                                    processing
                                                }
                                                onClick={() =>
                                                    performAction(
                                                        "RESUME_WORK"
                                                    )
                                                }
                                                className="bg-[#d4af37] px-7 py-3 font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                                            >
                                                Resume Work
                                            </button>

                                        </div>

                                    )}

                                {/* DONE */}

                                {ticketDetail.ticket_status ===
                                    "DONE" && (

                                        <div className="mt-6 border border-green-300 bg-green-50 p-5">

                                            <p className="font-bold text-green-800">
                                                Ticket Completed
                                            </p>

                                            <p className="mt-1 text-sm text-green-700">
                                                Completed:
                                                {" "}
                                                {prettyDateTime(
                                                    ticketDetail.completed_at
                                                )}
                                            </p>

                                            <div className="mt-4 border-t border-green-200 pt-4">

                                                <p className="text-xs font-bold uppercase text-green-700">
                                                    Final Resolution
                                                </p>

                                                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
                                                    {ticketDetail.resolution_summary ||
                                                        "—"}
                                                </p>

                                            </div>

                                        </div>

                                    )}

                            </div>

                            {/* ================================= */}
                            {/* COMMENTS                          */}
                            {/* ================================= */}

                            <div className="mt-6 border border-gray-200 bg-white shadow-sm">

                                <div className="border-b border-gray-200 p-5">

                                    <h3 className="font-bold text-gray-900">
                                        Work Notes / Comments
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Keep a chronological record of troubleshooting,
                                        communication and actions taken.
                                    </p>

                                </div>

                                {/* COMMENTS LIST */}

                                <div className="max-h-[500px] overflow-y-auto p-5">

                                    {comments.length ===
                                        0 ? (

                                        <p className="py-8 text-center text-sm text-gray-500">
                                            No comments added yet.
                                        </p>

                                    ) : (

                                        <div className="space-y-4">

                                            {comments.map(
                                                (
                                                    comment
                                                ) => (

                                                    <div
                                                        key={
                                                            comment.id
                                                        }
                                                        className="border-l-[3px] border-[#d4af37] bg-[#fafafa] p-4"
                                                    >

                                                        <div className="flex flex-wrap items-center justify-between gap-2">

                                                            <div>

                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {comment.commented_by_name}
                                                                </p>

                                                                <p className="text-xs text-gray-500">

                                                                    {comment.employee_id ||
                                                                        "—"}

                                                                    {comment.commented_by_designation
                                                                        ? ` • ${comment.commented_by_designation}`
                                                                        : ""}

                                                                </p>

                                                            </div>

                                                            <p className="text-xs text-gray-500">

                                                                {prettyDateTime(
                                                                    comment.created_at
                                                                )}

                                                            </p>

                                                        </div>

                                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                                            {comment.comment_text}
                                                        </p>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    )}

                                </div>

                                {/* ADD COMMENT */}

                                {ticketDetail.ticket_status !==
                                    "CANCELLED" && (

                                        <form
                                            onSubmit={
                                                addComment
                                            }
                                            className="border-t border-gray-200 p-5"
                                        >

                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Add Work Note / Comment
                                            </label>

                                            <textarea
                                                value={
                                                    commentText
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setCommentText(
                                                        event.target.value
                                                    )
                                                }
                                                rows={
                                                    3
                                                }
                                                placeholder="Example: Checked RAM and SSD. No hardware fault found. Running diagnostic test..."
                                                className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#d4af37]"
                                            />

                                            <div className="mt-3 flex justify-end">

                                                <button
                                                    type="submit"
                                                    disabled={
                                                        processing ||
                                                        !commentText.trim()
                                                    }
                                                    className="bg-[#111111] px-6 py-3 text-sm font-bold text-white hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Add Comment
                                                </button>

                                            </div>

                                        </form>

                                    )}

                            </div>

                        </section>

                    )}

            </div>

        </main>
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
        <div className="border-l-[3px] border-[#d4af37] bg-white p-4 shadow-sm">

            <p className="text-[11px] font-semibold uppercase text-gray-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
                {value}
            </p>

        </div>
    );
}

// ==========================================
// INFO
// ==========================================

function Info({
    label,
    value,
}: {
    label: string;

    value:
    | string
    | null
    | undefined;
}) {
    return (
        <div>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
                {value || "—"}
            </p>

        </div>
    );
}