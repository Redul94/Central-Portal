
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

type Movement = "LEFT" | "NEW_JOIN";

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
    staff_title: string | null;
    employee_id: string | null;
    full_name: string;
    designation: string | null;
    department: string | null;
    is_active: boolean;
    can_receive_tickets: boolean;
    account_status: string;
};

type TextKey =
    | "section_name"
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

type DeviceKey =
    | "desktop_set"
    | "laptop"
    | "aio";

// ============================================
// API
// ============================================

const API = "/api/admin/left-user";

// Reuse the existing IT Support Task API.
// It already supplies the support staff list.
const SUPPORT_STAFF_API =
    "/api/admin/support/staff";

// ============================================
// STYLES
// ============================================

const inputClass =
    "w-full rounded border border-gray-300 " +
    "bg-white px-3 py-2 text-center text-sm " +
    "text-gray-900 outline-none " +
    "focus:border-[#d4af37] " +
    "focus:ring-1 focus:ring-[#d4af37]";

const labelClass =
    "mb-1 block text-xs font-semibold " +
    "text-center text-gray-700";

const thClass =
    "border border-gray-600 px-3 py-3 " +
    "text-center align-middle text-xs " +
    "font-bold whitespace-normal";

const tdClass =
    "border border-gray-300 px-3 py-3 " +
    "text-center align-middle text-xs " +
    "text-gray-900 whitespace-pre-wrap break-words";

// ============================================
// FORM FIELD CONFIGURATION
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

const STATUS_FIELDS: {
    key: StatusKey;
    label: string;
    options: string[];
}[] = [
        {
            key: "computer_management_status",
            label: "Computer Management Status",
            options: [
                "",
                "Done",
                "Pending",
                "Not Required",
            ],
        },
        {
            key: "data_backup_status",
            label: "Data Backup Status",
            options: [
                "",
                "Done",
                "Pending",
                "Not Required",
            ],
        },
        {
            key: "sim_handover_status",
            label: "SIM Handover / Receive Status",
            options: [
                "",
                "Done",
                "Pending",
                "Not Required",
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
// DEVICE CONFIGURATION
// ============================================

const DEVICE_TYPES: {
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

// 01 to 20 per device category
const DEVICE_OPTIONS = DEVICE_TYPES.flatMap(
    (device) =>
        Array.from(
            { length: 20 },
            (_, index) => {
                const quantity = index + 1;

                return {
                    value:
                        `${device.key}:${quantity}`,
                    label:
                        `${device.label} ` +
                        String(quantity).padStart(2, "0"),
                };
            }
        )
);

// ============================================
// TABLE HEADINGS - REQUIRED ORDER
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
    "Device",
    "Computer Management Status",
    "Data Backup Status",
    "SIM Handover / Receive Status",
    "E-mail Management",
    "WhatsApp Management",
    "Pending Requirements (If Any)",
    "Service Ensured By",
    "Remarks",
    "Action",
];

// ============================================
// HELPERS
// ============================================

function localDate() {
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
        join_left_date: localDate(),
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

function readableDate(value: string) {
    if (!value) return "—";

    const [year, month, day] = value.split("-");

    if (!year || !month || !day) {
        return value;
    }

    return `${day}-${month}-${year}`;
}

function deviceLabel(
    row: Pick<
        LeftUserForm,
        "desktop_set" | "laptop" | "aio"
    >
): string {
    return [
        Number(row.desktop_set) > 0 ? "Desktop Set" : "",
        Number(row.laptop) > 0 ? "Laptop" : "",
        Number(row.aio) > 0 ? "All in One (AIO)" : "",
    ]
        .filter(Boolean)
        .join(", ") || "—";
}

// Determine the dropdown selection for an
// existing database record.
function getDeviceSelection(
    row: Pick<
        LeftUserRecord,
        "desktop_set" | "laptop" | "aio"
    >
): string {
    const quantities = [
        {
            key: "desktop_set",
            quantity: Number(row.desktop_set),
        },
        {
            key: "laptop",
            quantity: Number(row.laptop),
        },
        {
            key: "aio",
            quantity: Number(row.aio),
        },
    ].filter(
        (device) => device.quantity > 0
    );

    if (quantities.length === 0) {
        return "none";
    }

    if (quantities.length > 1) {
        return "existing";
    }

    const selected = quantities[0];

    const value =
        `${selected.key}:${selected.quantity}`;

    const supported = DEVICE_OPTIONS.some(
        (option) => option.value === value
    );

    return supported ? value : "existing";
}

function formatStaffName(staff: SupportStaff) {
    const title =
        staff.staff_title ||
        staff.designation ||
        "";

    return [
        staff.employee_id,
        staff.full_name,
        title,
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

    // Default: LEFT
    const [filter, setFilter] =
        useState<"ALL" | Movement>("LEFT");

    const [search, setSearch] = useState("");

    const [form, setForm] =
        useState<LeftUserForm>(blankForm);

    const [deviceSelection, setDeviceSelection] =
        useState("none");

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);

    const [scrollKey, setScrollKey] = useState(0);

    const formRef = useRef<HTMLElement | null>(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [staffError, setStaffError] = useState("");

    function toggleDevice(
        type: "desktop_set" | "laptop" | "aio",
        checked: boolean
    ) {
        setForm((previous) => ({
            ...previous,
            [type]: checked
                ? Math.max(Number(previous[type]) || 0, 1)
                : 0,
        }));
    }

    // ========================================
    // LOAD LEFT USER RECORDS
    // ========================================

    const reload = useCallback(async () => {
        setLoading(true);

        try {
            const response = await fetch(
                API,
                { cache: "no-store" }
            );

            const result = await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to load Left User records"
                );
            }

            setRecords(
                Array.isArray(result.records)
                    ? result.records
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
    // LOAD EXISTING IT SUPPORT STAFF
    // ========================================

    const loadSupportStaff = useCallback(
        async () => {
            setStaffLoading(true);
            setStaffError("");

            try {
                const response = await fetch(
                    SUPPORT_STAFF_API,
                    {
                        cache: "no-store",
                    }
                );

                const result =
                    await readJson(response);

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        result.error ||
                        "Unable to load IT Support Staff"
                    );
                }

                // This is the SAME staff array
                // used by Create IT Support Task.
                const staff: SupportStaff[] =
                    Array.isArray(result.staff)
                        ? result.staff
                        : [];

                const activeStaff = staff.filter(
                    (member) =>
                        member.is_active === true &&
                        member.account_status === "ACTIVE"
                );

                setSupportStaff(activeStaff);
            } catch (err) {
                console.error(
                    "IT Support Staff loading error:",
                    err
                );

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
    // AUTO SCROLL TO FORM
    // ========================================

    useEffect(() => {
        if (scrollKey > 0 && showForm) {
            formRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [scrollKey, showForm]);

    // ========================================
    // NEW RECORD
    // ========================================

    function openNew() {
        setEditingId(null);

        setForm(blankForm());

        setDeviceSelection("none");

        setError("");
        setMessage("");

        setShowForm(true);

        setScrollKey(
            (current) => current + 1
        );
    }

    // ========================================
    // EDIT RECORD
    // ========================================

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

        setDeviceSelection(
            getDeviceSelection(row)
        );

        setError("");
        setMessage("");

        setShowForm(true);

        setScrollKey(
            (current) => current + 1
        );
    }

    // ========================================
    // CLOSE FORM
    // ========================================

    function closeForm() {
        if (busy) return;

        setShowForm(false);
        setEditingId(null);
        setError("");
    }

    // ========================================
    // UPDATE FORM FIELD
    // ========================================

    function update(
        key: keyof LeftUserForm,
        value: string | number
    ) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    // ========================================
    // DEVICE DROPDOWN UPDATE
    // ========================================

    function updateDevice(value: string) {
        setDeviceSelection(value);

        // Preserve existing multi-device records
        // until the user selects a new device.
        if (value === "existing") {
            return;
        }

        const newDevices = {
            desktop_set: 0,
            laptop: 0,
            aio: 0,
        };

        if (value !== "none") {
            const [type, count] =
                value.split(":");

            const quantity = Number(count);

            if (
                Number.isSafeInteger(quantity) &&
                quantity >= 1 &&
                quantity <= 20
            ) {
                if (type === "desktop_set") {
                    newDevices.desktop_set = quantity;
                }

                if (type === "laptop") {
                    newDevices.laptop = quantity;
                }

                if (type === "aio") {
                    newDevices.aio = quantity;
                }
            }
        }

        setForm((previous) => ({
            ...previous,
            ...newDevices,
        }));
    }

    // ========================================
    // SAVE RECORD
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
            const response = await fetch(
                API,
                {
                    method:
                        editing ? "PATCH" : "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        ...form,
                        ...(editingId
                            ? { id: editingId }
                            : {}),
                    }),
                }
            );

            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to save record"
                );
            }

            setShowForm(false);
            setEditingId(null);

            await reload();

            setMessage(
                editing
                    ? "User record updated successfully."
                    : "User record created successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save record"
            );
        } finally {
            setBusy(false);
        }
    }

    // ========================================
    // DELETE RECORD
    // ========================================

    async function remove(
        row: LeftUserRecord
    ) {
        const confirmed = window.confirm(
            `Permanently delete this record?\n\n` +
            `User: ${row.user_name}\n` +
            `Type: ${row.movement_type}\n\n` +
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

            const result =
                await readJson(response);

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to delete record"
                );
            }

            if (editingId === row.id) {
                setShowForm(false);
                setEditingId(null);
            }

            await reload();

            setMessage(
                "User record deleted successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete record"
            );
        } finally {
            setDeletingId(null);
        }
    }

    // ========================================
    // SEARCH AND FILTER
    // ========================================

    const filtered = records.filter((row) => {
        const typeMatch =
            filter === "ALL" ||
            row.movement_type === filter;

        const searchable = [
            row.user_name,
            row.designation,
            row.department,
            row.mobile_no,
            row.user_location,
            row.section_name,
            row.service_ensured_by,
            row.pending_requirements,
            row.remarks,
            deviceLabel(row),
        ]
            .join(" ")
            .toLowerCase();

        return (
            typeMatch &&
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
    // TABLE ROW DATA - EXACT COLUMN ORDER
    // ========================================

    function rowValues(row: LeftUserRecord) {
        return [
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
            row.remarks,
        ];
    }

    // ========================================
    // PAGE
    // ========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4] p-3 text-gray-900 sm:p-5 lg:p-7">
            <div className="mx-auto max-w-[1800px] space-y-5">

                {/* HEADER */}
                <header className="flex flex-wrap items-center justify-between gap-3 rounded border-b-[3px] border-[#d4af37] bg-[#111111] p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-white">
                            Left User Management
                        </h1>

                        <p className="mt-1 text-sm text-gray-300">
                            ATG Left &amp; New Join User Information
                            (Factory)
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openNew}
                        disabled={
                            busy ||
                            deletingId !== null
                        }
                        className="rounded bg-[#d4af37] px-4 py-2 text-sm font-bold text-black hover:bg-[#b99625] disabled:opacity-50"
                    >
                        + Add User Record
                    </button>
                </header>

                {/* SUMMARY CARDS */}
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

                            <p className="mt-1 text-2xl font-bold text-gray-900">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* SEARCH AND FILTER */}
                <section className="flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-4">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search user, department, device, engineer..."
                        className={`${inputClass} min-w-0 flex-1 sm:min-w-[250px]`}
                    />

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(
                                event.target.value as
                                "ALL" | Movement
                            )
                        }
                        className={`${inputClass} sm:w-48`}
                        aria-label="Filter user type"
                    >
                        <option value="LEFT">
                            Left Users
                        </option>

                        <option value="NEW_JOIN">
                            New Joiners
                        </option>

                        <option value="ALL">
                            All Users
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
                </section>

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
                    <section
                        ref={formRef}
                        className="scroll-mt-24 rounded border border-gray-200 bg-white p-5 shadow-sm"
                    >
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold">
                                {editingId
                                    ? "Edit User Record"
                                    : "Add User Record"}
                            </h2>

                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={busy}
                                className="text-sm font-semibold text-gray-600 disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>

                        <form
                            onSubmit={save}
                            className="space-y-5"
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

                                {/* USER NAME / DESIGNATION / DEPARTMENT ETC. */}
                                {TEXT_FIELDS.filter(
                                    (field) =>
                                        !field.textarea
                                ).map((field) => (
                                    <div key={field.key}>
                                        <label
                                            htmlFor={field.key}
                                            className={labelClass}
                                        >
                                            {field.label}
                                            {field.required
                                                ? " *"
                                                : ""}
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
                                                update(
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

                                {/* JOIN / LEFT DATE */}
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
                                            update(
                                                "join_left_date",
                                                event.target.value
                                            )
                                        }
                                        disabled={busy}
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                {/* MOVEMENT TYPE */}
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
                                            update(
                                                "movement_type",
                                                event.target.value
                                            )
                                        }
                                        disabled={busy}
                                        required
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


                                {/* DEVICE - MULTI SELECT */}
                                <div>
                                    <label className={labelClass}>
                                        Device
                                    </label>

                                    <details className="relative">
                                        <summary className="w-full cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-900 focus:border-[#d4af37]">
                                            {[
                                                form.desktop_set > 0 ? "Desktop Set" : "",
                                                form.laptop > 0 ? "Laptop" : "",
                                                form.aio > 0 ? "All in One (AIO)" : "",
                                            ]
                                                .filter(Boolean)
                                                .join(", ") || "Select Device"}
                                        </summary>

                                        <div className="absolute left-0 right-0 z-20 mt-1 rounded border border-gray-300 bg-white p-3 shadow-lg">
                                            {(
                                                [
                                                    ["desktop_set", "Desktop Set"],
                                                    ["laptop", "Laptop"],
                                                    ["aio", "All in One (AIO)"],
                                                ] as const
                                            ).map(([type, label]) => (
                                                <label
                                                    key={type}
                                                    className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm text-gray-900 hover:bg-amber-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form[type] > 0}
                                                        onChange={(event) =>
                                                            toggleDevice(
                                                                type,
                                                                event.target.checked
                                                            )
                                                        }
                                                        disabled={busy}
                                                        className="h-4 w-4 accent-[#d4af37]"
                                                    />

                                                    <span>{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </details>
                                </div>


                                {/* IT CLEARANCE STATUS FIELDS */}
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
                                                update(
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
                                                    <option
                                                        value={form[field.key]}
                                                    >
                                                        {form[field.key]}
                                                        {" (Existing)"}
                                                    </option>
                                                )}

                                            {field.options.map(
                                                (option) => (
                                                    <option
                                                        key={
                                                            option ||
                                                            "empty"
                                                        }
                                                        value={option}
                                                    >
                                                        {option ||
                                                            "Select Status"}
                                                    </option>
                                                )
                                            )}
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
                                            update(
                                                "service_ensured_by",
                                                event.target.value
                                            )
                                        }
                                        disabled={busy}
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {staffLoading
                                                ? "Loading Support Engineers..."
                                                : "Select IT Support Engineer"}
                                        </option>

                                        {/* Preserve saved historical engineer */}
                                        {form.service_ensured_by &&
                                            !supportStaff.some(
                                                (member) =>
                                                    member.full_name ===
                                                    form.service_ensured_by
                                            ) && (
                                                <option
                                                    value={form.service_ensured_by}
                                                >
                                                    {form.service_ensured_by}
                                                    {" (Previously Assigned)"}
                                                </option>
                                            )}

                                        {/* Existing IT Support Staff */}
                                        {supportStaff.map(
                                            (member) => (
                                                <option
                                                    key={member.portal_user_id}
                                                    value={member.full_name}
                                                >
                                                    {formatStaffName(member)}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {staffError && (
                                        <p className="mt-2 text-center text-xs text-red-700">
                                            {staffError}
                                        </p>
                                    )}
                                </div>

                                {/* PENDING REQUIREMENTS AND REMARKS */}
                                {TEXT_FIELDS.filter(
                                    (field) =>
                                        field.textarea
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
                                                update(
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

                            {/* FORM ACTIONS */}
                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={busy}
                                    className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
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

                {/* USER RECORDS TABLE */}
                <section className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b p-4">
                        <h2 className="font-bold">
                            ATG User Information (Factory)
                        </h2>

                        <span className="text-xs text-gray-600">
                            {filtered.length} records
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[2100px] border-collapse">

                            {/* ALL HEADINGS CENTER ALIGNED */}
                            <thead className="bg-[#111111] text-white">
                                <tr>
                                    {TABLE_HEADERS.map(
                                        (heading) => (
                                            <th
                                                key={heading}
                                                scope="col"
                                                className={thClass}
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
                                            colSpan={TABLE_HEADERS.length}
                                            className="p-8 text-center text-sm"
                                        >
                                            Loading Left User records...
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
                                    filtered.map(
                                        (row, index) => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-amber-50"
                                            >
                                                {/* SL NO */}
                                                <td
                                                    className={
                                                        tdClass +
                                                        " bg-sky-50 font-semibold"
                                                    }
                                                >
                                                    {index + 1}
                                                </td>

                                                {/* REQUIRED ORDERED DATA */}
                                                {rowValues(row).map(
                                                    (value, column) => (
                                                        <td
                                                            key={column}
                                                            className={
                                                                tdClass +
                                                                (
                                                                    column === 7
                                                                        ? " bg-rose-50"
                                                                        : ""
                                                                )
                                                            }
                                                        >
                                                            {column === 6 ? (
                                                                <span
                                                                    className={
                                                                        row.movement_type ===
                                                                            "LEFT"
                                                                            ? "rounded bg-rose-100 px-2 py-1 font-semibold text-rose-800"
                                                                            : "rounded bg-green-100 px-2 py-1 font-semibold text-green-800"
                                                                    }
                                                                >
                                                                    {value}
                                                                </span>
                                                            ) : (
                                                                value ||
                                                                "—"
                                                            )}
                                                        </td>
                                                    )
                                                )}

                                                {/* ACTION */}
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
                                                            className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
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
                                                            className="font-semibold text-red-700 hover:underline disabled:opacity-50"
                                                        >
                                                            {deletingId === row.id
                                                                ? "Deleting..."
                                                                : "Delete"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* FOOTER */}
                <p className="text-center text-xs text-gray-500">
                    Auko-Tex Group — IT Department |
                    Left &amp; New Join User Management
                </p>
            </div>
        </main>
    );
}
