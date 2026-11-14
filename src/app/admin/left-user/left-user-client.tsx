
"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
import * as XLSX from "xlsx";

// ============================================
// TYPES
// ============================================

type Movement = "LEFT" | "NEW_JOIN";

type DeviceKey =
    | "desktop_set"
    | "laptop"
    | "aio";

type LeftUserRecord = {
    id: string;
    movement_type: Movement;
    section_name: string;
    user_name: string;
    designation: string;
    department: string;
    mobile_no: string;
    user_location: string;
    desktop_set: number;
    laptop: number;
    aio: number;
    join_left_date: string;
    computer_management_status: string;
    data_backup_status: string;
    sim_handover_status: string;
    email_management: string;
    whatsapp_management: string;
    pending_requirements: string;
    service_ensured_by: string;
    remarks: string;
    created_by: string;
};

type LeftUserForm = Omit<
    LeftUserRecord,
    "id" | "created_by"
>;

type SupportStaff = {
    id: number;
    portal_user_id: number;
    employee_id: string | null;
    full_name: string;
    staff_title: string | null;
    designation: string | null;
    department: string | null;
    is_active: boolean;
    can_receive_tickets: boolean;
    account_status: string;
};

type TextKey =
    | "user_name"
    | "designation"
    | "department"
    | "mobile_no"
    | "user_location"
    | "pending_requirements"
    | "remarks";

type StatusKey =
    | "computer_management_status"
    | "data_backup_status"
    | "sim_handover_status"
    | "email_management"
    | "whatsapp_management";

// ============================================
// ENDPOINTS
// ============================================

const API = "/api/admin/left-user";
const STAFF_API = "/api/admin/support/staff";

// ============================================
// STYLES
// ============================================

const inputClass =
    "w-full rounded border border-gray-300 bg-white " +
    "px-3 py-2 text-center text-sm text-gray-900 " +
    "outline-none focus:border-[#d4af37]";

const labelClass =
    "mb-1 block text-center text-xs " +
    "font-semibold text-gray-700";

const thClass =
    "border border-gray-600 px-3 py-3 " +
    "text-center align-middle text-xs font-semibold";

const tdClass =
    "border border-gray-300 px-3 py-3 " +
    "text-center align-middle text-xs " +
    "whitespace-normal break-words";

// ============================================
// DEVICE OPTIONS
// ============================================

const DEVICE_OPTIONS: {
    key: DeviceKey;
    label: string;
}[] = [
        {
            key: "desktop_set",
            label: "Desktop Set",
        },
        {
            key: "laptop",
            label: "Laptop",
        },
        {
            key: "aio",
            label: "All in One (AIO)",
        },
    ];

// ============================================
// EMPLOYEE FIELDS
// ============================================

const TEXT_FIELDS: {
    key: TextKey;
    label: string;
    required?: boolean;
    textarea?: boolean;
}[] = [
        {
            key: "user_name",
            label: "User Name",
            required: true,
        },
        {
            key: "designation",
            label: "Designation",
        },
        {
            key: "department",
            label: "Department",
        },
        {
            key: "mobile_no",
            label: "Mobile No",
        },
        {
            key: "user_location",
            label: "User Location",
        },
        {
            key: "pending_requirements",
            label: "Pending Requirements (If Any)",
            textarea: true,
        },
        {
            key: "remarks",
            label: "Remarks",
            textarea: true,
        },
    ];

// ============================================
// MANAGEMENT FIELDS
// ============================================

const STATUS_FIELDS: {
    key: StatusKey;
    label: string;
    options: string[];
}[] = [
        {
            key: "computer_management_status",
            label: "Computer Management",
            options: [
                "",
                "Done",
                "Pending",
                "Not Required",
            ],
        },
        {
            key: "data_backup_status",
            label: "Data Backup Management",
            options: [
                "",
                "Done",
                "Pending",
                "Not Required",
            ],
        },
        {
            key: "sim_handover_status",
            label: "SIM Management",
            options: [
                "",
                "Handover",
                "Takeover",
                "No",
            ],
        },
        {
            key: "email_management",
            label: "E-mail Management",
            options: [
                "",
                "Yes",
                "No",
                "Done",
                "Pending",
                "Not Required",
            ],
        },
        {
            key: "whatsapp_management",
            label: "WhatsApp Management",
            options: [
                "",
                "Yes",
                "No",
                "Done",
                "Pending",
                "Not Required",
            ],
        },
    ];

// ============================================
// EXPORT AND TABLE COLUMNS
// ============================================

const TABLE_HEADERS = [
    "SL No",
    "User Name",
    "Designation",
    "Department",
    "Mobile No",
    "User Location",
    "Join / Left Date",
    "Type",
    "Device Management",
    "Computer Management",
    "Data Backup Management",
    "SIM Management",
    "E-mail Management",
    "WhatsApp Management",
    "Pending Requirements (If Any)",
    "Service Ensured By",
    "Issued By",
    "Remarks",
    "Action",
];

const EXPORT_HEADERS = TABLE_HEADERS.filter(
    (heading) => heading !== "Action"
);

// ============================================
// HELPERS
// ============================================

function currentDate(): string {
    const date = new Date();

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function readableDate(value: string): string {
    if (!value) return "—";

    const [year, month, day] = value.split("-");

    return year && month && day
        ? `${day}-${month}-${year}`
        : value;
}

function blankForm(): LeftUserForm {
    return {
        movement_type: "LEFT",
        section_name: "Top Management",
        user_name: "",
        designation: "",
        department: "",
        mobile_no: "",
        user_location: "",
        desktop_set: 0,
        laptop: 0,
        aio: 0,
        join_left_date: currentDate(),
        computer_management_status: "",
        data_backup_status: "",
        sim_handover_status: "",
        email_management: "",
        whatsapp_management: "",
        pending_requirements: "",
        service_ensured_by: "",
        remarks: "",
    };
}

function deviceLabel(
    row: Pick<
        LeftUserForm,
        "desktop_set" | "laptop" | "aio"
    >
): string {
    const selected = DEVICE_OPTIONS
        .filter(
            (device) =>
                Number(row[device.key]) > 0
        )
        .map((device) => device.label);

    return selected.length
        ? selected.join(", ")
        : "No Device";
}

function displayText(value: unknown): string {
    if (value === null || value === undefined) {
        return "—";
    }

    return String(value).trim() || "—";
}

function formatStaffName(
    member: SupportStaff
): string {
    return [
        member.employee_id,
        member.full_name,
        member.staff_title || member.designation,
    ]
        .filter(Boolean)
        .join(" - ");
}

async function readJson(response: Response) {
    const type =
        response.headers.get("content-type") || "";

    if (!type.includes("application/json")) {
        throw new Error(
            `Unexpected server response: HTTP ${response.status}`
        );
    }

    return response.json();
}

// Prevent HTML injection in printable report.
function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ============================================
// EXPORT ROW MAPPING
// ============================================

function getExportRow(
    row: LeftUserRecord,
    serial: number
): (string | number)[] {
    return [
        serial,
        row.user_name,
        row.designation,
        row.department,
        row.mobile_no,
        row.user_location,
        readableDate(row.join_left_date),
        row.movement_type === "LEFT"
            ? "LEFT"
            : "NEW JOIN",
        deviceLabel(row),
        row.computer_management_status,
        row.data_backup_status,
        row.sim_handover_status,
        row.email_management,
        row.whatsapp_management,
        row.pending_requirements,
        row.service_ensured_by,
        row.created_by,
        row.remarks,
    ];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function LeftUserClient() {
    const [records, setRecords] =
        useState<LeftUserRecord[]>([]);

    const [supportStaff, setSupportStaff] =
        useState<SupportStaff[]>([]);

    const [loading, setLoading] = useState(true);
    const [staffLoading, setStaffLoading] =
        useState(true);

    const [busy, setBusy] = useState(false);

    const [deletingId, setDeletingId] =
        useState<string | null>(null);

    const [filter, setFilter] =
        useState<"ALL" | Movement>("ALL");

    const [search, setSearch] = useState("");

    const [form, setForm] =
        useState<LeftUserForm>(blankForm);

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [showForm, setShowForm] =
        useState(false);

    const [scrollKey, setScrollKey] =
        useState(0);

    const formRef = useRef<HTMLElement>(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [staffError, setStaffError] =
        useState("");

    // ========================================
    // LOAD RECORDS
    // ========================================

    const reload = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(API, {
                cache: "no-store",
            });

            const data = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to load records"
                );
            }

            setRecords(
                Array.isArray(data.records)
                    ? data.records
                    : []
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load records"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // ========================================
    // LOAD SUPPORT STAFF
    // ========================================

    const loadSupportStaff = useCallback(
        async () => {
            setStaffLoading(true);
            setStaffError("");

            try {
                const response = await fetch(
                    STAFF_API,
                    { cache: "no-store" }
                );

                const data = await readJson(response);

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        data.error ||
                        "Unable to load IT Support Staff"
                    );
                }

                const staff: SupportStaff[] =
                    Array.isArray(data.staff)
                        ? data.staff
                        : [];

                setSupportStaff(
                    staff.filter(
                        (member) =>
                            member.is_active === true &&
                            member.account_status === "ACTIVE"
                    )
                );
            } catch (err) {
                setStaffError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load IT Support Staff"
                );
            } finally {
                setStaffLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        void reload();
        void loadSupportStaff();
    }, [reload, loadSupportStaff]);

    // ========================================
    // AUTO SCROLL
    // ========================================

    useEffect(() => {
        if (showForm && scrollKey > 0) {
            formRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [showForm, scrollKey]);

    // ========================================
    // FORM OPERATIONS
    // ========================================

    function openNew() {
        setEditingId(null);
        setForm(blankForm());
        setError("");
        setMessage("");
        setShowForm(true);
        setScrollKey((x) => x + 1);
    }

    function openEdit(row: LeftUserRecord) {
        setEditingId(row.id);

        setForm({
            movement_type: row.movement_type,
            section_name: row.section_name,
            user_name: row.user_name,
            designation: row.designation,
            department: row.department,
            mobile_no: row.mobile_no,
            user_location: row.user_location,
            desktop_set: row.desktop_set,
            laptop: row.laptop,
            aio: row.aio,
            join_left_date: row.join_left_date,
            computer_management_status:
                row.computer_management_status,
            data_backup_status:
                row.data_backup_status,
            sim_handover_status:
                row.sim_handover_status,
            email_management:
                row.email_management,
            whatsapp_management:
                row.whatsapp_management,
            pending_requirements:
                row.pending_requirements,
            service_ensured_by:
                row.service_ensured_by,
            remarks: row.remarks,
        });

        setError("");
        setMessage("");
        setShowForm(true);
        setScrollKey((x) => x + 1);
    }

    function closeForm() {
        if (busy) return;
        setShowForm(false);
        setEditingId(null);
    }

    function updateField(
        key: keyof LeftUserForm,
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    function toggleDevice(
        key: DeviceKey,
        checked: boolean
    ) {
        setForm((previous) => ({
            ...previous,
            [key]: checked
                ? Math.max(
                    Number(previous[key]) || 0,
                    1
                )
                : 0,
        }));
    }

    function selectNoDevice() {
        setForm((previous) => ({
            ...previous,
            desktop_set: 0,
            laptop: 0,
            aio: 0,
        }));
    }

    const noDevice =
        Number(form.desktop_set) <= 0 &&
        Number(form.laptop) <= 0 &&
        Number(form.aio) <= 0;

    // ========================================
    // SAVE
    // ========================================

    async function save(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        if (busy) return;

        setBusy(true);
        setError("");
        setMessage("");

        const editing = Boolean(editingId);

        try {
            const response = await fetch(API, {
                method: editing ? "PATCH" : "POST",
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

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error || "Save failed"
                );
            }

            setShowForm(false);
            setEditingId(null);

            await reload();

            setMessage(
                editing
                    ? "Record updated successfully."
                    : "Record added successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Save failed"
            );
        } finally {
            setBusy(false);
        }
    }

    // ========================================
    // DELETE
    // ========================================

    async function remove(row: LeftUserRecord) {
        if (
            !window.confirm(
                `Delete record for ${row.user_name}?`
            )
        ) {
            return;
        }

        setDeletingId(row.id);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                `${API}?id=${encodeURIComponent(row.id)}`,
                { method: "DELETE" }
            );

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error || "Delete failed"
                );
            }

            if (editingId === row.id) {
                setShowForm(false);
                setEditingId(null);
            }

            await reload();

            setMessage(
                "Record deleted successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Delete failed"
            );
        } finally {
            setDeletingId(null);
        }
    }

    // ========================================
    // FILTER
    // ========================================

    const filtered = records.filter((row) => {
        const matchesType =
            filter === "ALL" ||
            row.movement_type === filter;

        const searchable = [
            row.user_name,
            row.designation,
            row.department,
            row.mobile_no,
            row.user_location,
            row.movement_type,
            row.service_ensured_by,
            row.created_by,
            row.pending_requirements,
            row.remarks,
            deviceLabel(row),
        ]
            .join(" ")
            .toLowerCase();

        return (
            matchesType &&
            searchable.includes(
                search.trim().toLowerCase()
            )
        );
    });

    const leftCount = records.filter(
        (row) => row.movement_type === "LEFT"
    ).length;

    const joinedCount = records.filter(
        (row) => row.movement_type === "NEW_JOIN"
    ).length;

    // ========================================
    // EXCEL EXPORT
    // ========================================

    function exportExcel() {
        if (filtered.length === 0) return;

        try {
            const data = [
                EXPORT_HEADERS,
                ...filtered.map((row, index) =>
                    getExportRow(row, index + 1)
                ),
            ];

            const worksheet =
                XLSX.utils.aoa_to_sheet(data);

            worksheet["!cols"] = [
                { wch: 8 },
                { wch: 24 },
                { wch: 20 },
                { wch: 20 },
                { wch: 16 },
                { wch: 22 },
                { wch: 18 },
                { wch: 12 },
                { wch: 28 },
                { wch: 22 },
                { wch: 24 },
                { wch: 18 },
                { wch: 20 },
                { wch: 22 },
                { wch: 40 },
                { wch: 24 },
                { wch: 22 },
                { wch: 40 },
            ];

            worksheet["!autofilter"] = {
                ref: worksheet["!ref"] || "A1:R1",
            };

            // Preserve mobile numbers and IDs as text.
            for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
                const mobileCell = XLSX.utils.encode_cell({
                    r: rowIndex,
                    c: 4,
                });

                const cell = worksheet[mobileCell];

                if (cell) {
                    cell.t = "s";
                    cell.v = String(cell.v ?? "");
                }
            }

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "User Management"
            );

            const filterName =
                filter === "ALL"
                    ? "ALL"
                    : filter;

            XLSX.writeFile(
                workbook,
                `ATG_User_Management_${filterName}_${currentDate()}.xlsx`
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Excel export failed"
            );
        }
    }

    // ========================================
    // PDF EXPORT - A4 LANDSCAPE
    // ========================================

    function exportPDF() {
        if (filtered.length === 0) return;

        const printWindow = window.open(
            "",
            "_blank"
        );

        if (!printWindow) {
            setError(
                "Allow pop-ups for this site to export PDF."
            );
            return;
        }

        const filterTitle =
            filter === "ALL"
                ? "All Users"
                : filter === "LEFT"
                    ? "Left Users"
                    : "New Joiners";

        const tableHead = EXPORT_HEADERS.map(
            (heading) =>
                `<th>${escapeHtml(heading)}</th>`
        ).join("");

        const tableBody = filtered.map(
            (row, index) => {
                const cells = getExportRow(
                    row,
                    index + 1
                );

                return `
                    <tr>
                        ${cells
                        .map(
                            (value) =>
                                `<td>${escapeHtml(value)}</td>`
                        )
                        .join("")}
                    </tr>
                `;
            }
        ).join("");

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Auko-Tex Group - User Management</title>

<style>
    @page {
        size: A4 landscape;
        margin: 8mm;
    }

    * {
        box-sizing: border-box;
    }

    html, body {
        width: 100%;
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        color: #111;
        background: white;
    }

    .report {
        width: 100%;
    }

    h1 {
        margin: 0;
        font-size: 13pt;
        text-align: center;
    }

    h2 {
        margin: 4px 0;
        font-size: 10pt;
        text-align: center;
    }

    .meta {
        margin: 6px 0 10px;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 7pt;
    }

    table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 5.4pt;
    }

    th, td {
        border: 0.5pt solid #444;
        padding: 3px 2px;
        text-align: center;
        vertical-align: middle;
        overflow-wrap: anywhere;
        word-break: break-word;
        white-space: pre-wrap;
    }

    th {
        background: #111 !important;
        color: white !important;
        font-weight: bold;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    thead {
        display: table-header-group;
    }

    tr {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .footer {
        text-align: center;
        margin-top: 10px;
        font-size: 7pt;
        color: #555;
    }

    .print-controls {
        margin: 10px 0;
        text-align: center;
    }

    button {
        padding: 8px 18px;
        cursor: pointer;
    }

    @media print {
        .print-controls {
            display: none;
        }
    }
</style>
</head>

<body>
<div class="report">

    <div class="print-controls">
        <button onclick="window.print()">
            Print / Save as PDF
        </button>
    </div>

    <h1>AUKO-TEX GROUP</h1>

    <h2>
        ATG Left &amp; New Join User Information
        (Factory)
    </h2>

    <div class="meta">
        <span>
            Report: ${escapeHtml(filterTitle)}
        </span>
        <span>
            Total Records: ${filtered.length}
        </span>
        <span>
            Date: ${escapeHtml(readableDate(currentDate()))}
        </span>
    </div>

    <table>
        <thead>
            <tr>${tableHead}</tr>
        </thead>
        <tbody>
            ${tableBody}
        </tbody>
    </table>

    <div class="footer">
        Auko-Tex Group - IT Department
        | User Management
    </div>

</div>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
    }

    // ========================================
    // MAIN PAGE
    // ========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4] p-3 text-gray-900 sm:p-5 lg:p-7">
            <div className="mx-auto w-full space-y-5">

                {/* HEADER */}
                <header className="flex flex-wrap items-center justify-between gap-3 rounded border-b-[3px] border-[#d4af37] bg-[#111111] p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
                            AUKO-TEX GROUP
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-white">
                            User Management
                        </h1>

                        <p className="mt-1 text-sm text-gray-300">
                            ATG Left &amp; New Join User Information
                            (Factory)
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openNew}
                        disabled={busy || deletingId !== null}
                        className="rounded bg-[#d4af37] px-4 py-2 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                    >
                        + Add User Record
                    </button>
                </header>

                {/* SUMMARY */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ["Total Records", records.length],
                        ["Left Users", leftCount],
                        ["New Joiners", joinedCount],
                    ].map(([label, value]) => (
                        <div
                            key={String(label)}
                            className="rounded border border-gray-200 bg-white p-4 text-center shadow-sm"
                        >
                            <p className="text-xs font-semibold text-gray-600">
                                {label}
                            </p>

                            <p className="mt-1 text-2xl font-bold">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* FILTER + EXPORT BAR */}
                <section className="flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-4">

                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search user, department, device, engineer..."
                        className={`${inputClass} min-w-0 flex-1 sm:min-w-[220px]`}
                    />

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(
                                event.target.value as
                                "ALL" | Movement
                            )
                        }
                        className={`${inputClass} sm:w-40`}
                    >
                        <option value="ALL">
                            All Users
                        </option>
                        <option value="LEFT">
                            Left Users
                        </option>
                        <option value="NEW_JOIN">
                            New Joiners
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={() => {
                            void reload();
                            void loadSupportStaff();
                        }}
                        disabled={loading || busy}
                        className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={exportExcel}
                        disabled={loading || filtered.length === 0}
                        className="rounded border border-green-600 bg-green-50 px-4 py-2 text-sm font-bold text-green-800 hover:bg-green-100 disabled:opacity-50"
                    >
                        Export Excel
                    </button>

                    <button
                        type="button"
                        onClick={exportPDF}
                        disabled={loading || filtered.length === 0}
                        className="rounded border border-red-600 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
                    >
                        Export PDF
                    </button>

                </section>

                {/* MESSAGES */}
                {error && (
                    <div
                        role="alert"
                        className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                {message && (
                    <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                        {message}
                    </div>
                )}

                {/* ADD / EDIT FORM */}
                {showForm && (
                    <section
                        ref={formRef}
                        className="scroll-mt-24 rounded border border-gray-200 bg-white p-5 shadow-sm"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold">
                                {editingId
                                    ? "Edit User Record"
                                    : "Add User Record"}
                            </h2>

                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={busy}
                                className="text-sm font-semibold text-gray-600"
                            >
                                Close
                            </button>
                        </div>

                        <form
                            onSubmit={save}
                            className="space-y-5"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

                                {/* EMPLOYEE FIELDS */}
                                {TEXT_FIELDS.filter(
                                    (field) => !field.textarea
                                ).map((field) => (
                                    <div key={field.key}>
                                        <label
                                            htmlFor={field.key}
                                            className={labelClass}
                                        >
                                            {field.label}
                                            {field.required ? " *" : ""}
                                        </label>

                                        <input
                                            id={field.key}
                                            type={
                                                field.key === "mobile_no"
                                                    ? "tel"
                                                    : "text"
                                            }
                                            value={form[field.key]}
                                            onChange={(event) =>
                                                updateField(
                                                    field.key,
                                                    event.target.value
                                                )
                                            }
                                            required={field.required}
                                            disabled={busy}
                                            maxLength={200}
                                            className={inputClass}
                                        />
                                    </div>
                                ))}

                                {/* DATE */}
                                <div>
                                    <label
                                        htmlFor="join_left_date"
                                        className={labelClass}
                                    >
                                        Join / Left Date *
                                    </label>

                                    <input
                                        id="join_left_date"
                                        type="date"
                                        value={form.join_left_date}
                                        onChange={(event) =>
                                            updateField(
                                                "join_left_date",
                                                event.target.value
                                            )
                                        }
                                        required
                                        disabled={busy}
                                        className={inputClass}
                                    />
                                </div>

                                {/* TYPE */}
                                <div>
                                    <label
                                        htmlFor="movement_type"
                                        className={labelClass}
                                    >
                                        Type *
                                    </label>

                                    <select
                                        id="movement_type"
                                        value={form.movement_type}
                                        onChange={(event) =>
                                            updateField(
                                                "movement_type",
                                                event.target.value
                                            )
                                        }
                                        disabled={busy}
                                        className={inputClass}
                                    >
                                        <option value="LEFT">
                                            LEFT
                                        </option>
                                        <option value="NEW_JOIN">
                                            NEW JOIN
                                        </option>
                                    </select>
                                </div>

                                {/* DEVICE MANAGEMENT */}
                                <div>
                                    <label className={labelClass}>
                                        Device Management
                                    </label>

                                    <details className="relative">
                                        <summary className={`${inputClass} cursor-pointer list-none`}>
                                            {deviceLabel(form)}
                                        </summary>

                                        <div className="absolute left-0 right-0 z-20 mt-1 rounded border border-gray-300 bg-white p-3 shadow-lg">

                                            <label className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm hover:bg-amber-50">
                                                <input
                                                    type="checkbox"
                                                    checked={noDevice}
                                                    onChange={selectNoDevice}
                                                    disabled={busy}
                                                    className="h-4 w-4 accent-[#d4af37]"
                                                />
                                                No Device
                                            </label>

                                            <div className="my-2 border-t border-gray-200" />

                                            {DEVICE_OPTIONS.map((device) => (
                                                <label
                                                    key={device.key}
                                                    className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm hover:bg-amber-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            Number(form[device.key]) > 0
                                                        }
                                                        onChange={(event) =>
                                                            toggleDevice(
                                                                device.key,
                                                                event.target.checked
                                                            )
                                                        }
                                                        disabled={busy}
                                                        className="h-4 w-4 accent-[#d4af37]"
                                                    />

                                                    {device.label}
                                                </label>
                                            ))}
                                        </div>
                                    </details>
                                </div>

                                {/* MANAGEMENT STATUSES */}
                                {STATUS_FIELDS.map((field) => (
                                    <div key={field.key}>
                                        <label
                                            htmlFor={field.key}
                                            className={labelClass}
                                        >
                                            {field.label}
                                        </label>

                                        <select
                                            id={field.key}
                                            value={form[field.key]}
                                            onChange={(event) =>
                                                updateField(
                                                    field.key,
                                                    event.target.value
                                                )
                                            }
                                            disabled={busy}
                                            className={inputClass}
                                        >
                                            {form[field.key] &&
                                                !field.options.includes(
                                                    form[field.key]
                                                ) && (
                                                    <option value={form[field.key]}>
                                                        {form[field.key]} (Existing)
                                                    </option>
                                                )}

                                            {field.options.map((option) => (
                                                <option
                                                    key={option || "blank"}
                                                    value={option}
                                                >
                                                    {option || "Select Status"}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}

                                {/* SERVICE ENSURED BY */}
                                <div>
                                    <label
                                        htmlFor="service_ensured_by"
                                        className={labelClass}
                                    >
                                        Service Ensured By
                                    </label>

                                    <select
                                        id="service_ensured_by"
                                        value={form.service_ensured_by}
                                        onChange={(event) =>
                                            updateField(
                                                "service_ensured_by",
                                                event.target.value
                                            )
                                        }
                                        disabled={busy}
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {staffLoading
                                                ? "Loading Engineers..."
                                                : "Select IT Support Engineer"}
                                        </option>

                                        {form.service_ensured_by &&
                                            !supportStaff.some(
                                                (member) =>
                                                    member.full_name ===
                                                    form.service_ensured_by
                                            ) && (
                                                <option
                                                    value={form.service_ensured_by}
                                                >
                                                    {form.service_ensured_by} (Previously Assigned)
                                                </option>
                                            )}

                                        {supportStaff.map((member) => (
                                            <option
                                                key={member.portal_user_id}
                                                value={member.full_name}
                                            >
                                                {formatStaffName(member)}
                                            </option>
                                        ))}
                                    </select>

                                    {staffError && (
                                        <p className="mt-1 text-xs text-red-700">
                                            {staffError}
                                        </p>
                                    )}
                                </div>

                                {/* TEXTAREAS */}
                                {TEXT_FIELDS.filter(
                                    (field) => field.textarea
                                ).map((field) => (
                                    <div
                                        key={field.key}
                                        className="md:col-span-2 xl:col-span-3"
                                    >
                                        <label
                                            htmlFor={field.key}
                                            className={labelClass}
                                        >
                                            {field.label}
                                        </label>

                                        <textarea
                                            id={field.key}
                                            rows={3}
                                            value={form[field.key]}
                                            onChange={(event) =>
                                                updateField(
                                                    field.key,
                                                    event.target.value
                                                )
                                            }
                                            disabled={busy}
                                            maxLength={5000}
                                            className={inputClass}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* FORM BUTTONS */}
                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={busy}
                                    className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="rounded bg-[#d4af37] px-5 py-2 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                                >
                                    {busy
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Record"
                                            : "Save Record"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* FULL SCROLLABLE TABLE */}
                <section className="w-full overflow-hidden rounded border border-gray-200 bg-white shadow-sm">

                    <div className="flex items-center justify-between border-b p-4">
                        <h2 className="font-bold">
                            ATG User Information (Factory)
                        </h2>

                        <span className="text-xs text-gray-600">
                            {filtered.length} records
                        </span>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-max min-w-full table-auto border-collapse">
                            <thead className="bg-[#111111] text-white">
                                <tr>

                                    {TABLE_HEADERS.map((heading) => {
                                        const compactColumns = [
                                            "Computer Management",
                                            "Data Backup Management",
                                            "SIM Management",
                                            "E-mail Management",
                                            "WhatsApp Management",
                                        ];

                                        const isCompact = compactColumns.includes(heading);

                                        const isLongText = [
                                            "Pending Requirements (If Any)",
                                            "Remarks",
                                        ].includes(heading);

                                        return (
                                            <th
                                                key={heading}
                                                scope="col"
                                                className={
                                                    thClass +
                                                    (isCompact
                                                        ? " w-[105px] min-w-[105px] max-w-[105px]"
                                                        : isLongText
                                                            ? " w-[180px] min-w-[180px] max-w-[180px]"
                                                            : "")
                                                }
                                            >
                                                {heading}
                                            </th>
                                        );
                                    })}

                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={TABLE_HEADERS.length}
                                            className="p-8 text-center text-sm"
                                        >
                                            Loading records...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={TABLE_HEADERS.length}
                                            className="p-8 text-center text-sm text-gray-500"
                                        >
                                            No records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((row, index) => {
                                        const values = getExportRow(
                                            row,
                                            index + 1
                                        );

                                        return (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-amber-50"
                                            >
                                                {values.map((value, column) => (
                                                    <td
                                                        key={column}

                                                        className={
                                                            tdClass +
                                                            ([9, 10, 11, 12, 13].includes(column)
                                                                ? " w-[105px] min-w-[105px] max-w-[105px]"
                                                                : [14, 17].includes(column)
                                                                    ? " w-[180px] min-w-[180px] max-w-[180px] whitespace-normal break-words"
                                                                    : "") +
                                                            (column === 0
                                                                ? " bg-sky-50 font-semibold"
                                                                : column === 8
                                                                    ? " bg-rose-50"
                                                                    : " bg-white")
                                                        }

                                                    >
                                                        {column === 7 ? (
                                                            <span
                                                                className={
                                                                    row.movement_type === "LEFT"
                                                                        ? "rounded bg-rose-100 px-2 py-1 font-semibold text-rose-800"
                                                                        : "rounded bg-green-100 px-2 py-1 font-semibold text-green-800"
                                                                }
                                                            >
                                                                {value}
                                                            </span>
                                                        ) : (
                                                            displayText(value)
                                                        )}
                                                    </td>
                                                ))}

                                                <td className={tdClass}>
                                                    <div className="flex justify-center gap-3 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEdit(row)
                                                            }
                                                            disabled={
                                                                busy ||
                                                                deletingId !== null
                                                            }
                                                            className="font-semibold text-blue-700 disabled:opacity-50"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void remove(row)
                                                            }
                                                            disabled={
                                                                busy ||
                                                                deletingId !== null
                                                            }
                                                            className="font-semibold text-red-700 disabled:opacity-50"
                                                        >
                                                            {deletingId === row.id
                                                                ? "Deleting..."
                                                                : "Delete"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <p className="text-center text-xs text-gray-500">
                    Auko-Tex Group — IT Department |
                    User Management
                </p>
            </div>
        </main>
    );
}
