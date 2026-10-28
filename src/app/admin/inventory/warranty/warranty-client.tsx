
"use client";

import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

type Warranty = {
    id: string;
    product_id: string;
    product_name: string;
    serial: string;
    employee_id: string;
    name: string;
    designation: string;
    dept: string;
    contact: string;
    number_desk_location: string;
    invoice_no: string;
    supplier_name: string;
    supplier_contact: string;
    invoice_scan_copy: string;
    start_date: string;
    end_date: string;
    duration_days: number | null;
    issue_by: string;
    entry_by: string;
    warranty_status: string;
};

type FormFields = Pick<
    Warranty,
    | "product_id"
    | "product_name"
    | "serial"
    | "employee_id"
    | "name"
    | "designation"
    | "dept"
    | "contact"
    | "number_desk_location"
    | "invoice_no"
    | "supplier_name"
    | "supplier_contact"
    | "start_date"
    | "end_date"
>;

const API = "/api/admin/inventory/warranty";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fields: {
    key: keyof FormFields;
    label: string;
    required?: boolean;
    type?: string;
}[] = [
    { key: "product_id", label: "Asset ID", required: true },
    { key: "product_name", label: "Product Name", required: true },
    { key: "serial", label: "Serial" },
    { key: "employee_id", label: "Employee ID" },
    { key: "name", label: "User Name" },
    { key: "designation", label: "Designation" },
    { key: "dept", label: "Dept" },
    { key: "contact", label: "Contact", type: "tel" },
    { key: "number_desk_location", label: "Desk Location" },
    { key: "invoice_no", label: "Invoice No" },
    { key: "supplier_name", label: "Supplier Name" },
    {
        key: "supplier_contact",
        label: "Supplier Contact",
        type: "tel",
    },
    {
        key: "start_date",
        label: "Warranty Start Date",
        type: "date",
    },
    {
        key: "end_date",
        label: "Warranty End Date",
        type: "date",
    },
];

const columns = [
    "Asset ID",
    "Product Name",
    "Serial",
    "Employee ID",
    "User Name",
    "Designation",
    "Dept",
    "Contact",
    "Desk Location",
    "Invoice No",
    "Supplier Name",
    "Supplier Contact",
    "Invoice Scan Copy",
    "Warranty Start Date",
    "Warranty End Date",
    "Warranty Period",
    "Issue By",
    "Action",
];

function emptyForm(): FormFields {
    return {
        product_id: "",
        product_name: "",
        serial: "",
        employee_id: "",
        name: "",
        designation: "",
        dept: "",
        contact: "",
        number_desk_location: "",
        invoice_no: "",
        supplier_name: "",
        supplier_contact: "",
        start_date: "",
        end_date: "",
    };
}

function displayDate(value: string) {
    if (!value) return "—";

    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
}

function warrantyPeriod(
    startDate: string,
    endDate: string
) {
    if (!startDate || !endDate) return "—";
    if (endDate < startDate) return "Invalid dates";

    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return "Invalid dates";
    }

    const days = Math.round((end - start) / 86400000);

    return `${days.toLocaleString()} Days`;
}

function invoiceUrl(id: string) {
    return `${API}/${encodeURIComponent(id)}/invoice`;
}

const inputClass =
    "w-full rounded border border-gray-300 bg-white " +
    "px-3 py-2 text-sm text-gray-900 outline-none " +
    "focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]";

const cellClass = "px-2 py-3 align-top text-xs text-gray-900";

export default function WarrantyClient() {
    const [rows, setRows] = useState<Warranty[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const [form, setForm] = useState<FormFields>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [invoiceFile, setInvoiceFile] =
        useState<File | null>(null);

    const [fileInputKey, setFileInputKey] = useState(0);
    const [existingInvoice, setExistingInvoice] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    // ========================================
    // LOAD RECORDS
    // ========================================

    const loadRecords = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(API, {
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to load records"
                );
            }

            setRows(result.warranties || []);
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

    useEffect(() => {
        void loadRecords();
    }, [loadRecords]);

    // ========================================
    // FORM HELPERS
    // ========================================

    function resetFile() {
        setInvoiceFile(null);
        setFileInputKey((key) => key + 1);
    }

    function addRecord() {
        setForm(emptyForm());
        setEditingId(null);
        setExistingInvoice(false);
        resetFile();

        setShowForm(true);
        setError("");
        setMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function editRecord(row: Warranty) {
        setEditingId(row.id);

        setForm({
            product_id: row.product_id,
            product_name: row.product_name,
            serial: row.serial,
            employee_id: row.employee_id,
            name: row.name,
            designation: row.designation,
            dept: row.dept,
            contact: row.contact,
            number_desk_location: row.number_desk_location,
            invoice_no: row.invoice_no,
            supplier_name: row.supplier_name,
            supplier_contact: row.supplier_contact,
            start_date: row.start_date,
            end_date: row.end_date,
        });

        setExistingInvoice(Boolean(row.invoice_scan_copy));
        resetFile();

        setShowForm(true);
        setError("");
        setMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function closeForm() {
        if (saving) return;

        setShowForm(false);
        setEditingId(null);
        setExistingInvoice(false);
        resetFile();
        setError("");
    }

    // ========================================
    // INVOICE FILE SELECTION
    // ========================================

    function onFileChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0] || null;

        if (!file) {
            setInvoiceFile(null);
            return;
        }

        if (!/\.(pdf|jpg|jpeg)$/i.test(file.name)) {
            setError(
                "Only PDF, JPG and JPEG files are allowed."
            );
            resetFile();
            return;
        }

        if (
            file.size === 0 ||
            file.size > MAX_FILE_SIZE
        ) {
            setError(
                "Invoice must be between 1 byte and 10 MB."
            );
            resetFile();
            return;
        }

        setInvoiceFile(file);
        setError("");
    }

    // ========================================
    // JSON RESPONSE HELPER
    // ========================================

    async function readJson(response: Response) {
        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            throw new Error(
                `Server returned HTTP ${response.status}. ` +
                "Check the Next.js terminal for details."
            );
        }

        return response.json();
    }

    // ========================================
    // DELETE RECORD
    // Correctly placed inside WarrantyClient
    // but outside readJson()
    // ========================================

    async function deleteRecord(row: Warranty) {
        const confirmed = window.confirm(
            `Permanently delete this warranty record?\n\n` +
            `Asset ID: ${row.product_id}\n` +
            `Product: ${row.product_name}\n\n` +
            `The attached invoice will also be deleted.\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) return;

        setDeletingId(row.id);
        setError("");
        setMessage("");

        try {
            const response = await fetch(
                `${API}?id=${encodeURIComponent(row.id)}`,
                {
                    method: "DELETE",
                }
            );

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to delete record"
                );
            }

            if (editingId === row.id) {
                setShowForm(false);
                setEditingId(null);
                setExistingInvoice(false);
                resetFile();
            }

            setMessage(
                "Warranty record deleted successfully."
            );

            await loadRecords();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete warranty record."
            );
        } finally {
            setDeletingId(null);
        }
    }

    // ========================================
    // UPLOAD INVOICE
    // ========================================

    async function uploadInvoice(
        recordId: string,
        file: File
    ) {
        const data = new FormData();
        data.append("invoice", file);

        const response = await fetch(
            invoiceUrl(recordId),
            {
                method: "POST",
                body: data,
            }
        );

        const result = await readJson(response);

        if (!response.ok) {
            throw new Error(
                result.error || "Invoice upload failed"
            );
        }
    }

    // ========================================
    // SAVE / UPDATE RECORD
    // ========================================

    async function saveRecord(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            form.start_date &&
            form.end_date &&
            form.end_date < form.start_date
        ) {
            setError(
                "Warranty End Date cannot be before Start Date."
            );
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch(API, {
                method: editingId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    ...(editingId ? { id: editingId } : {}),
                }),
            });

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to save warranty"
                );
            }

            const savedId =
                editingId || String(result.id || "");

            if (!savedId) {
                throw new Error(
                    "Warranty saved but record ID was not returned."
                );
            }

            // Avoid duplicate records if upload fails.
            setEditingId(savedId);

            const hadInvoice = Boolean(invoiceFile);

            if (invoiceFile) {
                try {
                    await uploadInvoice(savedId, invoiceFile);
                } catch (uploadError) {
                    setError(
                        "Warranty details saved, but invoice " +
                        "upload failed: " +
                        (
                            uploadError instanceof Error
                                ? uploadError.message
                                : "Unknown error"
                        ) +
                        ". Retry from this edit form."
                    );

                    await loadRecords();
                    return;
                }
            }

            setShowForm(false);
            setEditingId(null);
            setExistingInvoice(false);
            resetFile();

            setMessage(
                hadInvoice
                    ? "Asset warranty and invoice saved successfully."
                    : "Asset warranty saved successfully."
            );

            await loadRecords();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save warranty"
            );
        } finally {
            setSaving(false);
        }
    }

    // ========================================
    // SEARCH AND FILTER
    // ========================================

    const filtered = rows.filter((row) => {
        const statusMatch =
            filter === "ALL" ||
            row.warranty_status === filter;

        const text = [
            row.product_id,
            row.product_name,
            row.serial,
            row.employee_id,
            row.name,
            row.designation,
            row.dept,
            row.contact,
            row.number_desk_location,
            row.invoice_no,
            row.supplier_name,
            row.supplier_contact,
            row.issue_by,
        ]
            .join(" ")
            .toLowerCase();

        return (
            statusMatch &&
            text.includes(
                search.trim().toLowerCase()
            )
        );
    });

    const counts = {
        active: rows.filter(
            (r) => r.warranty_status === "ACTIVE"
        ).length,

        expiring: rows.filter(
            (r) => r.warranty_status === "EXPIRING_SOON"
        ).length,

        expired: rows.filter(
            (r) => r.warranty_status === "EXPIRED"
        ).length,
    };

    // ========================================
    // PAGE UI
    // ========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4] p-3 text-gray-900 sm:p-5 lg:p-7">
            <div className="mx-auto max-w-[1800px] space-y-5">

                {/* HEADER */}
                <header className="flex flex-wrap items-center justify-between gap-4 rounded border-b-[3px] border-[#d4af37] bg-[#111111] p-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                            IT Asset & Warranty Register
                        </h1>

                        <p className="mt-1 text-sm text-gray-300">
                            Asset, Employee, Invoice & Warranty Tracking
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={addRecord}
                        disabled={saving || deletingId !== null}
                        className="rounded bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                    >
                        + Add Asset Warranty
                    </button>
                </header>

                {/* KPI CARDS */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {[
                        ["Total Records", rows.length],
                        ["Active Warranty", counts.active],
                        ["Expiring in 30 Days", counts.expiring],
                        ["Expired Warranty", counts.expired],
                    ].map(([label, value]) => (
                        <div
                            key={String(label)}
                            className="rounded border border-gray-200 bg-white p-4 shadow-sm"
                        >
                            <p className="text-xs font-semibold text-gray-600">
                                {label}
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* SEARCH AND FILTER */}
                <div className="flex flex-wrap gap-3 rounded border border-gray-200 bg-white p-4">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        placeholder="Search asset, serial, employee, supplier..."
                        className={`${inputClass} min-w-0 flex-1 sm:min-w-[250px]`}
                    />

                    <select
                        value={filter}
                        onChange={(e) =>
                            setFilter(e.target.value)
                        }
                        className={`${inputClass} sm:w-52`}
                        aria-label="Warranty status filter"
                    >
                        <option value="ALL">
                            All Warranties
                        </option>

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="EXPIRING_SOON">
                            Expiring Soon
                        </option>

                        <option value="EXPIRED">
                            Expired
                        </option>

                        <option value="UNKNOWN">
                            No Expiry Date
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={() => void loadRecords()}
                        disabled={
                            loading ||
                            saving ||
                            deletingId !== null
                        }
                        className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                        Refresh
                    </button>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                    <div
                        role="alert"
                        className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                {/* SUCCESS MESSAGE */}
                {message && (
                    <div
                        role="status"
                        className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                    >
                        {message}
                    </div>
                )}

                {/* ADD / EDIT FORM */}
                {showForm && (
                    <section className="rounded border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold">
                                {editingId
                                    ? "Edit Asset & Warranty"
                                    : "Add Asset & Warranty"}
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
                            {/* INPUT FIELDS */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {fields.map((field) => (
                                    <div key={field.key}>
                                        <label
                                            htmlFor={field.key}
                                            className="mb-1 block text-xs font-semibold text-gray-700"
                                        >
                                            {field.label}
                                            {field.required ? " *" : ""}
                                        </label>

                                        <input
                                            id={field.key}
                                            type={
                                                field.type || "text"
                                            }
                                            required={
                                                field.required
                                            }
                                            disabled={saving}
                                            maxLength={
                                                field.type === "date"
                                                    ? undefined
                                                    : field.key === "number_desk_location"
                                                    ? 1000
                                                    : field.key === "product_id"
                                                    ? 100
                                                    : field.key === "employee_id" ||
                                                      field.key === "contact" ||
                                                      field.key === "supplier_contact"
                                                    ? 50
                                                    : field.key === "invoice_no"
                                                    ? 150
                                                    : 200
                                            }
                                            value={
                                                form[field.key]
                                            }
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    [field.key]:
                                                        e.target.value,
                                                }))
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                ))}

                                {/* WARRANTY PERIOD */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                                        Warranty Period
                                    </label>

                                    <input
                                        readOnly
                                        value={warrantyPeriod(
                                            form.start_date,
                                            form.end_date
                                        )}
                                        className={`${inputClass} bg-gray-100`}
                                    />
                                </div>
                            </div>

                            {/* AUTOMATIC ISSUE BY */}
                            <p className="text-xs text-gray-600">
                                Issue By is automatically recorded
                                from the logged-in administrator
                                when the record is created.
                            </p>

                            {/* INVOICE UPLOAD */}
                            <div className="rounded border border-gray-200 bg-gray-50 p-4">
                                <label
                                    htmlFor="invoice-upload"
                                    className="mb-2 block text-sm font-bold text-gray-900"
                                >
                                    Invoice Scan Copy
                                </label>

                                <input
                                    key={fileInputKey}
                                    id="invoice-upload"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                                    onChange={onFileChange}
                                    disabled={saving}
                                    className="block w-full rounded border border-gray-300 bg-white p-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-[#d4af37] file:px-4 file:py-2 file:font-bold"
                                />

                                <p className="mt-2 text-xs text-gray-600">
                                    PDF, JPG or JPEG. Maximum 10 MB.
                                </p>

                                {invoiceFile && (
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded bg-amber-50 p-3 text-xs">
                                        <span className="break-all">
                                            {invoiceFile.name}
                                            {" ("}
                                            {(
                                                invoiceFile.size /
                                                1024 /
                                                1024
                                            ).toFixed(2)}
                                            {" MB)"}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={resetFile}
                                            disabled={saving}
                                            className="font-bold text-red-700"
                                        >
                                            Remove Selection
                                        </button>
                                    </div>
                                )}

                                {editingId && existingInvoice && (
                                    <a
                                        href={invoiceUrl(editingId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline"
                                    >
                                        View Existing Invoice
                                    </a>
                                )}
                            </div>

                            {editingId && (
                                <p className="text-xs text-gray-600">
                                    Internal record ID: {editingId}
                                </p>
                            )}

                            {/* FORM ACTIONS */}
                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={saving}
                                    className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded bg-[#d4af37] px-5 py-2 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId
                                        ? "Update Asset Warranty"
                                        : "Save Asset Warranty"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* WARRANTY RECORDS TABLE */}
                <section className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b p-4">
                        <h2 className="font-bold">
                            Asset & Warranty Records
                        </h2>

                        <span className="text-xs text-gray-600">
                            {filtered.length} records
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1900px] border-collapse text-left">
                            <thead className="bg-[#111111] text-white">
                                <tr>
                                    {columns.map((column) => (
                                        <th
                                            key={column}
                                            scope="col"
                                            className="border-r border-gray-700 px-2 py-3 text-xs font-semibold"
                                        >
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={18}
                                            className="p-8 text-center text-sm"
                                        >
                                            Loading records...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={18}
                                            className="p-8 text-center text-sm text-gray-500"
                                        >
                                            No records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-200 hover:bg-amber-50"
                                        >
                                            {[
                                                row.product_id,
                                                row.product_name,
                                                row.serial,
                                                row.employee_id,
                                                row.name,
                                                row.designation,
                                                row.dept,
                                                row.contact,
                                                row.number_desk_location,
                                                row.invoice_no,
                                                row.supplier_name,
                                                row.supplier_contact,
                                            ].map((value, index) => (
                                                <td
                                                    key={index}
                                                    className={cellClass}
                                                >
                                                    {value || "—"}
                                                </td>
                                            ))}

                                            {/* INVOICE */}
                                            <td className={cellClass}>
                                                {row.invoice_scan_copy ? (
                                                    <a
                                                        href={invoiceUrl(
                                                            row.id
                                                        )}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="whitespace-nowrap font-semibold text-blue-700 hover:underline"
                                                    >
                                                        View Invoice
                                                    </a>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            {/* WARRANTY DATES */}
                                            <td
                                                className={`${cellClass} whitespace-nowrap`}
                                            >
                                                {displayDate(
                                                    row.start_date
                                                )}
                                            </td>

                                            <td
                                                className={`${cellClass} whitespace-nowrap`}
                                            >
                                                {displayDate(
                                                    row.end_date
                                                )}
                                            </td>

                                            {/* PERIOD */}
                                            <td
                                                className={`${cellClass} whitespace-nowrap`}
                                            >
                                                {row.duration_days === null
                                                    ? "—"
                                                    : `${row.duration_days} Days`}
                                            </td>

                                            {/* ISSUE BY */}
                                            <td className={cellClass}>
                                                {row.issue_by ||
                                                    row.entry_by ||
                                                    "—"}
                                            </td>

                                            {/* EDIT / DELETE */}
                                            <td className={cellClass}>
                                                <div className="flex items-center gap-3 whitespace-nowrap">
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
