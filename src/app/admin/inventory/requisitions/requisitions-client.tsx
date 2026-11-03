
"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";

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

type RequisitionForm = Omit<
    Requisition,
    "id" | "due_days"
>;

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

const HEADINGS = [
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

function today() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function emptyForm(): RequisitionForm {
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

function formatDate(value: string) {
    if (!value) return "—";

    const [year, month, day] = value.split("-");

    if (!year || !month || !day) return value;

    return `${day}-${month}-${year}`;
}

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function statusLabel(status: string) {
    return status === "ALL"
        ? "All Status"
        : status.replaceAll("_", " ");
}

function reportFilename(
    filter: string,
    extension: string
) {
    return (
        `AukoTex_IT_Requisition_` +
        `${filter}_${today()}.${extension}`
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RequisitionsClient() {
    const [rows, setRows] = useState<Requisition[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [deletingId, setDeletingId] =
        useState<string | null>(null);

    const [search, setSearch] = useState("");

    // Default report filter
    const [filter, setFilter] = useState("PENDING");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [form, setForm] =
        useState<RequisitionForm>(emptyForm);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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
    // LOAD RECORDS
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
    // FORM MANAGEMENT
    // ========================================

    function update<K extends keyof RequisitionForm>(
        key: K,
        value: RequisitionForm[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    function newRecord() {
        setEditingId(null);
        setForm(emptyForm());
        setError("");
        setSuccess("");
        setShowForm(true);

        setScrollRequest((current) => current + 1);
    }

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
            status: row.status,
            remarks: row.remarks || "",
        });

        setError("");
        setSuccess("");
        setShowForm(true);

        setScrollRequest((current) => current + 1);
    }

    function closeForm() {
        if (saving) return;

        setShowForm(false);
        setEditingId(null);
        setError("");
    }

    async function saveRecord(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const wasEditing = Boolean(editingId);

            const response = await fetch(API, {
                method: wasEditing ? "PATCH" : "POST",
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

    async function deleteRecord(row: Requisition) {
        const confirmed = window.confirm(
            `Permanently delete this requisition?\n\n` +
            `Item: ${row.item}\n` +
            `Requisition ID: ${row.id}\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) return;

        setDeletingId(row.id);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${API}?id=${encodeURIComponent(row.id)}`,
                { method: "DELETE" }
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
    // FILTERED DATA
    // Used by table, Excel and PDF.
    // ========================================

    const filtered = rows.filter((row) => {
        const matchesStatus =
            filter === "ALL" ||
            row.status === filter;

        const searchable = [
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
            searchable.includes(
                search.trim().toLowerCase()
            )
        );
    });

    const pendingCount = rows.filter(
        (row) => row.status === "PENDING"
    ).length;

    const receivedCount = rows.filter(
        (row) => row.status === "RECEIVED"
    ).length;

    const cancelledCount = rows.filter(
        (row) => row.status === "CANCELLED"
    ).length;

    // ========================================
    // REPORT DATA
    // ========================================

    function reportRows() {
        return filtered.map((row, index) => [
            index + 1,
            formatDate(row.requisition_date),
            row.item,
            row.model || "",
            row.qty,
            row.requisition_by || "",
            row.due_days === null
                ? "—"
                : row.due_days,
            row.requisition_for || "",
            row.on_hold_for || "",
            row.status.replaceAll("_", " "),
            row.remarks || "",
        ]);
    }

    // ========================================
    // EXPORT EXCEL (.XLSX)
    // ========================================

    async function exportExcel() {
        if (loading || filtered.length === 0) return;

        setExporting(true);
        setError("");
        setSuccess("");

        try {
            const XLSX = await import("xlsx");

            const worksheetData: (
                string | number
            )[][] = [
                    ["AUKO-TEX GROUP"],
                    ["IT Requisition Summary Report"],
                    [`Status Filter: ${statusLabel(filter)}`],
                    [`Report Date: ${formatDate(today())}`],
                    [`Total Records: ${filtered.length}`],
                    [],
                    HEADINGS,
                    ...reportRows(),
                ];

            const worksheet =
                XLSX.utils.aoa_to_sheet(worksheetData);

            worksheet["!cols"] = [
                { wch: 6 },
                { wch: 18 },
                { wch: 25 },
                { wch: 45 },
                { wch: 9 },
                { wch: 23 },
                { wch: 12 },
                { wch: 48 },
                { wch: 30 },
                { wch: 23 },
                { wch: 48 },
            ];

            worksheet["!merges"] = [
                {
                    s: { r: 0, c: 0 },
                    e: { r: 0, c: 10 },
                },
                {
                    s: { r: 1, c: 0 },
                    e: { r: 1, c: 10 },
                },
            ];

            if (filtered.length > 0) {
                worksheet["!autofilter"] = {
                    ref: `A7:K${7 + filtered.length}`,
                };
            }

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "IT Requisitions"
            );

            XLSX.writeFile(
                workbook,
                reportFilename(filter, "xlsx")
            );

            setSuccess(
                `Excel export prepared for ${filtered.length} records.`
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to export Excel report."
            );
        } finally {
            setExporting(false);
        }
    }

    // ========================================
    // EXPORT PDF
    // Print-ready A3 landscape report.
    // Browser Save as PDF preserves local fonts.
    // ========================================

    function exportPDF() {
        if (loading || filtered.length === 0) return;

        const printWindow = window.open(
            "",
            "_blank",
            "width=1400,height=900"
        );

        if (!printWindow) {
            setError(
                "Your browser blocked the report window. " +
                "Please allow pop-ups for this portal."
            );
            return;
        }

        setError("");
        setSuccess("");

        const data = reportRows();

        const tableRows = data
            .map((record) => {
                const cells = record
                    .map((value, index) => {
                        const safe = escapeHtml(value);

                        const statusClass =
                            index === 9
                                ? ` class="status status-${String(value)
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")}"`
                                : "";

                        const dueClass =
                            index === 6 &&
                                typeof value === "number" &&
                                value > 30 &&
                                String(record[9]) !== "RECEIVED"
                                ? ' class="overdue"'
                                : "";

                        return (
                            `<td${statusClass}${dueClass}>` +
                            `${safe}</td>`
                        );
                    })
                    .join("");

                return `<tr>${cells}</tr>`;
            })
            .join("");

        const tableHeaders = HEADINGS.map(
            (heading) =>
                `<th>${escapeHtml(heading)}</th>`
        ).join("");

        const safeFilter = escapeHtml(
            statusLabel(filter)
        );

        const safeSearch = escapeHtml(
            search.trim() || "None"
        );

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(
            reportFilename(filter, "pdf")
        )}</title>

<style>
    
@page {
    size: A4 landscape;
    margin-top: 10mm;
    margin-right: 10mm;
    margin-bottom: 12mm;
    margin-left: 10mm;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
    color: #111111;
    font-family: Arial, "Noto Sans", "Segoe UI", sans-serif;
    font-size: 9px;
}

.report-wrap {
    width: 100%;
    overflow: hidden;
}

.heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #e5e5e5;
    border: 1px solid #555;
    padding: 8px 10px;
    margin-bottom: 8px;
    gap: 14px;
}

.company {
    font-size: 14px;
    font-weight: 800;
}

.company span {
    color: #bc8f17;
}

.report-title {
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    flex: 1;
}

.report-date {
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
}

.metadata {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    padding: 4px 0 8px;
    font-size: 10px;
}

.metadata strong {
    margin-right: 4px;
}

table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 1px solid #555;
}

th,
td {
    border: 1px solid #555;
    padding: 4px 4px;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: pre-line;
    font-size: 9px;
}

th {
    background: #d8d8d8;
    font-weight: 800;
    text-align: center;
}

thead {
    display: table-header-group;
}

tr {
    break-inside: avoid;
    page-break-inside: avoid;
}

th:last-child,
td:last-child {
    border-right: 1px solid #555;
}

/* A4 landscape adjusted widths */
th:nth-child(1) { width: 3%; }
th:nth-child(2) { width: 8%; }
th:nth-child(3) { width: 11%; }
th:nth-child(4) { width: 15%; }
th:nth-child(5) { width: 4%; }
th:nth-child(6) { width: 10%; }
th:nth-child(7) { width: 6%; }
th:nth-child(8) { width: 15%; }
th:nth-child(9) { width: 10%; }
th:nth-child(10) { width: 7%; }
th:nth-child(11) { width: 7%; }

td:nth-child(1),
td:nth-child(5),
td:nth-child(7) {
    text-align: center;
}

td:nth-child(10) {
    text-align: center;
    font-weight: 700;
}

.status-pending {
    background: #ffc8c8;
    color: #990000;
}

.status-received {
    background: #d7f3df;
    color: #166534;
}

.status-cancelled {
    background: #e5e7eb;
    color: #374151;
}

.status-rejected {
    background: #fecaca;
    color: #991b1b;
}

.status-on-hold {
    background: #fef08a;
}

.overdue {
    color: #b91c1c;
    font-weight: 800;
}

.footer {
    margin-top: 10px;
    border-top: 1px solid #aaa;
    padding-top: 6px;
    text-align: center;
    font-size: 8px;
    color: #555;
}

.print-actions {
    margin-bottom: 10px;
    text-align: right;
}

.print-actions button {
    border: none;
    padding: 8px 14px;
    background: #d4af37;
    color: #111;
    cursor: pointer;
    font-weight: bold;
}

@media print {
    .print-actions {
        display: none;
    }

    body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
</style>
</head>

<body>

<div class="print-actions">
    <button onclick="window.print()">
        Print / Save as PDF
    </button>
</div>

<div class="heading">
    <div class="company">
        Auko-Tex <span>Group</span>
    </div>

    <div class="report-title">
        IT Requisition Summary Report
    </div>

    <div class="report-date">
        ${escapeHtml(formatDate(today()))}
    </div>
</div>

<div class="metadata">
    <div>
        <strong>Status:</strong> ${safeFilter}
    </div>

    <div>
        <strong>Total Records:</strong>
        ${filtered.length}
    </div>

    <div>
        <strong>Search:</strong> ${safeSearch}
    </div>
</div>

<div class="report-wrap">
    <table>
        <thead>
            <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>
</div>

<div class="footer">
    Auko-Tex Group — IT Department
    | Requisition Management System
</div>

</body>
</html>
`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        setSuccess(
            `PDF report opened with ${filtered.length} records. ` +
            "Choose Print / Save as PDF."
        );
    }

    // ========================================
    // PAGE
    // ========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4] p-3 text-gray-900 sm:p-5 lg:p-7">
            <div className="mx-auto max-w-[1700px] space-y-5">

                {/* HEADER */}
                <header className="flex flex-wrap items-center justify-between gap-3 rounded border-b-[3px] border-[#d4af37] bg-[#111111] p-5">
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
                        disabled={
                            saving || deletingId !== null
                        }
                        className="rounded bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                    >
                        + New Requisition
                    </button>
                </header>

                {/* SUMMARY */}
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

                {/* SEARCH / FILTER / EXPORT */}
                <section className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search item, model, employee..."
                            className={`${inputClass} min-w-0 flex-1 sm:min-w-[230px]`}
                        />

                        <select
                            value={filter}
                            onChange={(event) =>
                                setFilter(event.target.value)
                            }
                            aria-label="Filter by status"
                            className={`${inputClass} sm:w-48`}
                        >
                            <option value="ALL">
                                All Status
                            </option>

                            {STATUSES.map((status) => (
                                <option
                                    key={status}
                                    value={status}
                                >
                                    {statusLabel(status)}
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

                        <button
                            type="button"
                            onClick={() => void exportExcel()}
                            disabled={
                                loading ||
                                exporting ||
                                filtered.length === 0
                            }
                            className="rounded bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
                        >
                            {exporting
                                ? "Exporting..."
                                : "Export Excel"}
                        </button>

                        <button
                            type="button"
                            onClick={exportPDF}
                            disabled={
                                loading ||
                                filtered.length === 0
                            }
                            className="rounded bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
                        >
                            Export PDF
                        </button>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                        Export follows the selected status and
                        search filters. Currently selected:
                        {" "}
                        <strong>{statusLabel(filter)}</strong>
                        {" — "}
                        <strong>
                            {filtered.length} records
                        </strong>
                    </p>
                </section>

                {/* MESSAGES */}
                {error && (
                    <div
                        role="alert"
                        className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                {success && (
                    <div
                        role="status"
                        className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                    >
                        {success}
                    </div>
                )}

                {/* NEW / EDIT FORM */}
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
                                className="text-sm font-semibold text-gray-600 disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>

                        <form
                            onSubmit={saveRecord}
                            className="space-y-5"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

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
                                                {statusLabel(status)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

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

                            <p className="text-xs text-gray-600">
                                Requisition By is automatically recorded
                                from the administrator who creates the
                                requisition.
                            </p>

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

                {/* REQUISITION TABLE */}
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
                                    {[...HEADINGS, "Action"].map(
                                        (heading) => (
                                            <th
                                                key={heading}
                                                className="border-r border-gray-700 px-2.5 py-3 font-semibold"
                                            >
                                                {heading}
                                            </th>
                                        )
                                    )}
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
                                            <td className="px-2.5 py-3">
                                                {index + 1}
                                            </td>

                                            <td className="whitespace-nowrap px-2.5 py-3">
                                                {row.requisition_date}
                                            </td>

                                            <td className="px-2.5 py-3 font-semibold">
                                                {row.item}
                                            </td>

                                            <td className="max-w-[180px] whitespace-pre-line break-words px-2.5 py-3">
                                                {row.model || "—"}
                                            </td>

                                            <td className="px-2.5 py-3">
                                                {row.qty}
                                            </td>

                                            <td className="px-2.5 py-3">
                                                {row.requisition_by || "—"}
                                            </td>

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

                                            <td className="whitespace-pre-line px-2.5 py-3">
                                                {row.requisition_for || "—"}
                                            </td>

                                            <td className="px-2.5 py-3">
                                                {row.on_hold_for || "—"}
                                            </td>

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
                                                    {statusLabel(row.status)}
                                                </span>
                                            </td>

                                            <td className="max-w-[150px] whitespace-pre-line break-words px-2.5 py-3">
                                                {row.remarks || "—"}
                                            </td>

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

                <p className="text-right text-xs text-gray-500">
                    Cancelled requisitions: {cancelledCount}
                </p>
            </div>
        </main>
    );
}
