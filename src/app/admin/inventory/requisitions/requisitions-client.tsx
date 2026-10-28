
"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";

// ============================================
// TYPES
// ============================================

type Requisition = {
    id: string;
    requisition_date: string;
    item: string;
    model: string;
    qty: number;
    requisition_by: string;
    due_days: number | null;
    requisition_for: string;
    on_hold_for: string;
    status: string;
    remarks: string;
};

type FormData = Omit<Requisition, "id" | "due_days">;

// ============================================
// CONSTANTS
// ============================================

const API = "/api/admin/inventory/requisitions";

const STATUSES = [
    "PENDING",
    "APPROVED",
    "ORDERED",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "ON_HOLD",
    "CANCELLED",
    "REJECTED",
];

const inputClass =
    "w-full rounded border border-gray-300 bg-white px-3 py-2 " +
    "text-sm text-gray-900 outline-none " +
    "focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]";

const labelClass =
    "mb-1 block text-xs font-semibold text-gray-700";

const statusColor: Record<string, string> = {
    PENDING: "bg-red-100 text-red-800",
    APPROVED: "bg-blue-100 text-blue-800",
    ORDERED: "bg-purple-100 text-purple-800",
    PARTIALLY_RECEIVED: "bg-amber-100 text-amber-900",
    RECEIVED: "bg-green-100 text-green-800",
    ON_HOLD: "bg-yellow-100 text-yellow-900",
    CANCELLED: "bg-gray-200 text-gray-800",
    REJECTED: "bg-red-200 text-red-900",
};

// ============================================
// DATE HELPER
// ============================================

function today() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ============================================
// EMPTY FORM
// New requisitions always start as PENDING
// ============================================

function emptyForm(): FormData {
    return {
        requisition_date: today(),
        item: "",
        model: "",
        qty: 1,
        requisition_by: "",
        requisition_for: "",
        on_hold_for: "",
        status: "PENDING",
        remarks: "",
    };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RequisitionsClient() {
    // Records
    const [rows, setRows] = useState<Requisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Search and filtering
    const [search, setSearch] = useState("");

    // FIX 1:
    // Default to PENDING after page refresh.
    const [filter, setFilter] = useState("PENDING");

    // Form
    const [showForm, setShowForm] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(
        null
    );

    const [form, setForm] = useState<FormData>(emptyForm);

    // Messages
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // FIX 2:
    // Scroll directly to the form when New/Edit is clicked.
    const formRef = useRef<HTMLElement | null>(null);

    const [scrollRequest, setScrollRequest] = useState(0);

    useEffect(() => {
        if (scrollRequest > 0 && showForm) {
            formRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [scrollRequest, showForm]);

    // ========================================
    // LOAD REQUISITIONS
    // ========================================

    const loadRows = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(API, {
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to load records"
                );
            }

            setRows(result.requisitions || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load requisitions"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRows();
    }, [loadRows]);

    // ========================================
    // UPDATE FORM FIELD
    // ========================================

    function update<K extends keyof FormData>(
        key: K,
        value: FormData[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    // ========================================
    // NEW REQUISITION
    // ========================================

    function newRecord() {
        setEditingId(null);

        // New requisition defaults to PENDING.
        setForm(emptyForm());

        setError("");
        setSuccess("");

        setShowForm(true);

        // Trigger scrolling after React renders the form.
        setScrollRequest((current) => current + 1);
    }

    // ========================================
    // EDIT REQUISITION
    // ========================================

    function editRecord(row: Requisition) {
        setEditingId(row.id);

        setForm({
            requisition_date: row.requisition_date,
            item: row.item,
            model: row.model || "",
            qty: row.qty,
            requisition_by: row.requisition_by,
            requisition_for: row.requisition_for || "",
            on_hold_for: row.on_hold_for || "",

            // Keep the saved status when editing.
            status: row.status,

            remarks: row.remarks || "",
        });

        setError("");
        setSuccess("");

        setShowForm(true);

        // Scroll to the form even when another
        // requisition is already being edited.
        setScrollRequest((current) => current + 1);
    }

    // ========================================
    // CLOSE FORM
    // ========================================

    function closeForm() {
        if (saving) return;

        setShowForm(false);
        setEditingId(null);
        setError("");
    }

    // ========================================
    // SAVE / UPDATE REQUISITION
    // ========================================

    async function saveRecord(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(API, {
                method: editingId ? "PATCH" : "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    ...form,

                    ...(editingId
                        ? { id: editingId }
                        : {}),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to save requisition"
                );
            }

            const wasEditing = Boolean(editingId);

            setShowForm(false);
            setEditingId(null);

            setSuccess(
                wasEditing
                    ? "Requisition updated successfully."
                    : "Requisition added successfully."
            );

            await loadRows();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save requisition"
            );
        } finally {
            setSaving(false);
        }
    }

    // ========================================
    // DELETE REQUISITION
    // ========================================

    async function deleteRecord(row: Requisition) {
        const confirmed = window.confirm(
            `Permanently delete this requisition?\n\n` +
            `Item: ${row.item}\n` +
            `Requisition ID: ${row.id}\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        setDeletingId(row.id);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${API}?id=${encodeURIComponent(row.id)}`,
                {
                    method: "DELETE",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to delete requisition"
                );
            }

            if (editingId === row.id) {
                setShowForm(false);
                setEditingId(null);
            }

            setSuccess(
                "Requisition deleted successfully."
            );

            await loadRows();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete requisition"
            );
        } finally {
            setDeletingId(null);
        }
    }

    // ========================================
    // FILTER REQUISITIONS
    // ========================================

    const filtered = rows.filter((row) => {
        const matchesStatus =
            filter === "ALL" ||
            row.status === filter;

        const text = [
            row.id,
            row.item,
            row.model,
            row.requisition_by,
            row.requisition_for,
            row.on_hold_for,
            row.remarks,
        ]
            .join(" ")
            .toLowerCase();

        return (
            matchesStatus &&
            text.includes(
                search.trim().toLowerCase()
            )
        );
    });

    // ========================================
    // SUMMARY COUNTS
    // ========================================

    const pendingCount = rows.filter(
        (row) => row.status === "PENDING"
    ).length;

    const receivedCount = rows.filter(
        (row) => row.status === "RECEIVED"
    ).length;

    // ========================================
    // PAGE UI
    // ========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4] p-3 text-gray-900 sm:p-5 lg:p-7">
            <div className="mx-auto max-w-[1700px] space-y-5">

                {/* =================================
                    HEADER
                ================================= */}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded border-b-[3px] border-[#d4af37] bg-[#111111] p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                            IT Requisition Management
                        </h1>

                        <p className="mt-1 text-sm text-gray-300">
                            IT Requisition Pending Summary Report
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={newRecord}
                        disabled={saving || deletingId !== null}
                        className="rounded bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                    >
                        + New Requisition
                    </button>
                </div>

                {/* =================================
                    SUMMARY CARDS
                ================================= */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ["Total Requisitions", rows.length],
                        ["Pending", pendingCount],
                        ["Received", receivedCount],
                    ].map(([label, value]) => (
                        <div
                            key={String(label)}
                            className="rounded border border-gray-200 bg-white p-4 shadow-sm"
                        >
                            <p className="text-xs font-semibold text-gray-600">
                                {label}
                            </p>

                            <p className="mt-1 text-2xl font-bold text-gray-900">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* =================================
                    SEARCH AND STATUS FILTER
                ================================= */}

                <div className="flex flex-wrap gap-3 rounded border border-gray-200 bg-white p-4">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search item, model, employee..."
                        className={`${inputClass} min-w-0 flex-1 sm:min-w-[240px]`}
                    />

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(event.target.value)
                        }
                        className={`${inputClass} sm:w-52`}
                        aria-label="Filter by status"
                    >
                        <option value="ALL">
                            All Status
                        </option>

                        {STATUSES.map((status) => (
                            <option
                                key={status}
                                value={status}
                            >
                                {status.replaceAll("_", " ")}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => void loadRows()}
                        disabled={loading || saving}
                        className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                    >
                        Refresh
                    </button>
                </div>

                {/* =================================
                    ERROR
                ================================= */}

                {error && (
                    <div
                        role="alert"
                        className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                {/* =================================
                    SUCCESS
                ================================= */}

                {success && (
                    <div
                        role="status"
                        className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                    >
                        {success}
                    </div>
                )}

                {/* =================================
                    NEW / EDIT FORM
                ================================= */}

                {showForm && (
                    <section
                        ref={formRef}
                        className="scroll-mt-24 rounded border border-gray-200 bg-white p-5 shadow-sm"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold">
                                {editingId
                                    ? "Edit Requisition"
                                    : "New IT Requisition"}
                            </h2>

                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={saving}
                                className="text-sm font-semibold text-gray-600 hover:text-black disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>

                        <form
                            onSubmit={saveRecord}
                            className="space-y-5"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

                                {/* REQUISITION DATE */}
                                <div>
                                    <label className={labelClass}>
                                        Requisition Date *
                                    </label>

                                    <input
                                        type="date"
                                        required
                                        disabled={saving}
                                        value={form.requisition_date}
                                        onChange={(event) =>
                                            update(
                                                "requisition_date",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                {/* ITEM */}
                                <div>
                                    <label className={labelClass}>
                                        Item *
                                    </label>

                                    <input
                                        required
                                        maxLength={200}
                                        disabled={saving}
                                        value={form.item}
                                        onChange={(event) =>
                                            update(
                                                "item",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                        placeholder="Desktop, Server, USB Hub..."
                                    />
                                </div>

                                {/* MODEL */}
                                <div>
                                    <label className={labelClass}>
                                        Model / Specification
                                    </label>

                                    <input
                                        disabled={saving}
                                        value={form.model}
                                        onChange={(event) =>
                                            update(
                                                "model",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                        placeholder="Model or configuration"
                                    />
                                </div>

                                {/* QUANTITY */}
                                <div>
                                    <label className={labelClass}>
                                        QTY *
                                    </label>

                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        step={1}
                                        disabled={saving}
                                        value={form.qty}
                                        onChange={(event) =>
                                            update(
                                                "qty",
                                                Number(event.target.value)
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                {/* REQUISITION FOR */}
                                <div>
                                    <label className={labelClass}>
                                        Requisition For
                                    </label>

                                    <input
                                        disabled={saving}
                                        value={form.requisition_for}
                                        onChange={(event) =>
                                            update(
                                                "requisition_for",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                {/* ON HOLD FOR */}
                                <div>
                                    <label className={labelClass}>
                                        On Hold For
                                    </label>

                                    <input
                                        disabled={saving}
                                        value={form.on_hold_for}
                                        onChange={(event) =>
                                            update(
                                                "on_hold_for",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                {/* STATUS */}
                                <div>
                                    <label className={labelClass}>
                                        Status *
                                    </label>

                                    <select
                                        value={form.status}
                                        disabled={saving}
                                        onChange={(event) =>
                                            update(
                                                "status",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        {STATUSES.map((status) => (
                                            <option
                                                key={status}
                                                value={status}
                                            >
                                                {status.replaceAll("_", " ")}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* REMARKS */}
                                <div className="md:col-span-2 xl:col-span-3">
                                    <label className={labelClass}>
                                        Remarks
                                    </label>

                                    <textarea
                                        rows={3}
                                        disabled={saving}
                                        value={form.remarks}
                                        onChange={(event) =>
                                            update(
                                                "remarks",
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* AUTOMATIC REQUESTER NOTE */}
                            <p className="text-xs text-gray-600">
                                Requisition By is automatically recorded
                                from the logged-in administrator when
                                creating a new requisition.
                            </p>

                            {/* FORM BUTTONS */}
                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={saving}
                                    className="rounded border border-gray-300 px-4 py-2 font-semibold disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded bg-[#d4af37] px-5 py-2 font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Requisition"
                                            : "Save Requisition"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* =================================
                    REQUISITION TABLE
                ================================= */}

                <section className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b p-4">
                        <h2 className="font-bold">
                            Requisition Summary
                        </h2>

                        <span className="text-xs text-gray-600">
                            {filtered.length} records
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1250px] border-collapse text-left text-xs">
                            <thead className="bg-[#111111] text-white">
                                <tr>
                                    {[
                                        "Sl",
                                        "Requisition Date",
                                        "Item",
                                        "Model",
                                        "QTY",
                                        "Requisition By",
                                        "Due Days",
                                        "Requisition For",
                                        "On Hold For",
                                        "Status",
                                        "Remarks",
                                        "Action",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="border-r border-gray-700 px-2.5 py-3 font-semibold"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={12}
                                            className="p-8 text-center"
                                        >
                                            Loading requisitions...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={12}
                                            className="p-8 text-center text-gray-500"
                                        >
                                            No requisitions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((row, index) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-200 align-top hover:bg-amber-50"
                                        >
                                            {/* SL */}
                                            <td className="px-2.5 py-3">
                                                {index + 1}
                                            </td>

                                            {/* DATE */}
                                            <td className="whitespace-nowrap px-2.5 py-3">
                                                {row.requisition_date}
                                            </td>

                                            {/* ITEM */}
                                            <td className="px-2.5 py-3 font-semibold">
                                                {row.item}
                                            </td>

                                            {/* MODEL */}
                                            <td className="max-w-[180px] break-words px-2.5 py-3">
                                                {row.model || "—"}
                                            </td>

                                            {/* QTY */}
                                            <td className="px-2.5 py-3">
                                                {row.qty}
                                            </td>

                                            {/* REQUISITION BY */}
                                            <td className="px-2.5 py-3">
                                                {row.requisition_by || "—"}
                                            </td>

                                            {/* DUE DAYS */}
                                            <td className="px-2.5 py-3">
                                                <span
                                                    className={
                                                        row.due_days === null
                                                            ? "text-gray-400"
                                                            : row.status === "RECEIVED" ||
                                                                row.status === "CANCELLED"
                                                                ? "text-gray-500"
                                                                : row.due_days > 30
                                                                    ? "font-bold text-red-700"
                                                                    : "text-gray-900"
                                                    }
                                                >
                                                    {row.due_days === null
                                                        ? "—"
                                                        : row.due_days}
                                                </span>
                                            </td>

                                            {/* REQUISITION FOR */}
                                            <td className="px-2.5 py-3">
                                                {row.requisition_for || "—"}
                                            </td>

                                            {/* ON HOLD FOR */}
                                            <td className="px-2.5 py-3">
                                                {row.on_hold_for || "—"}
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-2.5 py-3">
                                                <span
                                                    className={
                                                        "inline-block rounded px-2 py-1 text-[11px] font-bold " +
                                                        (
                                                            statusColor[row.status] ||
                                                            "bg-gray-100 text-gray-800"
                                                        )
                                                    }
                                                >
                                                    {row.status.replaceAll(
                                                        "_",
                                                        " "
                                                    )}
                                                </span>
                                            </td>

                                            {/* REMARKS */}
                                            <td className="max-w-[150px] break-words px-2.5 py-3">
                                                {row.remarks || "—"}
                                            </td>

                                            {/* ACTION */}
                                            <td className="px-2.5 py-3">
                                                <div className="flex gap-2 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            editRecord(row)
                                                        }
                                                        disabled={
                                                            saving ||
                                                            deletingId !== null
                                                        }
                                                        className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void deleteRecord(row)
                                                        }
                                                        disabled={
                                                            saving ||
                                                            deletingId !== null
                                                        }
                                                        className="font-semibold text-red-700 hover:underline disabled:opacity-50"
                                                    >
                                                        {deletingId === row.id
                                                            ? "Deleting..."
                                                            : "Delete"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
