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

type Ticket = {
    id: number;

    ticket_no:
    | string
    | null;

    inventory_user_id: number;

    asset_id:
    | number
    | null;

    subject: string;

    issue_category:
    | string
    | null;

    problem_description: string;

    priority:
    | "LOW"
    | "NORMAL"
    | "HIGH"
    | "CRITICAL";

    ticket_status:
    | "OPEN"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "WAITING_FOR_ADMIN"
    | "WAITING_FOR_USER"
    | "DONE"
    | "CANCELLED";

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

    category_name:
    | string
    | null;

    assigned_to_id:
    | number
    | null;

    assigned_to_employee_id:
    | string
    | null;

    assigned_to_name:
    | string
    | null;

    assigned_to_designation:
    | string
    | null;
};

type SupportStaff = {
    support_staff_id: number;

    portal_user_id: number;

    staff_title:
    | string
    | null;

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
};

type Summary = {
    total: number;
    open: number;
    assigned: number;
    in_progress: number;
    waiting_for_admin: number;
    waiting_for_user: number;
    done: number;
};

type ApiResponse = {
    success: boolean;

    message?: string;

    tickets: Ticket[];

    staff: SupportStaff[];

    summary: Summary;
};

// ==========================================
// DETAIL TYPES
// ==========================================

type TicketDetail = {
    id: number;

    ticket_no:
    | string
    | null;

    inventory_user_id: number;

    asset_id:
    | number
    | null;

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

    created_at: string;

    updated_at: string;

    employee_id:
    | string
    | null;

    user_name: string;

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

    category_name:
    | string
    | null;

    assigned_to_id:
    | number
    | null;

    assigned_to_employee_id:
    | string
    | null;

    assigned_to_name:
    | string
    | null;

    assigned_to_designation:
    | string
    | null;

    assigned_to_staff_title:
    | string
    | null;

    assigned_by_name:
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

    is_it_support_staff: boolean;
};

type AdminDetailResponse = {
    success: boolean;

    message?: string;

    admin: {
        id: number;

        employeeId:
        | string
        | null;

        fullName: string;
    };

    ticket: TicketDetail;

    comments: Comment[];
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

// ==========================================
// TNA VALUE FOR DATETIME-LOCAL
// ==========================================

function toDateTimeLocalValue(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    const pad =
        (number: number) =>
            String(number).padStart(
                2,
                "0"
            );

    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
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
        case "OPEN":
            return "border-blue-300 bg-blue-50 text-blue-700";

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
// COMPONENT
// ==========================================

export default function SupportManagement() {
    const [
        tickets,
        setTickets,
    ] =
        useState<Ticket[]>(
            []
        );

    const [
        staff,
        setStaff,
    ] =
        useState<SupportStaff[]>(
            []
        );

    const [
        summary,
        setSummary,
    ] =
        useState<Summary>({
            total: 0,
            open: 0,
            assigned: 0,
            in_progress: 0,
            waiting_for_admin: 0,
            waiting_for_user: 0,
            done: 0,
        });

    // ==========================================
    // FILTER
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
    // ASSIGNMENT
    // ==========================================

    const [
        assignmentSelections,
        setAssignmentSelections,
    ] =
        useState<
            Record<
                number,
                string
            >
        >({});

    // ==========================================
    // TNA
    // ==========================================

    const [
        tnaSelections,
        setTnaSelections,
    ] =
        useState<
            Record<
                number,
                string
            >
        >({});

    // ==========================================
    // DETAIL
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
        useState<Comment[]>(
            []
        );

    const [
        currentAdminId,
        setCurrentAdminId,
    ] =
        useState<
            number |
            null
        >(null);

    const [
        detailLoading,
        setDetailLoading,
    ] =
        useState(false);

    const [
        adminReply,
        setAdminReply,
    ] =
        useState("");

    // ==========================================
    // PROCESSING
    // ==========================================

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        processingTicketId,
        setProcessingTicketId,
    ] =
        useState<
            number |
            null
        >(null);

    const [
        replyProcessing,
        setReplyProcessing,
    ] =
        useState(false);

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
                            `/api/admin/support/tickets${query
                                ? `?${query}`
                                : ""
                            }`,
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    const data:
                        ApiResponse =
                        await response.json();

                    if (
                        !response.ok
                    ) {
                        setSuccess(
                            false
                        );

                        setMessage(
                            data.message ||
                            "Unable to load IT support tickets."
                        );

                        return;
                    }

                    setTickets(
                        data.tickets ||
                        []
                    );

                    setStaff(
                        data.staff ||
                        []
                    );

                    setSummary(
                        data.summary || {
                            total: 0,
                            open: 0,
                            assigned: 0,
                            in_progress: 0,
                            waiting_for_admin: 0,
                            waiting_for_user: 0,
                            done: 0,
                        }
                    );

                    const selected:
                        Record<
                            number,
                            string
                        > = {};

                    const selectedTna:
                        Record<
                            number,
                            string
                        > = {};

                    for (
                        const ticket
                        of data.tickets ||
                        []
                    ) {
                        if (
                            ticket.assigned_to_id
                        ) {
                            selected[
                                ticket.id
                            ] =
                                String(
                                    ticket.assigned_to_id
                                );
                        }

                        if (
                            ticket.tna_at
                        ) {
                            selectedTna[
                                ticket.id
                            ] =
                                toDateTimeLocalValue(
                                    ticket.tna_at
                                );
                        }
                    }

                    setAssignmentSelections(
                        selected
                    );

                    setTnaSelections(
                        selectedTna
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
        loadTickets();
    }, [
        loadTickets,
    ]);

    // ==========================================
    // LOAD DETAIL
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

                    setSelectedTicketId(
                        ticketId
                    );

                    setTicketDetail(
                        null
                    );

                    setComments(
                        []
                    );

                    const response =
                        await fetch(
                            `/api/admin/support/tickets/${ticketId}`,
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    const data:
                        AdminDetailResponse =
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

                    setCurrentAdminId(
                        data.admin.id
                    );

                    setTicketDetail(
                        data.ticket
                    );

                    setComments(
                        data.comments ||
                        []
                    );

                    setAdminReply(
                        ""
                    );

                    setTimeout(
                        () => {
                            document
                                .getElementById(
                                    "admin-ticket-detail"
                                )
                                ?.scrollIntoView({
                                    behavior:
                                        "smooth",
                                });
                        },
                        100
                    );

                } catch (error) {
                    console.error(
                        error
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
    // OPEN EXACT TICKET FROM NOTIFICATION
    //
    // Example:
    // /admin/support?ticket=25
    // ==========================================

    useEffect(() => {
        const params =
            new URLSearchParams(
                window.location.search
            );

        const ticketValue =
            params.get(
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

        void loadTicketDetail(
            ticketId
        );

    }, [
        loadTicketDetail,
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
    // ASSIGN / REASSIGN
    // ==========================================

    async function assignTicket(
        ticketId: number
    ) {
        const assignedTo =
            assignmentSelections[
            ticketId
            ];

        const tnaAt =
            tnaSelections[
            ticketId
            ] || "";

        if (!assignedTo) {
            setSuccess(
                false
            );

            setMessage(
                "Please select an IT Support Staff member."
            );

            return;
        }

        if (!tnaAt) {
            setSuccess(
                false
            );

            setMessage(
                "Please enter TNA date and time."
            );

            return;
        }

        setProcessingTicketId(
            ticketId
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/admin/support/tickets/${ticketId}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action:
                                    "ASSIGN",

                                assignedTo,

                                tnaAt,
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
                    "Unable to assign ticket."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Ticket assigned successfully."
            );

            await loadTickets(
                search,
                status,
                priority
            );

            if (
                selectedTicketId ===
                ticketId
            ) {
                await loadTicketDetail(
                    ticketId
                );
            }

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
            setProcessingTicketId(
                null
            );
        }
    }

    // ==========================================
    // ADMIN REPLY
    // ==========================================

    async function submitAdminReply(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !selectedTicketId ||
            !adminReply.trim()
        ) {
            return;
        }

        setReplyProcessing(
            true
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/admin/support/tickets/${selectedTicketId}`,
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
                                    adminReply,
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
                    "Unable to send Admin response."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Admin response sent successfully."
            );

            setAdminReply(
                ""
            );

            await loadTickets(
                search,
                status,
                priority
            );

            await loadTicketDetail(
                selectedTicketId
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
            setReplyProcessing(
                false
            );
        }
    }

    // ==========================================
    // CLASSES
    // ==========================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]";

    return (
        <>
            {/* ================================= */}
            {/* TITLE                             */}
            {/* ================================= */}

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                <div>

                    <h2 className="text-2xl font-bold text-gray-900">
                        IT Support Management
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Review employee IT requests, assign engineers
                        and respond to Admin approval or decision requests.
                    </p>

                </div>

                <div className="flex flex-wrap gap-3">

                    <Link
                        href="/admin/support/staff"
                        className="border border-[#d4af37] bg-[#fff8df] px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-[#f6e6a7]"
                    >
                        IT Support Staff
                    </Link>

                    <Link
                        href="/admin/support/create-task"
                        className="bg-[#d4af37] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#b99625]"
                    >
                        + Create IT Support Task
                    </Link>

                    <Link
                        href="/admin/inventory"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        Inventory Dashboard
                    </Link>

                    <Link
                        href="/support"
                        className="bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#292929]"
                    >
                        User Support Page
                    </Link>

                </div>

            </div>

            {/* ================================= */}
            {/* KPI                               */}
            {/* ================================= */}

            <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">

                <Kpi
                    label="Total"
                    value={
                        summary.total
                    }
                />

                <Kpi
                    label="Open"
                    value={
                        summary.open
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
            {/* WAIT ADMIN ALERT                  */}
            {/* ================================= */}

            {summary.waiting_for_admin >
                0 && (

                    <div className="mb-6 border border-orange-300 bg-orange-50 p-5">

                        <p className="font-bold text-orange-800">
                            Admin Response Required
                        </p>

                        <p className="mt-1 text-sm text-orange-700">
                            {summary.waiting_for_admin} ticket(s) are currently
                            waiting for Admin instruction, approval or decision.
                        </p>

                    </div>

                )}

            {/* ================================= */}
            {/* STAFF WARNING                     */}
            {/* ================================= */}

            {staff.length ===
                0 && (

                    <div className="mb-6 border border-orange-300 bg-orange-50 p-5">

                        <p className="font-bold text-orange-800">
                            No IT Support Staff configured
                        </p>

                        <p className="mt-1 text-sm text-orange-700">
                            Add IT Support Staff before assigning support tickets.
                        </p>

                    </div>

                )}

            {/* ================================= */}
            {/* FILTER                            */}
            {/* ================================= */}

            <section className="mb-5 border border-gray-200 bg-white p-4 shadow-sm">

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
                        placeholder="Search ticket, employee, department, asset or problem..."
                        className={inputClass}
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
                        className={inputClass}
                    >

                        <option value="">
                            All Status
                        </option>

                        <option value="OPEN">
                            Open
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
                        className={inputClass}
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
            {/* TICKETS                           */}
            {/* ================================= */}

            <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-200 px-5 py-4">

                    <h3 className="font-bold text-gray-900">
                        Support Tickets
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        Showing {tickets.length} ticket(s)
                    </p>

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-[2100px] w-full">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="px-4 py-4 text-left text-sm">
                                    Ticket
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Employee
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Department
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Subject / Problem
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

                                <th className="px-4 py-4 text-left text-sm">
                                    Assigned IT
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Assign / Reassign
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Detail
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
                                        Loading IT support tickets...
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
                                        No support tickets found.
                                    </td>

                                </tr>

                            ) : (

                                tickets.map(
                                    (
                                        ticket
                                    ) => {

                                        const closed =
                                            ticket.ticket_status ===
                                            "DONE" ||
                                            ticket.ticket_status ===
                                            "CANCELLED";

                                        return (

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

                                                    <p className="mt-2 text-xs text-gray-500">
                                                        {prettyDateTime(
                                                            ticket.opened_at
                                                        )}
                                                    </p>

                                                </td>

                                                {/* EMPLOYEE */}

                                                <td className="px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {ticket.user_name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {ticket.employee_id ||
                                                            "No Employee ID"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {ticket.designation ||
                                                            ""}
                                                    </p>

                                                </td>

                                                {/* DEPARTMENT */}

                                                <td className="px-4 py-4">

                                                    <p className="text-sm text-gray-700">
                                                        {ticket.department ||
                                                            "—"}
                                                    </p>

                                                    {ticket.user_location && (

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {ticket.user_location}
                                                        </p>

                                                    )}

                                                </td>

                                                {/* PROBLEM */}

                                                <td className="max-w-[350px] px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {ticket.subject}
                                                    </p>

                                                    <p className="mt-2 line-clamp-3 text-sm leading-5 text-gray-600">
                                                        {ticket.problem_description}
                                                    </p>

                                                </td>

                                                {/* DEVICE */}

                                                <td className="px-4 py-4">

                                                    {ticket.asset_code ? (

                                                        <>

                                                            <p className="text-sm font-bold text-gray-900">
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

                                                    {ticket.ticket_status ===
                                                        "WAITING_FOR_ADMIN" && (

                                                            <p className="mt-2 text-xs font-bold text-orange-700">
                                                                Response Required
                                                            </p>

                                                        )}

                                                </td>

                                                {/* ASSIGNED IT */}

                                                <td className="px-4 py-4">

                                                    {ticket.assigned_to_name ? (

                                                        <>

                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {ticket.assigned_to_name}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {ticket.assigned_to_employee_id ||
                                                                    ""}
                                                            </p>

                                                            {ticket.tna_at && (

                                                                <p className="mt-2 text-xs font-bold text-[#8c731e]">
                                                                    TNA:{" "}
                                                                    {prettyDateTime(
                                                                        ticket.tna_at
                                                                    )}
                                                                </p>

                                                            )}

                                                        </>

                                                    ) : (

                                                        <span className="text-sm font-semibold text-red-600">
                                                            Not Assigned
                                                        </span>

                                                    )}

                                                </td>

                                                {/* ================================= */}
                                                {/* ASSIGN / REASSIGN + TNA           */}
                                                {/* ================================= */}

                                                <td className="min-w-[360px] px-4 py-4">

                                                    {closed ? (

                                                        <span className="text-sm text-gray-400">
                                                            Ticket Closed
                                                        </span>

                                                    ) : (

                                                        <div className="space-y-3">

                                                            {/* IT ENGINEER */}

                                                            <div>

                                                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                                                                    IT Engineer
                                                                </label>

                                                                <select
                                                                    value={
                                                                        assignmentSelections[
                                                                        ticket.id
                                                                        ] ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setAssignmentSelections(
                                                                            (
                                                                                previous
                                                                            ) => ({
                                                                                ...previous,

                                                                                [ticket.id]:
                                                                                    event.target.value,
                                                                            })
                                                                        )
                                                                    }
                                                                    className="h-10 w-full border border-gray-300 bg-white px-2 text-sm outline-none focus:border-[#d4af37]"
                                                                >

                                                                    <option value="">
                                                                        Select IT Staff
                                                                    </option>

                                                                    {staff.map(
                                                                        (
                                                                            member
                                                                        ) => (

                                                                            <option
                                                                                key={
                                                                                    member.portal_user_id
                                                                                }
                                                                                value={
                                                                                    member.portal_user_id
                                                                                }
                                                                            >
                                                                                {member.employee_id
                                                                                    ? `${member.employee_id} - `
                                                                                    : ""}

                                                                                {member.full_name}
                                                                            </option>

                                                                        )
                                                                    )}

                                                                </select>

                                                            </div>

                                                            {/* TNA */}

                                                            <div>

                                                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                                                                    TNA - Date & Time
                                                                </label>

                                                                <input
                                                                    type="datetime-local"
                                                                    value={
                                                                        tnaSelections[
                                                                        ticket.id
                                                                        ] ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setTnaSelections(
                                                                            (
                                                                                previous
                                                                            ) => ({
                                                                                ...previous,

                                                                                [ticket.id]:
                                                                                    event.target.value,
                                                                            })
                                                                        )
                                                                    }
                                                                    className="h-10 w-full border border-gray-300 bg-white px-2 text-sm outline-none focus:border-[#d4af37]"
                                                                />

                                                            </div>

                                                            {/* ASSIGN BUTTON */}

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    processingTicketId ===
                                                                    ticket.id ||
                                                                    !assignmentSelections[
                                                                    ticket.id
                                                                    ] ||
                                                                    !tnaSelections[
                                                                    ticket.id
                                                                    ]
                                                                }
                                                                onClick={() =>
                                                                    assignTicket(
                                                                        ticket.id
                                                                    )
                                                                }
                                                                className="h-10 w-full bg-[#d4af37] px-4 text-xs font-bold text-black hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {processingTicketId ===
                                                                    ticket.id
                                                                    ? "Saving..."
                                                                    : ticket.assigned_to_id
                                                                        ? "Reassign with TNA"
                                                                        : "Assign with TNA"}
                                                            </button>

                                                        </div>

                                                    )}

                                                </td>

                                                {/* DETAIL */}

                                                <td className="px-4 py-4 text-center">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            loadTicketDetail(
                                                                ticket.id
                                                            )
                                                        }
                                                        className={
                                                            ticket.ticket_status ===
                                                                "WAITING_FOR_ADMIN"
                                                                ? "bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700"
                                                                : "bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#292929]"
                                                        }
                                                    >
                                                        {ticket.ticket_status ===
                                                            "WAITING_FOR_ADMIN"
                                                            ? "View / Respond"
                                                            : "View"}
                                                    </button>

                                                </td>

                                            </tr>

                                        );
                                    }
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

                <div
                    id="admin-ticket-detail"
                    className="mt-7 border border-gray-200 bg-white p-10 text-center text-gray-500"
                >
                    Loading ticket details...
                </div>

            )}

            {/* ================================= */}
            {/* DETAIL PANEL                      */}
            {/* ================================= */}

            {!detailLoading &&
                ticketDetail && (

                    <section
                        id="admin-ticket-detail"
                        className="mt-7"
                    >

                        <div className="border border-gray-200 bg-white shadow-sm">

                            {/* HEADER */}

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

                            {/* EMPLOYEE */}

                            <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">

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
                                        ticketDetail.designation
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
                                    label="Opened"
                                    value={
                                        prettyDateTime(
                                            ticketDetail.opened_at
                                        )
                                    }
                                />

                                <Info
                                    label="Issue Category"
                                    value={
                                        ticketDetail.issue_category
                                    }
                                />

                            </div>

                            {/* PROBLEM */}

                            <div className="border-t border-gray-200 p-6">

                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                    Problem Description
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                    {ticketDetail.problem_description}
                                </p>

                            </div>

                            {/* ASSIGNED IT */}

                            <div className="border-t border-gray-200 p-6">

                                <h4 className="font-bold text-gray-900">
                                    Assigned IT Engineer
                                </h4>

                                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

                                    <Info
                                        label="Engineer"
                                        value={
                                            ticketDetail.assigned_to_name ||
                                            "Not Assigned"
                                        }
                                    />

                                    <Info
                                        label="Employee ID"
                                        value={
                                            ticketDetail.assigned_to_employee_id
                                        }
                                    />

                                    <Info
                                        label="Support Role"
                                        value={
                                            ticketDetail.assigned_to_staff_title ||
                                            ticketDetail.assigned_to_designation
                                        }
                                    />

                                    <Info
                                        label="Assigned By"
                                        value={
                                            ticketDetail.assigned_by_name
                                        }
                                    />

                                    <Info
                                        label="TNA"
                                        value={
                                            prettyDateTime(
                                                ticketDetail.tna_at
                                            )
                                        }
                                    />

                                </div>

                            </div>

                            {/* DEVICE */}

                            <div className="border-t border-gray-200 p-6">

                                <h4 className="font-bold text-gray-900">
                                    Related Device
                                </h4>

                                {ticketDetail.asset_code ? (

                                    <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                                        <Info
                                            label="Asset ID"
                                            value={
                                                ticketDetail.asset_code
                                            }
                                        />

                                        <Info
                                            label="Device Type"
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
                                            label="Serial Number"
                                            value={
                                                ticketDetail.serial_number
                                            }
                                        />

                                    </div>

                                ) : (

                                    <p className="mt-3 text-sm text-gray-500">
                                        General IT Support — no specific device selected.
                                    </p>

                                )}

                            </div>

                            {/* WAITING ALERT */}

                            {ticketDetail.ticket_status ===
                                "WAITING_FOR_ADMIN" && (

                                    <div className="border-t border-orange-300 bg-orange-50 p-6">

                                        <p className="font-bold text-orange-800">
                                            IT Engineer is waiting for Admin
                                        </p>

                                        <p className="mt-1 text-sm text-orange-700">
                                            Review the latest IT Engineer message below
                                            and provide the required approval, instruction
                                            or decision.
                                        </p>

                                    </div>

                                )}

                            {/* DONE */}

                            {ticketDetail.ticket_status ===
                                "DONE" && (

                                    <div className="border-t border-green-300 bg-green-50 p-6">

                                        <p className="font-bold text-green-800">
                                            Ticket Completed
                                        </p>

                                        <p className="mt-2 text-sm text-green-700">
                                            Completed:
                                            {" "}
                                            {prettyDateTime(
                                                ticketDetail.completed_at
                                            )}
                                        </p>

                                        <div className="mt-4">

                                            <p className="text-xs font-bold uppercase text-green-700">
                                                Final Resolution
                                            </p>

                                            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-gray-900">
                                                {ticketDetail.resolution_summary ||
                                                    "Completed"}
                                            </p>

                                        </div>

                                    </div>

                                )}

                        </div>

                        {/* ================================= */}
                        {/* CONVERSATION                      */}
                        {/* ================================= */}

                        <div className="mt-6 border border-gray-200 bg-white shadow-sm">

                            <div className="border-b border-gray-200 p-5">

                                <h3 className="font-bold text-gray-900">
                                    Ticket Conversation / Work History
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    Employee, IT Engineer and Admin communication
                                    is maintained here chronologically.
                                </p>

                            </div>

                            <div className="max-h-[600px] overflow-y-auto p-5">

                                {comments.length ===
                                    0 ? (

                                    <p className="py-10 text-center text-sm text-gray-500">
                                        No comments or work notes available.
                                    </p>

                                ) : (

                                    <div className="space-y-4">

                                        {comments.map(
                                            (
                                                comment
                                            ) => {

                                                const isCurrentAdmin =
                                                    currentAdminId ===
                                                    comment.commented_by_id;

                                                const isAdmin =
                                                    comment.commented_by_role ===
                                                    "ADMIN" ||
                                                    comment.commented_by_role ===
                                                    "SUPER_ADMIN";

                                                return (

                                                    <div
                                                        key={
                                                            comment.id
                                                        }
                                                        className={`flex ${isCurrentAdmin
                                                            ? "justify-end"
                                                            : "justify-start"
                                                            }`}
                                                    >

                                                        <div
                                                            className={`max-w-[85%] border p-4 ${isCurrentAdmin
                                                                ? "border-[#d4af37] bg-[#fff8df]"
                                                                : comment.is_it_support_staff
                                                                    ? "border-blue-200 bg-blue-50"
                                                                    : isAdmin
                                                                        ? "border-orange-200 bg-orange-50"
                                                                        : "border-gray-200 bg-gray-50"
                                                                }`}
                                                        >

                                                            <div className="flex flex-wrap items-start justify-between gap-4">

                                                                <div>

                                                                    <p className="text-sm font-bold text-gray-900">

                                                                        {isCurrentAdmin
                                                                            ? "You"
                                                                            : comment.commented_by_name}

                                                                    </p>

                                                                    <p className="mt-1 text-xs text-gray-500">

                                                                        {comment.is_it_support_staff
                                                                            ? "IT Support"
                                                                            : isAdmin
                                                                                ? "Admin"
                                                                                : "Employee"}

                                                                        {comment.commented_by_designation
                                                                            ? ` • ${comment.commented_by_designation}`
                                                                            : ""}

                                                                        {comment.employee_id
                                                                            ? ` • ${comment.employee_id}`
                                                                            : ""}

                                                                    </p>

                                                                </div>

                                                                <span className="text-xs text-gray-500">

                                                                    {prettyDateTime(
                                                                        comment.created_at
                                                                    )}

                                                                </span>

                                                            </div>

                                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                                                {comment.comment_text}
                                                            </p>

                                                        </div>

                                                    </div>

                                                );
                                            }
                                        )}

                                    </div>

                                )}

                            </div>

                            {/* ================================= */}
                            {/* ADMIN RESPONSE                     */}
                            {/* ================================= */}

                            {ticketDetail.ticket_status ===
                                "WAITING_FOR_ADMIN" && (

                                    <form
                                        onSubmit={
                                            submitAdminReply
                                        }
                                        className="border-t border-orange-300 bg-orange-50 p-5"
                                    >

                                        <label className="mb-2 block text-sm font-bold text-orange-900">
                                            Admin Response / Instruction *
                                        </label>

                                        <textarea
                                            value={
                                                adminReply
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setAdminReply(
                                                    event.target.value
                                                )
                                            }
                                            rows={
                                                5
                                            }
                                            maxLength={
                                                5000
                                            }
                                            placeholder="Example: Approved to replace the faulty RAM. Please proceed and update the final resolution after testing."
                                            className="w-full border border-orange-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]"
                                        />

                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">

                                            <div>

                                                <p className="text-xs text-orange-700">
                                                    {adminReply.length}/5000
                                                </p>

                                                <p className="mt-1 text-xs text-orange-700">
                                                    Sending this response will automatically return the ticket to
                                                    {" "}
                                                    <strong>IN PROGRESS</strong>.
                                                </p>

                                            </div>

                                            <button
                                                type="submit"
                                                disabled={
                                                    replyProcessing ||
                                                    !adminReply.trim()
                                                }
                                                className="bg-orange-700 px-7 py-3 text-sm font-bold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {replyProcessing
                                                    ? "Sending..."
                                                    : "Send Response to IT"}
                                            </button>

                                        </div>

                                    </form>

                                )}

                            {ticketDetail.ticket_status !==
                                "WAITING_FOR_ADMIN" && (

                                    <div className="border-t border-gray-200 bg-gray-50 p-4">

                                        <p className="text-sm text-gray-500">

                                            {ticketDetail.ticket_status ===
                                                "DONE"
                                                ? "This ticket is completed."
                                                : ticketDetail.ticket_status ===
                                                    "CANCELLED"
                                                    ? "This ticket is cancelled."
                                                    : "No Admin response is currently required for this ticket."}

                                        </p>

                                    </div>

                                )}

                        </div>

                    </section>

                )}

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