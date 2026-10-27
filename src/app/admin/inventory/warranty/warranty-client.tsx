
"use client";

import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
    type ChangeEvent,
} from "react";

type Warranty = {
    id: string;
    product_id: string;
    product_name: string;
    serial: string;
    name: string;
    designation: string;
    dept: string;
    number_desk_location: string;
    invoice_no: string;
    supplier_no: string;
    invoice_scan_copy: string;
    start_date: string;
    end_date: string;
    duration_days: number | null;
    entry_by: string;
    warranty_status: string;
};

type FormFields = Omit<
    Warranty,
    "id" | "duration_days" | "entry_by" | "warranty_status"
>;

const API = "/api/admin/inventory/warranty";

const MAX_INVOICE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg"];

const fields: {
    key: Exclude<keyof FormFields, "invoice_scan_copy">;
    label: string;
    required?: boolean;
    type?: string;
}[] = [
        {
            key: "product_id",
            label: "Product ID",
            required: true,
        },
        {
            key: "product_name",
            label: "Product Name",
            required: true,
        },
        { key: "serial", label: "Serial" },
        { key: "name", label: "Name" },
        { key: "designation", label: "Designation" },
        { key: "dept", label: "Dept" },
        {
            key: "number_desk_location",
            label: "Number / Desk Location",
        },
        { key: "invoice_no", label: "Invoice No" },
        { key: "supplier_no", label: "Supplier No" },
        {
            key: "start_date",
            label: "Start Date",
            type: "date",
        },
        {
            key: "end_date",
            label: "End Date",
            type: "date",
        },
    ];

function emptyForm(): FormFields {
    return {
        product_id: "",
        product_name: "",
        serial: "",
        name: "",
        designation: "",
        dept: "",
        number_desk_location: "",
        invoice_no: "",
        supplier_no: "",
        invoice_scan_copy: "",
        start_date: "",
        end_date: "",
    };
}

function displayDate(value: string) {
    if (!value) return "—";

    const [year, month, day] = value.split("-");

    return `${day}-${month}-${year}`;
}

function invoiceUrl(id: string) {
    return `${API}/${encodeURIComponent(id)}/invoice`;
}

const inputClass =
    "w-full rounded border border-gray-300 bg-white " +
    "px-3 py-2 text-sm text-gray-900 outline-none " +
    "focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]";

const cellClass = "px-3 py-3 align-top text-xs";

export default function WarrantyClient() {
    const [rows, setRows] = useState<Warranty[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    const [form, setForm] = useState<FormFields>(emptyForm);

    const [editingId, setEditingId] = useState<string | null>(
        null
    );

    const [showForm, setShowForm] = useState(false);

    // Invoice upload state
    const [invoiceFile, setInvoiceFile] =
        useState<File | null>(null);

    const [fileInputKey, setFileInputKey] = useState(0);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadRecords = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(API, {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to load records"
                );
            }

            setRows(data.warranties || []);
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

    function resetInvoiceInput() {
        setInvoiceFile(null);
        setFileInputKey((previous) => previous + 1);
    }

    function addRecord() {
        setForm(emptyForm());
        setEditingId(null);
        resetInvoiceInput();

        setShowForm(true);
        setMessage("");
        setError("");

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
            name: row.name,
            designation: row.designation,
            dept: row.dept,
            number_desk_location:
                row.number_desk_location,
            invoice_no: row.invoice_no,
            supplier_no: row.supplier_no,
            invoice_scan_copy: row.invoice_scan_copy,
            start_date: row.start_date,
            end_date: row.end_date,
        });

        resetInvoiceInput();

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
        resetInvoiceInput();
        setError("");
    }

    function handleInvoiceChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0] || null;

        if (!file) {
            setInvoiceFile(null);
            return;
        }

        const extension = file.name
            .slice(file.name.lastIndexOf("."))
            .toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setError(
                "Only PDF, JPG, and JPEG files are allowed."
            );

            resetInvoiceInput();
            return;
        }

        if (file.size === 0) {
            setError("The selected file is empty.");
            resetInvoiceInput();
            return;
        }

        if (file.size > MAX_INVOICE_SIZE) {
            setError(
                "Invoice file size must not exceed 10 MB."
            );

            resetInvoiceInput();
            return;
        }

        setInvoiceFile(file);
        setError("");
    }

    async function uploadInvoice(
        warrantyId: string,
        file: File
    ) {
        const formData = new FormData();

        formData.append("invoice", file);

        const response = await fetch(
            invoiceUrl(warrantyId),
            {
                method: "POST",
                body: formData,
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Invoice upload failed."
            );
        }

        return result;
    }

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
                "End Date cannot be before Start Date."
            );
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        let savedId: string | null = null;

        try {
            // Step 1: Save warranty information.
            // The API will generate an ID for new records.
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
                    "Unable to save warranty record."
                );
            }

            savedId = editingId || String(result.id || "");

            if (!savedId) {
                throw new Error(
                    "Warranty saved, but the record ID was not returned."
                );
            }

            // If a new warranty was created, keep its ID.
            // This prevents creating duplicate records if
            // invoice upload subsequently fails.
            setEditingId(savedId);

            // Step 2: Upload invoice, if selected.
            if (invoiceFile) {
                try {
                    await uploadInvoice(savedId, invoiceFile);
                } catch (uploadError) {
                    const uploadMessage =
                        uploadError instanceof Error
                            ? uploadError.message
                            : "Invoice upload failed.";

                    setError(
                        "Warranty record saved successfully, " +
                        "but the invoice was not uploaded. " +
                        uploadMessage +
                        " Select the invoice and save again."
                    );

                    await loadRecords();
                    return;
                }
            }

            // Step 3: Everything saved successfully.
            setShowForm(false);
            setEditingId(null);
            resetInvoiceInput();

            setMessage(
                invoiceFile
                    ? "Warranty record and invoice saved successfully."
                    : "Warranty record saved successfully."
            );

            await loadRecords();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save warranty record."
            );
        } finally {
            setSaving(false);
        }
    }

    const filtered = rows.filter((row) => {
        const matchesFilter =
            filter === "ALL" ||
            row.warranty_status === filter;

        const searchable = [
            row.product_id,
            row.product_name,
            row.serial,
            row.id,
            row.name,
            row.designation,
            row.dept,
            row.number_desk_location,
            row.invoice_no,
            row.supplier_no,
            row.entry_by,
        ]
            .join(" ")
            .toLowerCase();

        return (
            matchesFilter &&
            searchable.includes(
                search.trim().toLowerCase()
            )
        );
    });

    const active = rows.filter(
        (row) => row.warranty_status === "ACTIVE"
    ).length;

    const expiring = rows.filter(
        (row) =>
            row.warranty_status === "EXPIRING_SOON"
    ).length;

    const expired = rows.filter(
        (row) => row.warranty_status === "EXPIRED"
    ).length;

    // ID remains immediately before Name.
    const columns = [
        "Product ID",
        "Product Name",
        "Serial",
        "ID",
        "Name",
        "Designation",
        "Dept",
        "Number / Desk Location",
        "Invoice No",
        "Supplier No",
        "Invoice Scan Copy",
        "Start Date",
        "End Date",
        "Duration",
        "Entry By",
        "Action",
    ];

    return (
        <main className="min-h-screen bg-[#f4f4f4] p-3 text-gray-900 sm:p-5 lg:p-7">
            <div className="mx-auto max-w-[1800px] space-y-5">

                {/* Header */}
                <header className="flex flex-wrap items-center justify-between gap-4 rounded border-b-[3px] border-[#d4af37] bg-[#111111] p-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                            IT Warranty & Asset Register
                        </h1>

                        <p className="mt-1 text-sm text-gray-300">
                            Equipment Warranty & Employee Records
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={addRecord}
                        disabled={saving}
                        className="rounded bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                    >
                        + Add Warranty
                    </button>
                </header>

                {/* KPI Summary */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {[
                        ["Total Records", rows.length],
                        ["Active", active],
                        ["Expiring in 30 Days", expiring],
                        ["Expired", expired],
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

                {/* Search and Filter */}
                <div className="flex flex-wrap gap-3 rounded border border-gray-200 bg-white p-4">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search product, serial, employee, invoice..."
                        className={`${inputClass} min-w-0 flex-1 sm:min-w-[250px]`}
                    />

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(event.target.value)
                        }
                        className={`${inputClass} sm:w-52`}
                        aria-label="Warranty filter"
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
                        disabled={loading || saving}
                        className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                    >
                        Refresh
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                {/* Success */}
                {message && (
                    <div
                        role="status"
                        className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                    >
                        {message}
                    </div>
                )}

                {/* Add / Edit Form */}
                {showForm && (
                    <section className="rounded border border-gray-200 bg-white p-5 shadow-sm">

                        <div className="mb-5 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold">
                                {editingId
                                    ? "Edit Warranty Record"
                                    : "Add Warranty Record"}
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
                            {/* Original Warranty Fields */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {fields.map((field) => (
                                    <div key={field.key}>
                                        <label
                                            htmlFor={field.key}
                                            className="mb-1 block text-xs font-semibold text-gray-700"
                                        >
                                            {field.label}
                                            {field.required
                                                ? " *"
                                                : ""}
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
                                                field.type ===
                                                    "date"
                                                    ? undefined
                                                    : field.key ===
                                                        "number_desk_location"
                                                        ? 1000
                                                        : field.key ===
                                                            "product_id"
                                                            ? 100
                                                            : field.key ===
                                                                "invoice_no" ||
                                                                field.key ===
                                                                "supplier_no"
                                                                ? 150
                                                                : 200
                                            }
                                            value={
                                                form[field.key]
                                            }
                                            onChange={(event) =>
                                                setForm(
                                                    (previous) => ({
                                                        ...previous,
                                                        [field.key]:
                                                            event.target.value,
                                                    })
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Invoice Upload */}
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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
                                    disabled={saving}
                                    onChange={handleInvoiceChange}
                                    className="block w-full rounded border border-gray-300 bg-white p-3 text-sm text-gray-900 file:mr-4 file:rounded file:border-0 file:bg-[#d4af37] file:px-4 file:py-2 file:font-bold file:text-black hover:file:bg-[#b99625] disabled:opacity-50"
                                />

                                <p className="mt-2 text-xs text-gray-600">
                                    Accepted formats: PDF, JPG,
                                    JPEG. Maximum file size: 10 MB.
                                </p>

                                {invoiceFile && (
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-[#d4af37] bg-amber-50 p-3">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900">
                                                Selected Invoice
                                            </p>

                                            <p className="break-all text-xs text-gray-700">
                                                {invoiceFile.name}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-600">
                                                {(
                                                    invoiceFile.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{" "}
                                                MB
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={
                                                resetInvoiceInput
                                            }
                                            disabled={saving}
                                            className="rounded border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                        >
                                            Remove Selection
                                        </button>
                                    </div>
                                )}

                                {editingId &&
                                    form.invoice_scan_copy && (
                                        <div className="mt-3 rounded border border-green-200 bg-green-50 p-3">
                                            <p className="mb-2 text-xs font-semibold text-green-800">
                                                Existing Invoice
                                            </p>

                                            <a
                                                href={invoiceUrl(
                                                    editingId
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block rounded bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
                                            >
                                                View Invoice
                                            </a>

                                            <p className="mt-2 text-xs text-gray-600">
                                                Select another file
                                                and click Save to
                                                replace the invoice.
                                            </p>
                                        </div>
                                    )}

                                {!editingId && (
                                    <p className="mt-3 text-xs text-gray-600">
                                        When you click Save
                                        Warranty, the record will
                                        be created first and the
                                        selected invoice will be
                                        uploaded automatically.
                                    </p>
                                )}
                            </div>

                            {/* Record Details */}
                            {editingId && (
                                <p className="text-xs text-gray-600">
                                    Record ID: {editingId}
                                    {" — "}
                                    automatically generated.
                                </p>
                            )}

                            <p className="text-xs text-gray-500">
                                Duration and Entry By are
                                calculated automatically.
                            </p>

                            {/* Form Buttons */}
                            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4">
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
                                        ? invoiceFile
                                            ? "Saving & Uploading..."
                                            : "Saving..."
                                        : editingId
                                            ? "Update Warranty"
                                            : "Save Warranty"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {/* Warranty Table */}
                <section className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">

                    <div className="flex items-center justify-between border-b border-gray-200 p-4">
                        <h2 className="font-bold">
                            Warranty Records
                        </h2>

                        <p className="text-xs text-gray-600">
                            {filtered.length} records
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1550px] border-collapse text-left">
                            <thead className="bg-[#111111] text-white">
                                <tr>
                                    {columns.map((column) => (
                                        <th
                                            key={column}
                                            scope="col"
                                            className="border-r border-gray-700 px-3 py-3 text-xs font-semibold"
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
                                            colSpan={16}
                                            className="p-8 text-center text-sm"
                                        >
                                            Loading warranty records...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={16}
                                            className="p-8 text-center text-sm text-gray-500"
                                        >
                                            No warranty records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-200 hover:bg-amber-50"
                                        >
                                            <td className={cellClass}>
                                                {row.product_id}
                                            </td>

                                            <td className={cellClass}>
                                                {row.product_name}
                                            </td>

                                            <td className={cellClass}>
                                                {row.serial || "—"}
                                            </td>

                                            {/* ID Before Name */}
                                            <td
                                                className={`${cellClass} font-bold`}
                                            >
                                                {row.id}
                                            </td>

                                            <td className={cellClass}>
                                                {row.name || "—"}
                                            </td>

                                            <td className={cellClass}>
                                                {row.designation || "—"}
                                            </td>

                                            <td className={cellClass}>
                                                {row.dept || "—"}
                                            </td>

                                            <td className={cellClass}>
                                                {row.number_desk_location ||
                                                    "—"}
                                            </td>

                                            <td className={cellClass}>
                                                {row.invoice_no || "—"}
                                            </td>

                                            <td className={cellClass}>
                                                {row.supplier_no || "—"}
                                            </td>

                                            {/* Invoice View */}
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

                                            <td className={cellClass}>
                                                {row.duration_days === null
                                                    ? "—"
                                                    : `${row.duration_days} Days`}
                                            </td>

                                            <td className={cellClass}>
                                                {row.entry_by || "—"}
                                            </td>

                                            <td className={cellClass}>
                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() =>
                                                        editRecord(row)
                                                    }
                                                    className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
                                                >
                                                    Edit
                                                </button>
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
