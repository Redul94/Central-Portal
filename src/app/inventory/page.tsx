"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
    useEffect,
    useState,
} from "react";

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
    mobile_no: string | null;
    user_location: string | null;
    category: string | null;
    user_training_status: string | null;
    service_ensured_by: string | null;
    it_concern: string | null;
    acknowledge_to_concern_department: string | null;
    computer_schedule_maintenance: string | null;
    ups_battery_replacement_date: string | null;
    data_backup_method: string | null;
    concern_it_engineer: string | null;
    remarks: string | null;
};

type Asset = {
    assignment_id: number;
    assigned_at: string;
    is_primary_computer: boolean;
    assignment_remarks: string | null;

    asset_id: number;
    asset_code: string;

    brand: string | null;
    model: string | null;
    serial_number: string | null;

    processor: string | null;
    ram_version: string | null;
    storage_info: string | null;

    windows_version: string | null;
    office_version: string | null;
    ad_or_workgroup: string | null;
    email_365: string | null;
    endpoint_security: string | null;

    computer_maintenance_status: string | null;
    data_backup_status: string | null;
    pending_work_support: string | null;

    cable_dressing: string | null;
    wooden_tray: string | null;
    device_requirements: string | null;

    purchase_date: string | null;
    warranty_start: string | null;
    warranty_end: string | null;

    asset_status: string;
    asset_remarks: string | null;

    category_code: string;
    category_name: string;

    last_ticket_no: string | null;
    last_support_subject: string | null;
    last_problem: string | null;
    last_resolution: string | null;
    last_support_date: string | null;
    last_worked_by: string | null;
};

type HistoryRecord = {
    assignment_id: number;
    assigned_at: string;
    returned_at: string | null;

    assignment_status:
        | "ACTIVE"
        | "RETURNED"
        | "TRANSFERRED";

    is_primary_computer: boolean;
    remarks: string | null;

    asset_id: number;
    asset_code: string;

    brand: string | null;
    model: string | null;
    serial_number: string | null;

    category_name: string;
};

type ApiResponse = {
    success: boolean;
    message?: string;

    linked: boolean;

    portalUser: PortalUser;

    inventoryUser:
        | InventoryUser
        | null;

    assets: Asset[];

    history: HistoryRecord[];
};

// ==========================================
// DATE
// ==========================================

function prettyDate(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return "—";
    }

    const dateOnly =
        String(value).slice(
            0,
            10
        );

    const date =
        new Date(
            `${dateOnly}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return dateOnly;
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}

// ==========================================
// STATUS STYLE
// ==========================================

function historyStatusStyle(
    status: string
) {
    switch (status) {
        case "ACTIVE":
            return "border-green-300 bg-green-50 text-green-700";

        case "RETURNED":
            return "border-blue-300 bg-blue-50 text-blue-700";

        case "TRANSFERRED":
            return "border-orange-300 bg-orange-50 text-orange-700";

        default:
            return "border-gray-300 bg-gray-100 text-gray-700";
    }
}

// ==========================================
// PAGE
// ==========================================

export default function InventoryPage() {
    const router =
        useRouter();

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
        error,
        setError,
    ] =
        useState("");

    // ==========================================
    // LOAD
    // ==========================================

    useEffect(() => {
        async function loadInventory() {
            try {
                const response =
                    await fetch(
                        "/api/inventory/my-assets",
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
                    setError(
                        result.message ||
                        "Unable to load your inventory."
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

                setError(
                    "Unable to connect to server."
                );

            } finally {
                setLoading(
                    false
                );
            }
        }

        loadInventory();

    }, [
        router,
    ]);

    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">

                <div className="border border-gray-200 bg-white px-10 py-8 text-center shadow-sm">

                    <p className="font-semibold text-gray-700">
                        Loading your IT inventory...
                    </p>

                </div>

            </main>
        );
    }

    // ==========================================
    // ERROR
    // ==========================================

    if (
        error ||
        !data
    ) {
        return (
            <main className="min-h-screen bg-[#f4f4f4] p-6">

                <div className="mx-auto max-w-3xl border border-red-300 bg-red-50 p-6">

                    <h1 className="text-xl font-bold text-red-700">
                        IT Inventory
                    </h1>

                    <p className="mt-3 text-red-700">
                        {error ||
                            "Unable to load inventory."}
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

    const portalUser =
        data.portalUser;

    const inventoryUser =
        data.inventoryUser;

    // ==========================================
    // PAGE
    // ==========================================

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-6 py-5">

                    <div>

                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-2xl font-bold">
                            My IT Inventory
                        </h1>

                    </div>

                    <div className="text-right">

                        <p className="font-semibold">
                            {portalUser.full_name}
                        </p>

                        <p className="text-xs text-gray-400">
                            {portalUser.employee_id ||
                                "No Employee ID"}
                            {" • "}
                            {portalUser.department ||
                                "Department Not Set"}
                        </p>

                    </div>

                </div>

            </header>

            {/* CONTENT */}

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                {/* TOP */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            My Assigned Devices
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            View IT devices currently assigned to you,
                            device information and service history.
                        </p>

                    </div>

                    <Link
                        href="/"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        ← Back to Home
                    </Link>

                </div>

                {/* ================================= */}
                {/* NOT LINKED                        */}
                {/* ================================= */}

                {!data.linked && (

                    <section className="border border-orange-300 bg-orange-50 p-6">

                        <h3 className="text-lg font-bold text-orange-800">
                            Inventory Profile Not Linked
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-orange-700">
                            Your portal account has not yet been linked
                            with an IT Inventory profile. Please contact
                            the IT Department to complete the inventory
                            account linking process.
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                            <div>

                                <p className="text-xs font-semibold uppercase text-orange-600">
                                    Employee ID
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                    {portalUser.employee_id ||
                                        "—"}
                                </p>

                            </div>

                            <div>

                                <p className="text-xs font-semibold uppercase text-orange-600">
                                    Name
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                    {portalUser.full_name}
                                </p>

                            </div>

                            <div>

                                <p className="text-xs font-semibold uppercase text-orange-600">
                                    Designation
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                    {portalUser.designation ||
                                        "—"}
                                </p>

                            </div>

                            <div>

                                <p className="text-xs font-semibold uppercase text-orange-600">
                                    Department
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                    {portalUser.department ||
                                        "—"}
                                </p>

                            </div>

                        </div>

                    </section>

                )}

                {/* ================================= */}
                {/* LINKED                            */}
                {/* ================================= */}

                {data.linked &&
                    inventoryUser && (

                    <>
                        {/* PROFILE */}

                        <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                            <div className="flex flex-wrap items-start justify-between gap-4">

                                <div>

                                    <h3 className="text-lg font-bold text-gray-900">
                                        Employee Information
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Inventory profile linked with your portal account.
                                    </p>

                                </div>

                                <span className="border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                    LINKED
                                </span>

                            </div>

                            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                                <Info
                                    label="Employee ID"
                                    value={
                                        inventoryUser.employee_id
                                    }
                                />

                                <Info
                                    label="User Name"
                                    value={
                                        inventoryUser.full_name
                                    }
                                />

                                <Info
                                    label="Designation"
                                    value={
                                        inventoryUser.designation
                                    }
                                />

                                <Info
                                    label="Department"
                                    value={
                                        inventoryUser.department
                                    }
                                />

                                <Info
                                    label="Mobile"
                                    value={
                                        inventoryUser.mobile_no
                                    }
                                />

                                <Info
                                    label="Location"
                                    value={
                                        inventoryUser.user_location
                                    }
                                />

                                <Info
                                    label="IT Concern"
                                    value={
                                        inventoryUser.it_concern
                                    }
                                />

                                <Info
                                    label="Concern IT Engineer"
                                    value={
                                        inventoryUser.concern_it_engineer
                                    }
                                />

                            </div>

                        </section>

                        {/* KPI */}

                        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                            <Kpi
                                label="Assigned Devices"
                                value={
                                    data.assets.length
                                }
                            />

                            <Kpi
                                label="Primary Computer"
                                value={
                                    data.assets.filter(
                                        (
                                            asset
                                        ) =>
                                            asset.is_primary_computer
                                    ).length
                                }
                            />

                            <Kpi
                                label="Assignment History"
                                value={
                                    data.history.length
                                }
                            />

                            <Kpi
                                label="Pending Support"
                                value={
                                    data.assets.filter(
                                        (
                                            asset
                                        ) =>
                                            Boolean(
                                                asset.pending_work_support
                                            )
                                    ).length
                                }
                            />

                        </div>

                        {/* ================================= */}
                        {/* CURRENT ASSETS                    */}
                        {/* ================================= */}

                        <section className="mb-8">

                            <div className="mb-4">

                                <h3 className="text-lg font-bold text-gray-900">
                                    Currently Assigned Devices
                                </h3>

                            </div>

                            {data.assets.length ===
                            0 ? (

                                <div className="border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
                                    No IT devices are currently assigned to you.
                                </div>

                            ) : (

                                <div className="grid gap-5 xl:grid-cols-2">

                                    {data.assets.map(
                                        (
                                            asset
                                        ) => (

                                            <AssetCard
                                                key={
                                                    asset.assignment_id
                                                }
                                                asset={
                                                    asset
                                                }
                                            />

                                        )
                                    )}

                                </div>

                            )}

                        </section>

                        {/* ================================= */}
                        {/* BACKUP / MAINTENANCE              */}
                        {/* ================================= */}

                        <section className="mb-8 border border-gray-200 bg-white p-6 shadow-sm">

                            <h3 className="text-lg font-bold text-gray-900">
                                Maintenance & Backup Information
                            </h3>

                            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                                <Info
                                    label="Data Backup Method"
                                    value={
                                        inventoryUser.data_backup_method
                                    }
                                />

                                <Info
                                    label="User Training Status"
                                    value={
                                        inventoryUser.user_training_status
                                    }
                                />

                                <Info
                                    label="Next Maintenance"
                                    value={
                                        prettyDate(
                                            inventoryUser.computer_schedule_maintenance
                                        )
                                    }
                                />

                                <Info
                                    label="UPS/Battery Replacement"
                                    value={
                                        prettyDate(
                                            inventoryUser.ups_battery_replacement_date
                                        )
                                    }
                                />

                            </div>

                        </section>

                        {/* ================================= */}
                        {/* HISTORY                           */}
                        {/* ================================= */}

                        <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                            <div className="border-b border-gray-200 px-5 py-4">

                                <h3 className="font-bold text-gray-900">
                                    My Device Assignment History
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    Previous and current devices assigned to you.
                                </p>

                            </div>

                            <div className="overflow-x-auto">

                                <table className="min-w-[1000px] w-full">

                                    <thead className="bg-[#1a1a1a] text-white">

                                        <tr>

                                            <th className="px-4 py-4 text-left text-sm">
                                                Asset ID
                                            </th>

                                            <th className="px-4 py-4 text-left text-sm">
                                                Device
                                            </th>

                                            <th className="px-4 py-4 text-left text-sm">
                                                Brand / Model
                                            </th>

                                            <th className="px-4 py-4 text-left text-sm">
                                                Assigned Date
                                            </th>

                                            <th className="px-4 py-4 text-left text-sm">
                                                Return / Transfer
                                            </th>

                                            <th className="px-4 py-4 text-center text-sm">
                                                Primary
                                            </th>

                                            <th className="px-4 py-4 text-left text-sm">
                                                Status
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {data.history.length ===
                                        0 ? (

                                            <tr>

                                                <td
                                                    colSpan={
                                                        7
                                                    }
                                                    className="px-4 py-12 text-center text-gray-500"
                                                >
                                                    No assignment history available.
                                                </td>

                                            </tr>

                                        ) : (

                                            data.history.map(
                                                (
                                                    record
                                                ) => (

                                                    <tr
                                                        key={
                                                            record.assignment_id
                                                        }
                                                        className="border-b border-gray-200 hover:bg-gray-50"
                                                    >

                                                        <td className="px-4 py-4 text-sm font-bold text-gray-900">
                                                            {record.asset_code}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {record.category_name}
                                                        </td>

                                                        <td className="px-4 py-4">

                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {record.brand ||
                                                                    "—"}
                                                            </p>

                                                            {record.model && (

                                                                <p className="mt-1 text-xs text-gray-500">
                                                                    {record.model}
                                                                </p>

                                                            )}

                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {prettyDate(
                                                                record.assigned_at
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                            {prettyDate(
                                                                record.returned_at
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 text-center">

                                                            {record.is_primary_computer ? (

                                                                <span className="border border-[#d4af37] bg-[#fff8df] px-2 py-1 text-xs font-bold">
                                                                    PRIMARY
                                                                </span>

                                                            ) : (
                                                                "—"
                                                            )}

                                                        </td>

                                                        <td className="px-4 py-4">

                                                            <span
                                                                className={`inline-block border px-3 py-1 text-xs font-bold ${historyStatusStyle(
                                                                    record.assignment_status
                                                                )}`}
                                                            >
                                                                {record.assignment_status}
                                                            </span>

                                                        </td>

                                                    </tr>

                                                )
                                            )

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </section>

                    </>

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

// ==========================================
// ASSET CARD
// ==========================================

function AssetCard({
    asset,
}: {
    asset: Asset;
}) {
    return (
        <article className="border border-gray-200 bg-white shadow-sm">

            {/* CARD HEADER */}

            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-5">

                <div>

                    <div className="flex flex-wrap items-center gap-2">

                        <h4 className="text-lg font-bold text-gray-900">
                            {asset.asset_code}
                        </h4>

                        {asset.is_primary_computer && (

                            <span className="border border-[#d4af37] bg-[#fff8df] px-2 py-1 text-xs font-bold text-gray-900">
                                PRIMARY PC
                            </span>

                        )}

                    </div>

                    <p className="mt-1 text-sm font-semibold text-[#8c731e]">
                        {asset.category_name}
                    </p>

                </div>

                <span className="border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    {asset.asset_status.replaceAll(
                        "_",
                        " "
                    )}
                </span>

            </div>

            {/* DEVICE */}

            <div className="p-5">

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                    <Info
                        label="Brand"
                        value={
                            asset.brand
                        }
                    />

                    <Info
                        label="Model"
                        value={
                            asset.model
                        }
                    />

                    <Info
                        label="Serial Number"
                        value={
                            asset.serial_number
                        }
                    />

                    <Info
                        label="Assigned Date"
                        value={
                            prettyDate(
                                asset.assigned_at
                            )
                        }
                    />

                    <Info
                        label="Warranty End"
                        value={
                            prettyDate(
                                asset.warranty_end
                            )
                        }
                    />

                    <Info
                        label="Maintenance Status"
                        value={
                            asset.computer_maintenance_status
                        }
                    />

                </div>

                {/* COMPUTER DETAILS */}

                {(asset.processor ||
                    asset.ram_version ||
                    asset.storage_info ||
                    asset.windows_version ||
                    asset.office_version) && (

                    <div className="mt-6 border-t border-gray-200 pt-5">

                        <p className="mb-4 text-sm font-bold text-gray-900">
                            System Information
                        </p>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                            <Info
                                label="Processor"
                                value={
                                    asset.processor
                                }
                            />

                            <Info
                                label="RAM"
                                value={
                                    asset.ram_version
                                }
                            />

                            <Info
                                label="Storage"
                                value={
                                    asset.storage_info
                                }
                            />

                            <Info
                                label="Windows"
                                value={
                                    asset.windows_version
                                }
                            />

                            <Info
                                label="Office"
                                value={
                                    asset.office_version
                                }
                            />

                            <Info
                                label="AD / Workgroup"
                                value={
                                    asset.ad_or_workgroup
                                }
                            />

                            <Info
                                label="Email / 365"
                                value={
                                    asset.email_365
                                }
                            />

                            <Info
                                label="Endpoint Security"
                                value={
                                    asset.endpoint_security
                                }
                            />

                            <Info
                                label="Backup Status"
                                value={
                                    asset.data_backup_status
                                }
                            />

                        </div>

                    </div>

                )}

                {/* SUPPORT */}

                <div className="mt-6 border-t border-gray-200 pt-5">

                    <p className="mb-4 text-sm font-bold text-gray-900">
                        Latest IT Support
                    </p>

                    {asset.last_ticket_no ? (

                        <div className="border-l-[3px] border-[#d4af37] bg-[#fafafa] p-4">

                            <div className="grid gap-4 sm:grid-cols-2">

                                <Info
                                    label="Ticket No."
                                    value={
                                        asset.last_ticket_no
                                    }
                                />

                                <Info
                                    label="Support Date"
                                    value={
                                        prettyDate(
                                            asset.last_support_date
                                        )
                                    }
                                />

                                <Info
                                    label="Worked By"
                                    value={
                                        asset.last_worked_by
                                    }
                                />

                                <Info
                                    label="Subject"
                                    value={
                                        asset.last_support_subject
                                    }
                                />

                            </div>

                            {asset.last_problem && (

                                <div className="mt-4">

                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Problem
                                    </p>

                                    <p className="mt-1 text-sm text-gray-700">
                                        {asset.last_problem}
                                    </p>

                                </div>

                            )}

                            {asset.last_resolution && (

                                <div className="mt-4">

                                    <p className="text-xs font-semibold uppercase text-gray-500">
                                        Resolution
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-gray-900">
                                        {asset.last_resolution}
                                    </p>

                                </div>

                            )}

                        </div>

                    ) : (

                        <p className="text-sm text-gray-500">
                            No completed IT support record is available for this device yet.
                        </p>

                    )}

                </div>

                {/* PENDING SUPPORT */}

                {asset.pending_work_support && (

                    <div className="mt-5 border border-orange-200 bg-orange-50 p-4">

                        <p className="text-xs font-bold uppercase text-orange-700">
                            Pending Work / Support
                        </p>

                        <p className="mt-1 text-sm text-orange-800">
                            {asset.pending_work_support}
                        </p>

                    </div>

                )}

            </div>

        </article>
    );
}