"use client";

import Link from "next/link";
import { useRouter, useSearchParams, } from "next/navigation";

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

type PortalUser = {
    id: number;
    employee_id: string | null;
    full_name: string;
    designation: string | null;
    department: string | null;
    official_email: string | null;
    role: string;
};

type InventoryUser = {
    id: number;
    employee_id: string | null;
    full_name: string;
    designation: string | null;
    department: string | null;
};

type Asset = {
    id: number;
    asset_code: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    category_name: string;
    is_primary_computer: boolean;
};

type Ticket = {
    id: number;

    ticket_no: string | null;

    inventory_user_id: number;

    asset_id: number | null;

    subject: string;

    issue_category: string | null;

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

    resolution_summary: string | null;

    opened_at: string;

    assigned_at: string | null;

    work_started_at: string | null;

    completed_at: string | null;

    created_at: string;

    updated_at: string;

    asset_code: string | null;

    brand: string | null;

    model: string | null;

    category_name: string | null;

    assigned_to_name: string | null;

    assigned_to_employee_id: string | null;
};

type Summary = {
    total: number;
    open: number;
    inProgress: number;
    waiting: number;
    done: number;
};

type ApiResponse = {
    success: boolean;

    message?: string;

    linked: boolean;

    portalUser: PortalUser;

    inventoryUser: InventoryUser | null;

    assets: Asset[];

    tickets: Ticket[];

    summary: Summary;
};

// ==========================================
// DETAIL TYPES
// ==========================================

type TicketDetail = {
    id: number;

    ticket_no: string | null;

    subject: string;

    issue_category: string | null;

    problem_description: string;

    priority: string;

    ticket_status: string;

    admin_note: string | null;

    resolution_summary: string | null;

    opened_at: string;

    assigned_at: string | null;

    work_started_at: string | null;

    completed_at: string | null;

    created_at: string;

    updated_at: string;

    asset_id: number | null;

    asset_code: string | null;

    brand: string | null;

    model: string | null;

    serial_number: string | null;

    category_name: string | null;

    assigned_to_id: number | null;

    assigned_to_employee_id: string | null;

    assigned_to_name: string | null;

    assigned_to_designation: string | null;

    assigned_to_staff_title: string | null;
};

type Comment = {
    id: number;

    comment_text: string;

    created_at: string;

    commented_by_id: number;

    employee_id: string | null;

    commented_by_name: string;

    commented_by_designation: string | null;

    commented_by_role: string;

    is_it_support_staff: boolean;
};

type DetailResponse = {
    success: boolean;

    message?: string;

    portalUser: {
        id: number;
        employeeId: string | null;
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

function statusLabel(
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

        case "MEDIUM":
            return "bg-yellow-100 text-yellow-800";

        case "NORMAL":
            return "bg-blue-100 text-blue-700";

        case "LOW":
            return "bg-gray-100 text-gray-700";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

// ==========================================
// PAGE
// ==========================================

export default function SupportPage() {
    const router =
        useRouter();

    const searchParams =
        useSearchParams();

    const [
        data,
        setData,
    ] =
        useState<ApiResponse | null>(
            null
        );

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
        showForm,
        setShowForm,
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
    // NEW TICKET FORM
    // ==========================================

    const [
        assetId,
        setAssetId,
    ] =
        useState("");

    const [
        subject,
        setSubject,
    ] =
        useState("");

    const [
        issueCategory,
        setIssueCategory,
    ] =
        useState("");

    const [
        priority,
        setPriority,
    ] =
        useState(
            "NORMAL"
        );

    const [
        problemDescription,
        setProblemDescription,
    ] =
        useState("");

    // ==========================================
    // SELECTED TICKET
    // ==========================================

    const [
        selectedTicketId,
        setSelectedTicketId,
    ] =
        useState<number | null>(
            null
        );

    const [
        ticketDetail,
        setTicketDetail,
    ] =
        useState<TicketDetail | null>(
            null
        );

    const [
        comments,
        setComments,
    ] =
        useState<Comment[]>(
            []
        );

    const [
        detailLoading,
        setDetailLoading,
    ] =
        useState(false);

    const [
        reply,
        setReply,
    ] =
        useState("");

    const [
        replyProcessing,
        setReplyProcessing,
    ] =
        useState(false);

    // ==========================================
    // LOAD TICKETS
    // ==========================================

    const loadTickets =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const response =
                        await fetch(
                            "/api/support/tickets",
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    if (
                        response.status ===
                        401
                    ) {
                        router.push(
                            "/login"
                        );

                        return;
                    }

                    const result =
                        await response.json();

                    if (
                        !response.ok
                    ) {
                        setSuccess(
                            false
                        );

                        setMessage(
                            result.message ||
                            "Unable to load support tickets."
                        );

                        return;
                    }

                    setData(
                        result
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
            [
                router,
            ]
        );

    useEffect(() => {
        loadTickets();
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
                            `/api/support/tickets/${ticketId}`,
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    if (
                        response.status ===
                        401
                    ) {
                        router.push(
                            "/login"
                        );

                        return;
                    }

                    const result:
                        DetailResponse =
                        await response.json();

                    if (
                        !response.ok
                    ) {
                        setSuccess(
                            false
                        );

                        setMessage(
                            result.message ||
                            "Unable to load ticket details."
                        );

                        return;
                    }

                    setTicketDetail(
                        result.ticket
                    );

                    setComments(
                        result.comments ||
                        []
                    );

                    setReply(
                        ""
                    );

                    setTimeout(
                        () => {
                            document
                                .getElementById(
                                    "ticket-detail"
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
            [
                router,
            ]
        );
    // ==========================================
    // OPEN TICKET FROM NOTIFICATION LINK
    // Example: /support?ticket=25
    // ==========================================

    useEffect(() => {
        const ticketValue =
            searchParams.get(
                "ticket"
            );

        if (
            !ticketValue ||
            !data
        ) {
            return;
        }

        const ticketId =
            Number(ticketValue);

        if (
            !Number.isInteger(
                ticketId
            ) ||
            ticketId <= 0
        ) {
            return;
        }

        const belongsToUser =
            data.tickets.some(
                (ticket) =>
                    ticket.id ===
                    ticketId
            );

        if (
            !belongsToUser ||
            selectedTicketId ===
            ticketId
        ) {
            return;
        }

        loadTicketDetail(
            ticketId
        );

    }, [
        searchParams,
        data,
        selectedTicketId,
        loadTicketDetail,
    ]);
    // ==========================================
    // SUBMIT NEW TICKET
    // ==========================================

    async function submitTicket(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !subject.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please enter the ticket subject."
            );

            return;
        }

        if (
            !problemDescription.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please describe the problem."
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
                    "/api/support/tickets",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                assetId,
                                subject,
                                issueCategory,
                                priority,
                                problemDescription,
                            }),
                    }
                );

            const result =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    result.message ||
                    "Unable to submit support ticket."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                result.ticket
                    ?.ticket_no
                    ? `Ticket ${result.ticket.ticket_no} submitted successfully.`
                    : "IT support ticket submitted successfully."
            );

            setAssetId("");
            setSubject("");
            setIssueCategory("");
            setPriority(
                "NORMAL"
            );
            setProblemDescription("");

            setShowForm(
                false
            );

            await loadTickets();

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
    // USER REPLY
    // ==========================================

    async function submitReply(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !selectedTicketId ||
            !reply.trim()
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
                    `/api/support/tickets/${selectedTicketId}`,
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
                                    reply,
                            }),
                    }
                );

            const result =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    result.message ||
                    "Unable to send reply."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                result.message ||
                "Reply sent successfully."
            );

            setReply("");

            await loadTicketDetail(
                selectedTicketId
            );

            await loadTickets();

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
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">

                <div className="border border-gray-200 bg-white px-10 py-8 shadow-sm">

                    <p className="font-semibold text-gray-700">
                        Loading IT Support...
                    </p>

                </div>

            </main>
        );
    }

    if (!data) {
        return (
            <main className="min-h-screen bg-[#f4f4f4] p-6">

                <div className="mx-auto max-w-3xl border border-red-300 bg-red-50 p-6 text-red-700">

                    {message ||
                        "Unable to load IT Support."}

                </div>

            </main>
        );
    }

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-semibold text-gray-700";

    const ticketClosed =
        ticketDetail?.ticket_status ===
        "DONE" ||
        ticketDetail?.ticket_status ===
        "CANCELLED";

    // ==========================================
    // PAGE
    // ==========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* ================================= */}
            {/* SHARED PORTAL HEADER              */}
            {/* ================================= */}

            <PortalHeader
                title="IT Support"
                fullName={
                    data.portalUser.full_name
                }
                employeeId={
                    data.portalUser.employee_id
                }
                department={
                    data.portalUser.department
                }
                role={
                    data.portalUser.role
                }
            />

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                {/* ================================= */}
                {/* TITLE                             */}
                {/* ================================= */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            My IT Support
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Submit IT problems, track progress and communicate
                            directly with the assigned IT Engineer.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-3">

                        <Link
                            href="/inventory"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            My Inventory
                        </Link>

                        <Link
                            href="/"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            ← Home
                        </Link>

                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(
                                    (
                                        previous
                                    ) =>
                                        !previous
                                );

                                setMessage("");
                            }}
                            className="bg-[#d4af37] px-5 py-3 text-sm font-bold text-black hover:bg-[#b99625]"
                        >
                            {showForm
                                ? "Close Form"
                                : "+ New Support Ticket"}
                        </button>

                    </div>

                </div>

                {/* ================================= */}
                {/* KPI                               */}
                {/* ================================= */}

                <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                    <Kpi
                        label="Total Tickets"
                        value={
                            data.summary.total
                        }
                    />

                    <Kpi
                        label="Open"
                        value={
                            data.summary.open
                        }
                    />

                    <Kpi
                        label="In Progress"
                        value={
                            data.summary.inProgress
                        }
                    />

                    <Kpi
                        label="Waiting"
                        value={
                            data.summary.waiting
                        }
                    />

                    <Kpi
                        label="Done"
                        value={
                            data.summary.done
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
                {/* NEW TICKET                        */}
                {/* ================================= */}

                {showForm && (

                    <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            Submit New IT Support Ticket
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            Select your assigned device when the problem is related
                            to a specific asset.
                        </p>

                        <form
                            onSubmit={
                                submitTicket
                            }
                            className="mt-6"
                        >

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                                <div>

                                    <label className={labelClass}>
                                        Related Device
                                    </label>

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
                                            General IT Support
                                        </option>

                                        {data.assets.map(
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

                                                    {asset.is_primary_computer
                                                        ? " - Primary"
                                                        : ""}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                                <div>

                                    <label className={labelClass}>
                                        Issue Category
                                    </label>

                                    <select
                                        value={
                                            issueCategory
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setIssueCategory(
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    >

                                        <option value="">
                                            Select category
                                        </option>

                                        <option value="Computer Hardware">
                                            Computer Hardware
                                        </option>

                                        <option value="Software">
                                            Software
                                        </option>

                                        <option value="Network / Internet">
                                            Network / Internet
                                        </option>

                                        <option value="Printer / Scanner">
                                            Printer / Scanner
                                        </option>

                                        <option value="Email / Microsoft 365">
                                            Email / Microsoft 365
                                        </option>

                                        <option value="ERP / Application">
                                            ERP / Application
                                        </option>

                                        <option value="Access Control / Attendance">
                                            Access Control / Attendance
                                        </option>

                                        <option value="Other">
                                            Other
                                        </option>

                                    </select>

                                </div>

                                <div>

                                    <label className={labelClass}>
                                        Priority
                                    </label>

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

                                        <option value="LOW">
                                            Low
                                        </option>

                                        <option value="NORMAL">
                                            Normal
                                        </option>
                                        <option value="MEDIUM">
                                            Medium
                                        </option>

                                        <option value="HIGH">
                                            High
                                        </option>

                                        <option value="CRITICAL">
                                            Critical
                                        </option>

                                    </select>

                                </div>

                                <div>

                                    <label className={labelClass}>
                                        Subject *
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            subject
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSubject(
                                                event.target.value
                                            )
                                        }
                                        maxLength={
                                            250
                                        }
                                        required
                                        placeholder="Short problem title"
                                        className={inputClass}
                                    />

                                </div>

                            </div>

                            <div className="mt-5">

                                <label className={labelClass}>
                                    Problem Description *
                                </label>

                                <textarea
                                    value={
                                        problemDescription
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setProblemDescription(
                                            event.target.value
                                        )
                                    }
                                    required
                                    rows={
                                        5
                                    }
                                    placeholder="Describe the problem clearly..."
                                    className="w-full border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]"
                                />

                            </div>

                            <div className="mt-6 flex justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowForm(
                                            false
                                        )
                                    }
                                    className="h-11 border border-gray-300 bg-white px-6 font-semibold text-gray-700"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        processing
                                    }
                                    className="h-11 bg-[#111111] px-7 font-bold text-white hover:bg-[#292929] disabled:opacity-50"
                                >
                                    {processing
                                        ? "Submitting..."
                                        : "Submit Ticket"}
                                </button>

                            </div>

                        </form>

                    </section>

                )}

                {/* ================================= */}
                {/* INVENTORY LINK WARNING            */}
                {/* ================================= */}

                {!data.linked && (

                    <div className="mb-6 border border-orange-300 bg-orange-50 p-5">

                        <p className="font-bold text-orange-800">
                            Inventory profile not linked
                        </p>

                        <p className="mt-1 text-sm text-orange-700">
                            You can submit a general IT support ticket.
                            An inventory profile will be created automatically.
                        </p>

                    </div>

                )}

                {/* ================================= */}
                {/* TICKET TABLE                      */}
                {/* ================================= */}

                <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="border-b border-gray-200 px-5 py-4">

                        <h3 className="font-bold text-gray-900">
                            My Support Tickets
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            Open a ticket to view updates and communicate with IT.
                        </p>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="min-w-[1500px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Ticket
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

                                    <th className="px-4 py-4 text-left text-sm">
                                        Assigned IT
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Opened
                                    </th>

                                    <th className="px-4 py-4 text-center text-sm">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {data.tickets.length ===
                                    0 ? (

                                    <tr>

                                        <td
                                            colSpan={
                                                8
                                            }
                                            className="px-4 py-14 text-center text-gray-500"
                                        >
                                            No support tickets submitted yet.
                                        </td>

                                    </tr>

                                ) : (

                                    data.tickets.map(
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

                                                <td className="max-w-[320px] px-4 py-4">

                                                    <p className="font-semibold text-gray-900">
                                                        {ticket.subject}
                                                    </p>

                                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                                                        {ticket.problem_description}
                                                    </p>

                                                </td>

                                                <td className="px-4 py-4">

                                                    {ticket.asset_code ? (

                                                        <>

                                                            <p className="text-sm font-bold text-gray-900">
                                                                {ticket.asset_code}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {ticket.category_name}
                                                            </p>

                                                        </>

                                                    ) : (

                                                        <span className="text-sm text-gray-500">
                                                            General Support
                                                        </span>

                                                    )}

                                                </td>

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block px-3 py-1 text-xs font-bold ${priorityStyle(
                                                            ticket.priority
                                                        )}`}
                                                    >
                                                        {ticket.priority}
                                                    </span>

                                                </td>

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-bold ${statusStyle(
                                                            ticket.ticket_status
                                                        )}`}
                                                    >
                                                        {statusLabel(
                                                            ticket.ticket_status
                                                        )}
                                                    </span>

                                                </td>

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

                                                        </>

                                                    ) : (

                                                        <span className="text-sm text-gray-400">
                                                            Not Assigned
                                                        </span>

                                                    )}

                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">

                                                    {prettyDateTime(
                                                        ticket.opened_at
                                                    )}

                                                </td>

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
                                                            : "View / Reply"}
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

                    <div
                        id="ticket-detail"
                        className="mt-7 border border-gray-200 bg-white p-10 text-center text-gray-500"
                    >
                        Loading ticket conversation...
                    </div>

                )}

                {/* ================================= */}
                {/* TICKET DETAIL                     */}
                {/* ================================= */}

                {!detailLoading &&
                    ticketDetail && (

                        <section
                            id="ticket-detail"
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

                                    <div className="flex gap-2">

                                        <span
                                            className={`border px-3 py-1 text-xs font-bold ${statusStyle(
                                                ticketDetail.ticket_status
                                            )}`}
                                        >
                                            {statusLabel(
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

                                {/* GENERAL INFO */}

                                <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">

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

                                    <Info
                                        label="Assigned IT"
                                        value={
                                            ticketDetail.assigned_to_name ||
                                            "Not Assigned"
                                        }
                                    />

                                    <Info
                                        label="IT Support Role"
                                        value={
                                            ticketDetail.assigned_to_staff_title ||
                                            ticketDetail.assigned_to_designation
                                        }
                                    />

                                </div>

                                {/* PROBLEM */}

                                <div className="border-t border-gray-200 p-6">

                                    <p className="text-xs font-bold uppercase text-gray-500">
                                        Problem Description
                                    </p>

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                        {ticketDetail.problem_description}
                                    </p>

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

                                        </div>

                                    ) : (

                                        <p className="mt-2 text-sm text-gray-500">
                                            General IT Support
                                        </p>

                                    )}

                                </div>

                                {/* WAIT USER */}

                                {ticketDetail.ticket_status ===
                                    "WAITING_FOR_USER" && (

                                        <div className="border-t border-yellow-300 bg-yellow-50 p-5">

                                            <p className="font-bold text-yellow-800">
                                                IT is waiting for your response
                                            </p>

                                            <p className="mt-1 text-sm text-yellow-700">
                                                Please review the IT Engineer&apos;s latest
                                                comment below and provide the requested
                                                information.
                                            </p>

                                        </div>

                                    )}

                                {/* DONE */}

                                {/* ================================= */}
                                {/* DONE                              */}
                                {/* ================================= */}

                                {ticketDetail.ticket_status ===
                                    "DONE" && (

                                        <div className="border-t border-green-300 bg-green-50 p-6">

                                            <p className="font-bold text-green-800">
                                                Ticket Completed
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-green-700">
                                                Your IT support request has been resolved and closed.
                                            </p>

                                            {ticketDetail.completed_at && (

                                                <p className="mt-2 text-xs text-green-600">
                                                    Completed:{" "}
                                                    {prettyDateTime(
                                                        ticketDetail.completed_at
                                                    )}
                                                </p>

                                            )}

                                        </div>

                                    )}

                            </div>

                            {/* ================================= */}
                            {/* CONVERSATION                      */}
                            {/* ================================= */}

                            <div className="mt-6 border border-gray-200 bg-white shadow-sm">

                                <div className="border-b border-gray-200 p-5">

                                    <h3 className="font-bold text-gray-900">
                                        Ticket Conversation
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Messages and work updates related to this
                                        support request.
                                    </p>

                                </div>

                                <div className="max-h-[550px] overflow-y-auto p-5">

                                    {comments.length ===
                                        0 ? (

                                        <p className="py-10 text-center text-sm text-gray-500">
                                            No conversation or work notes yet.
                                        </p>

                                    ) : (

                                        <div className="space-y-4">

                                            {comments.map(
                                                (
                                                    comment
                                                ) => {

                                                    const myComment =
                                                        comment.commented_by_id ===
                                                        data.portalUser.id;

                                                    return (

                                                        <div
                                                            key={
                                                                comment.id
                                                            }
                                                            className={`flex ${myComment
                                                                ? "justify-end"
                                                                : "justify-start"
                                                                }`}
                                                        >

                                                            <div
                                                                className={`max-w-[80%] border p-4 ${myComment
                                                                    ? "border-[#d4af37] bg-[#fff8df]"
                                                                    : comment.is_it_support_staff
                                                                        ? "border-gray-300 bg-gray-50"
                                                                        : "border-gray-200 bg-white"
                                                                    }`}
                                                            >

                                                                <div className="flex flex-wrap items-center justify-between gap-4">

                                                                    <div>

                                                                        <p className="text-sm font-bold text-gray-900">

                                                                            {myComment
                                                                                ? "You"
                                                                                : comment.commented_by_name}

                                                                        </p>

                                                                        <p className="mt-1 text-xs text-gray-500">

                                                                            {comment.is_it_support_staff
                                                                                ? "IT Support"
                                                                                : comment.commented_by_role}

                                                                            {comment.commented_by_designation
                                                                                ? ` • ${comment.commented_by_designation}`
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
                                {/* REPLY                             */}
                                {/* ================================= */}

                                {!ticketClosed && (

                                    <form
                                        onSubmit={
                                            submitReply
                                        }
                                        className="border-t border-gray-200 p-5"
                                    >

                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Reply to IT Support
                                        </label>

                                        <textarea
                                            value={
                                                reply
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setReply(
                                                    event.target.value
                                                )
                                            }
                                            rows={
                                                4
                                            }
                                            maxLength={
                                                5000
                                            }
                                            placeholder={
                                                ticketDetail.ticket_status ===
                                                    "WAITING_FOR_USER"
                                                    ? "Provide the information requested by IT..."
                                                    : "Add information or reply to IT Support..."
                                            }
                                            className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-[#d4af37]"
                                        />

                                        <div className="mt-3 flex items-center justify-between gap-4">

                                            <p className="text-xs text-gray-500">
                                                {reply.length}/5000
                                            </p>

                                            <button
                                                type="submit"
                                                disabled={
                                                    replyProcessing ||
                                                    !reply.trim()
                                                }
                                                className="bg-[#111111] px-6 py-3 text-sm font-bold text-white hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {replyProcessing
                                                    ? "Sending..."
                                                    : "Send Reply"}
                                            </button>

                                        </div>

                                    </form>

                                )}

                                {ticketClosed && (

                                    <div className="border-t border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                                        This ticket is closed. New replies cannot be added.
                                    </div>

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