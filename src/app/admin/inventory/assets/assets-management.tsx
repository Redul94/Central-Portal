"use client";

import Link from "next/link";

import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

// ==========================================
// TYPES
// ==========================================

type Category = {
    id: number;
    category_code: string;
    category_name: string;
    display_order: number;
};

type Asset = {
    id: number;

    asset_code: string;

    category_id: number;

    category_code: string;

    category_name: string;

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

    pending_work_support:
    | string
    | null;

    cable_dressing:
    | string
    | null;

    wooden_tray:
    | string
    | null;

    device_requirements:
    | string
    | null;

    purchase_date:
    | string
    | null;

    warranty_start:
    | string
    | null;

    warranty_end:
    | string
    | null;

    asset_status:
    | "IN_STOCK"
    | "ASSIGNED"
    | "UNDER_SERVICE"
    | "RETIRED"
    | "DISPOSED"
    | "LOST";

    remarks:
    | string
    | null;

    assigned_user_id:
    | number
    | null;

    assigned_employee_id:
    | string
    | null;

    assigned_user_name:
    | string
    | null;

    assigned_department:
    | string
    | null;

    assigned_location:
    | string
    | null;
};

type Props = {
    categories: Category[];
};

type FormData = {
    assetCode: string;
    categoryId: string;
    brand: string;
    model: string;
    serialNumber: string;
    processor: string;
    ramVersion: string;
    storageInfo: string;
    windowsVersion: string;
    officeVersion: string;
    adOrWorkgroup: string;
    email365: string;
    endpointSecurity: string;
    computerMaintenanceStatus: string;
    dataBackupStatus: string;
    pendingWorkSupport: string;
    cableDressing: string;
    woodenTray: string;
    deviceRequirements: string;
    purchaseDate: string;
    warrantyStart: string;
    warrantyEnd: string;
    assetStatus: string;
    remarks: string;
};

const emptyForm: FormData = {
    assetCode: "",
    categoryId: "",
    brand: "",
    model: "",
    serialNumber: "",
    processor: "",
    ramVersion: "",
    storageInfo: "",
    windowsVersion: "",
    officeVersion: "",
    adOrWorkgroup: "",
    email365: "",
    endpointSecurity: "",
    computerMaintenanceStatus: "",
    dataBackupStatus: "",
    pendingWorkSupport: "",
    cableDressing: "",
    woodenTray: "",
    deviceRequirements: "",
    purchaseDate: "",
    warrantyStart: "",
    warrantyEnd: "",
    assetStatus: "IN_STOCK",
    remarks: "",
};

// ==========================================
// DATE FORMAT
// ==========================================

function prettyDate(
    value:
        string |
        null
) {
    if (!value) {
        return "—";
    }

    const dateOnly =
        String(
            value
        ).slice(
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
// COMPONENT
// ==========================================

export default function AssetsManagement({
    categories,
}: Props) {
    const [
        assets,
        setAssets,
    ] =
        useState<
            Asset[]
        >([]);

    const [
        form,
        setForm,
    ] =
        useState<FormData>(
            emptyForm
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
        showAddForm,
        setShowAddForm,
    ] =
        useState(false);

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState("");

    const [
        categoryFilter,
        setCategoryFilter,
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
    // LOAD ASSETS
    // ==========================================

    const loadAssets =
        useCallback(
            async (
                searchValue = "",
                statusValue = "",
                categoryValue = ""
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
                        categoryValue
                    ) {
                        params.set(
                            "categoryId",
                            categoryValue
                        );
                    }

                    const query =
                        params.toString();

                    const response =
                        await fetch(
                            `/api/admin/inventory/assets${
                                query
                                    ? `?${query}`
                                    : ""
                            }`,
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
                            "Unable to load IT assets."
                        );

                        return;
                    }

                    setAssets(
                        data.assets ||
                        []
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
        loadAssets();
    }, [
        loadAssets,
    ]);

    // ==========================================
    // KPI
    // ==========================================

    const assignedCount =
        useMemo(
            () =>
                assets.filter(
                    (
                        asset
                    ) =>
                        asset.asset_status ===
                        "ASSIGNED"
                ).length,
            [
                assets,
            ]
        );

    const inStockCount =
        useMemo(
            () =>
                assets.filter(
                    (
                        asset
                    ) =>
                        asset.asset_status ===
                        "IN_STOCK"
                ).length,
            [
                assets,
            ]
        );

    const serviceCount =
        useMemo(
            () =>
                assets.filter(
                    (
                        asset
                    ) =>
                        asset.asset_status ===
                        "UNDER_SERVICE"
                ).length,
            [
                assets,
            ]
        );

    // ==========================================
    // UPDATE FIELD
    // ==========================================

    function updateField(
        field:
            keyof FormData,
        value: string
    ) {
        setForm(
            (
                previous
            ) => ({
                ...previous,

                [field]:
                    value,
            })
        );
    }

    // ==========================================
    // CREATE ASSET
    // ==========================================

    async function createAsset(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !form.assetCode.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Asset ID / Asset Code is required."
            );

            return;
        }

        if (
            !form.categoryId
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select an asset category."
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
                    "/api/admin/inventory/assets",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                form
                            ),
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
                    "Unable to create IT asset."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "IT asset created successfully."
            );

            setForm(
                emptyForm
            );

            setShowAddForm(
                false
            );

            await loadAssets(
                search,
                statusFilter,
                categoryFilter
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
            setProcessing(
                false
            );
        }
    }

    // ==========================================
    // SEARCH / FILTER
    // ==========================================

    async function submitFilter(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        await loadAssets(
            search,
            statusFilter,
            categoryFilter
        );
    }

    function clearFilter() {
        setSearch("");

        setStatusFilter("");

        setCategoryFilter("");

        loadAssets();
    }

    // ==========================================
    // STATUS STYLE
    // ==========================================

    function statusStyle(
        status: string
    ) {
        switch (
            status
        ) {
            case "IN_STOCK":
                return "border-blue-300 bg-blue-50 text-blue-700";

            case "ASSIGNED":
                return "border-green-300 bg-green-50 text-green-700";

            case "UNDER_SERVICE":
                return "border-orange-300 bg-orange-50 text-orange-700";

            case "RETIRED":
                return "border-gray-300 bg-gray-100 text-gray-700";

            case "DISPOSED":
                return "border-gray-300 bg-gray-100 text-gray-600";

            case "LOST":
                return "border-red-300 bg-red-50 text-red-700";

            default:
                return "border-gray-300 bg-white text-gray-700";
        }
    }

    // ==========================================
    // WARRANTY
    // ==========================================

    function warrantyStatus(
        warrantyEnd:
            string |
            null
    ) {
        if (
            !warrantyEnd
        ) {
            return {
                label:
                    "Not Recorded",

                className:
                    "text-gray-500",
            };
        }

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const end =
            new Date(
                `${warrantyEnd.slice(
                    0,
                    10
                )}T00:00:00`
            );

        if (
            end.getTime() <
            today.getTime()
        ) {
            return {
                label:
                    "Expired",

                className:
                    "font-semibold text-red-600",
            };
        }

        return {
            label:
                "Active",

            className:
                "font-semibold text-green-600",
        };
    }

    // ==========================================
    // CLASSES
    // ==========================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-semibold text-gray-700";

    return (
        <>
            {/* ================================= */}
            {/* TITLE                             */}
            {/* ================================= */}

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                <div>

                    <h2 className="text-2xl font-bold text-gray-900">
                        IT Assets
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Register and manage all IT equipment
                        and device information.
                    </p>

                </div>

                <div className="flex flex-wrap gap-3">

                    <Link
                        href="/admin/inventory"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        ← Inventory Dashboard
                    </Link>

                    <button
                        type="button"
                        onClick={() => {
                            setShowAddForm(
                                (
                                    previous
                                ) =>
                                    !previous
                            );

                            setMessage("");
                        }}
                        className="bg-[#d4af37] px-5 py-3 text-sm font-bold text-black hover:bg-[#b99625]"
                    >
                        {showAddForm
                            ? "Close Form"
                            : "+ Add IT Asset"}
                    </button>

                </div>

            </div>

            {/* ================================= */}
            {/* KPI                               */}
            {/* ================================= */}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Displayed Assets
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {assets.length}
                    </p>

                </div>

                <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Assigned
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {assignedCount}
                    </p>

                </div>

                <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        In Stock
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-600">
                        {inStockCount}
                    </p>

                </div>

                <div className="border-l-[3px] border-orange-500 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Under Service
                    </p>

                    <p className="mt-2 text-3xl font-bold text-orange-600">
                        {serviceCount}
                    </p>

                </div>

            </div>

            {/* ================================= */}
            {/* MESSAGE                           */}
            {/* ================================= */}

            {message && (

                <div
                    className={`mb-6 border px-4 py-3 text-sm font-semibold ${
                        success
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-red-300 bg-red-50 text-red-700"
                    }`}
                >
                    {message}
                </div>

            )}

            {/* ================================= */}
            {/* ADD ASSET                         */}
            {/* ================================= */}

            {showAddForm && (

                <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                    <h3 className="text-lg font-bold text-gray-900">
                        Add IT Asset
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        Register a physical IT device in the central inventory.
                    </p>

                    <form
                        onSubmit={
                            createAsset
                        }
                        className="mt-6"
                    >

                        {/* BASIC */}

                        <h4 className="mb-4 border-b border-gray-200 pb-2 font-bold text-gray-900">
                            Asset Information
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Asset ID / Code *
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.assetCode
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "assetCode",
                                            event.target.value
                                        )
                                    }
                                    required
                                    placeholder="e.g. ATG-PC-0001"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Device Type *
                                </label>

                                <select
                                    value={
                                        form.categoryId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "categoryId",
                                            event.target.value
                                        )
                                    }
                                    required
                                    className={inputClass}
                                >

                                    <option value="">
                                        Select type
                                    </option>

                                    {categories.map(
                                        (
                                            category
                                        ) => (

                                            <option
                                                key={
                                                    category.id
                                                }
                                                value={
                                                    category.id
                                                }
                                            >
                                                {
                                                    category.category_name
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Brand
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.brand
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "brand",
                                            event.target.value
                                        )
                                    }
                                    placeholder="HP / Dell / Lenovo"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Model
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.model
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "model",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Model"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Serial Number
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.serialNumber
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "serialNumber",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Serial number"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Asset Status
                                </label>

                                <select
                                    value={
                                        form.assetStatus
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "assetStatus",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                >

                                    <option value="IN_STOCK">
                                        IN STOCK
                                    </option>

                                    <option value="UNDER_SERVICE">
                                        UNDER SERVICE
                                    </option>

                                    <option value="RETIRED">
                                        RETIRED
                                    </option>

                                    <option value="DISPOSED">
                                        DISPOSED
                                    </option>

                                    <option value="LOST">
                                        LOST
                                    </option>

                                </select>

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Purchase Date
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.purchaseDate
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "purchaseDate",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Remarks
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.remarks
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "remarks",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Remarks"
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        {/* COMPUTER SPEC */}

                        <h4 className="mb-4 mt-7 border-b border-gray-200 pb-2 font-bold text-gray-900">
                            Computer / System Information
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Processor
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.processor
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "processor",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Intel Core i5"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    RAM
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.ramVersion
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "ramVersion",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 16 GB DDR4"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Storage
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.storageInfo
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "storageInfo",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 512 GB SSD"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Windows Version
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.windowsVersion
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "windowsVersion",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Windows 11 Pro"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Office Version
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.officeVersion
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "officeVersion",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Office / Microsoft 365"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    AD / Workgroup
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.adOrWorkgroup
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "adOrWorkgroup",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Domain / Workgroup"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Email / 365
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.email365
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "email365",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Email / 365 status"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Endpoint Security
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.endpointSecurity
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "endpointSecurity",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Bitdefender / Endpoint"
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        {/* MAINTENANCE */}

                        <h4 className="mb-4 mt-7 border-b border-gray-200 pb-2 font-bold text-gray-900">
                            Maintenance & Backup
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Maintenance Status
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.computerMaintenanceStatus
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "computerMaintenanceStatus",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Data Backup Status
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.dataBackupStatus
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "dataBackupStatus",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Cable Dressing
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.cableDressing
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "cableDressing",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Wooden Tray
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.woodenTray
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "woodenTray",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div className="md:col-span-2">

                                <label className={labelClass}>
                                    Pending Work / Support
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.pendingWorkSupport
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "pendingWorkSupport",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div className="md:col-span-2">

                                <label className={labelClass}>
                                    Device Requirements
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.deviceRequirements
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "deviceRequirements",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        {/* WARRANTY */}

                        <h4 className="mb-4 mt-7 border-b border-gray-200 pb-2 font-bold text-gray-900">
                            Warranty Information
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Warranty Start
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.warrantyStart
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "warrantyStart",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Warranty End
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.warrantyEnd
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "warrantyEnd",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        <div className="mt-7 flex justify-end gap-3">

                            <button
                                type="button"
                                onClick={() => {
                                    setForm(
                                        emptyForm
                                    );

                                    setShowAddForm(
                                        false
                                    );
                                }}
                                className="h-11 border border-gray-300 bg-white px-6 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    processing
                                }
                                className="h-11 bg-[#111111] px-7 font-bold text-white hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing
                                    ? "Saving..."
                                    : "Save IT Asset"}
                            </button>

                        </div>

                    </form>

                </section>

            )}

            {/* ================================= */}
            {/* FILTER                            */}
            {/* ================================= */}

            <section className="mb-5 bg-white p-4 shadow-sm">

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
                        placeholder="Search Asset ID, brand, model or serial..."
                        className={inputClass}
                    />

                    <select
                        value={
                            categoryFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setCategoryFilter(
                                event.target.value
                            )
                        }
                        className={inputClass}
                    >

                        <option value="">
                            All Device Types
                        </option>

                        {categories.map(
                            (
                                category
                            ) => (

                                <option
                                    key={
                                        category.id
                                    }
                                    value={
                                        category.id
                                    }
                                >
                                    {
                                        category.category_name
                                    }
                                </option>

                            )
                        )}

                    </select>

                    <select
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                        className={inputClass}
                    >

                        <option value="">
                            All Status
                        </option>

                        <option value="IN_STOCK">
                            In Stock
                        </option>

                        <option value="ASSIGNED">
                            Assigned
                        </option>

                        <option value="UNDER_SERVICE">
                            Under Service
                        </option>

                        <option value="RETIRED">
                            Retired
                        </option>

                        <option value="DISPOSED">
                            Disposed
                        </option>

                        <option value="LOST">
                            Lost
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
            {/* ASSET TABLE                       */}
            {/* ================================= */}

            <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                <div className="overflow-x-auto">

                    <table className="min-w-[1450px] w-full">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="px-4 py-4 text-left text-sm">
                                    Asset ID
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Device Type
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Brand / Model
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Serial Number
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    System
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Assigned To
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Warranty
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Status
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        Loading IT assets...
                                    </td>

                                </tr>

                            ) : assets.length ===
                                0 ? (

                                <tr>

                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        No IT assets found.
                                    </td>

                                </tr>

                            ) : (

                                assets.map(
                                    (
                                        asset
                                    ) => {
                                        const warranty =
                                            warrantyStatus(
                                                asset.warranty_end
                                            );

                                        return (

                                            <tr
                                                key={
                                                    asset.id
                                                }
                                                className="border-b border-gray-200 align-top hover:bg-gray-50"
                                            >

                                                <td className="whitespace-nowrap px-4 py-4">

                                                    <p className="font-bold text-gray-900">
                                                        {
                                                            asset.asset_code
                                                        }
                                                    </p>

                                                </td>

                                                <td className="px-4 py-4 text-sm text-gray-700">
                                                    {
                                                        asset.category_name
                                                    }
                                                </td>

                                                <td className="px-4 py-4">

                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {
                                                            asset.brand ||
                                                            "—"
                                                        }
                                                    </p>

                                                    {asset.model && (

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {
                                                                asset.model
                                                            }
                                                        </p>

                                                    )}

                                                </td>

                                                <td className="px-4 py-4 text-sm text-gray-700">
                                                    {
                                                        asset.serial_number ||
                                                        "—"
                                                    }
                                                </td>

                                                <td className="px-4 py-4">

                                                    {asset.processor && (

                                                        <p className="text-xs text-gray-700">
                                                            CPU:{" "}
                                                            {
                                                                asset.processor
                                                            }
                                                        </p>

                                                    )}

                                                    {asset.ram_version && (

                                                        <p className="mt-1 text-xs text-gray-600">
                                                            RAM:{" "}
                                                            {
                                                                asset.ram_version
                                                            }
                                                        </p>

                                                    )}

                                                    {asset.storage_info && (

                                                        <p className="mt-1 text-xs text-gray-600">
                                                            Storage:{" "}
                                                            {
                                                                asset.storage_info
                                                            }
                                                        </p>

                                                    )}

                                                    {!asset.processor &&
                                                        !asset.ram_version &&
                                                        !asset.storage_info && (
                                                            <span className="text-sm text-gray-400">
                                                                —
                                                            </span>
                                                        )}

                                                </td>

                                                <td className="px-4 py-4">

                                                    {asset.assigned_user_id ? (

                                                        <>

                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {
                                                                    asset.assigned_user_name
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {
                                                                    asset.assigned_employee_id ||
                                                                    "No Employee ID"
                                                                }
                                                            </p>

                                                            {asset.assigned_department && (

                                                                <p className="mt-1 text-xs text-gray-500">
                                                                    {
                                                                        asset.assigned_department
                                                                    }
                                                                </p>

                                                            )}

                                                        </>

                                                    ) : (

                                                        <span className="text-sm text-gray-400">
                                                            Not Assigned
                                                        </span>

                                                    )}

                                                </td>

                                                <td className="px-4 py-4">

                                                    <p className={warranty.className}>
                                                        {
                                                            warranty.label
                                                        }
                                                    </p>

                                                    {asset.warranty_end && (

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Until{" "}
                                                            {
                                                                prettyDate(
                                                                    asset.warranty_end
                                                                )
                                                            }
                                                        </p>

                                                    )}

                                                </td>

                                                <td className="px-4 py-4">

                                                    <span
                                                        className={`inline-block border px-3 py-1 text-xs font-semibold ${statusStyle(
                                                            asset.asset_status
                                                        )}`}
                                                    >
                                                        {
                                                            asset.asset_status.replaceAll(
                                                                "_",
                                                                " "
                                                            )
                                                        }
                                                    </span>

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
        </>
    );
}