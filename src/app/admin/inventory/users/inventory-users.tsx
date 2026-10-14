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

type PortalUser = {
    id: number;
    employee_id: string;
    full_name: string;
    designation: string;
    department: string;
    official_email: string;
};

type InventoryUser = {
    id: number;

    portal_user_id:
    | number
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

    mobile_no:
    | string
    | null;

    user_location:
    | string
    | null;

    category:
    | string
    | null;

    user_training_status:
    | string
    | null;

    service_ensured_by:
    | string
    | null;

    it_concern:
    | string
    | null;

    acknowledge_to_concern_department:
    | string
    | null;

    remarks:
    | string
    | null;

    computer_schedule_maintenance:
    | string
    | null;

    ups_battery_replacement_date:
    | string
    | null;

    data_backup_method:
    | string
    | null;

    concern_it_engineer:
    | string
    | null;

    user_signature_note:
    | string
    | null;

    portal_email:
    | string
    | null;

    portal_account_status:
    | string
    | null;

    assigned_asset_count: number;
};

type Props = {
    portalUsers: PortalUser[];
};

type FormData = {
    portalUserId: string;
    employeeId: string;
    fullName: string;
    designation: string;
    department: string;
    mobileNo: string;
    userLocation: string;
    category: string;
    userTrainingStatus: string;
    serviceEnsuredBy: string;
    itConcern: string;
    acknowledgeToConcernDepartment: string;
    remarks: string;
    computerScheduleMaintenance: string;
    upsBatteryReplacementDate: string;
    dataBackupMethod: string;
    concernItEngineer: string;
    userSignatureNote: string;
};

// ==========================================
// EMPTY FORM
// ==========================================

const emptyForm: FormData = {
    portalUserId: "",
    employeeId: "",
    fullName: "",
    designation: "",
    department: "",
    mobileNo: "",
    userLocation: "",
    category: "",
    userTrainingStatus: "",
    serviceEnsuredBy: "",
    itConcern: "",
    acknowledgeToConcernDepartment: "",
    remarks: "",
    computerScheduleMaintenance: "",
    upsBatteryReplacementDate: "",
    dataBackupMethod: "",
    concernItEngineer: "",
    userSignatureNote: "",
};

// ==========================================
// COMPONENT
// ==========================================

export default function InventoryUsers({
    portalUsers,
}: Props) {
    const [
        users,
        setUsers,
    ] =
        useState<
            InventoryUser[]
        >([]);

    const [
        availablePortalUsers,
        setAvailablePortalUsers,
    ] =
        useState<
            PortalUser[]
        >(
            portalUsers
        );

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
        search,
        setSearch,
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

    const [
        showAddForm,
        setShowAddForm,
    ] =
        useState(false);

    // ==========================================
    // LOAD USERS
    // ==========================================

    const loadUsers =
        useCallback(
            async (
                searchText = ""
            ) => {
                try {
                    setLoading(
                        true
                    );

                    const query =
                        searchText.trim()
                            ? `?search=${encodeURIComponent(
                                searchText.trim()
                            )}`
                            : "";

                    const response =
                        await fetch(
                            `/api/admin/inventory/users${query}`,
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
                            "Unable to load inventory users."
                        );

                        return;
                    }

                    setUsers(
                        data.users ||
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
        loadUsers();
    }, [
        loadUsers,
    ]);

    // ==========================================
    // COUNTS
    // ==========================================

    const totalAssignedAssets =
        useMemo(
            () =>
                users.reduce(
                    (
                        total,
                        user
                    ) =>
                        total +
                        Number(
                            user.assigned_asset_count ||
                            0
                        ),
                    0
                ),
            [
                users,
            ]
        );

    const linkedUsers =
        useMemo(
            () =>
                users.filter(
                    (
                        user
                    ) =>
                        user.portal_user_id !==
                        null
                ).length,
            [
                users,
            ]
        );

    // ==========================================
    // FORM CHANGE
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
    // PORTAL USER
    // ==========================================

    function selectPortalUser(
        value: string
    ) {
        if (!value) {
            setForm(
                (
                    previous
                ) => ({
                    ...previous,

                    portalUserId:
                        "",
                })
            );

            return;
        }

        const portalUser =
            availablePortalUsers.find(
                (
                    user
                ) =>
                    String(
                        user.id
                    ) ===
                    value
            );

        if (!portalUser) {
            return;
        }

        setForm(
            (
                previous
            ) => ({
                ...previous,

                portalUserId:
                    String(
                        portalUser.id
                    ),

                employeeId:
                    portalUser.employee_id ||
                    "",

                fullName:
                    portalUser.full_name ||
                    "",

                designation:
                    portalUser.designation ||
                    "",

                department:
                    portalUser.department ||
                    "",
            })
        );
    }

    // ==========================================
    // CREATE USER
    // ==========================================

    async function createUser(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !form.fullName.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "User name is required."
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
                    "/api/admin/inventory/users",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                portalUserId:
                                    form.portalUserId,

                                employeeId:
                                    form.employeeId,

                                fullName:
                                    form.fullName,

                                designation:
                                    form.designation,

                                department:
                                    form.department,

                                mobileNo:
                                    form.mobileNo,

                                userLocation:
                                    form.userLocation,

                                category:
                                    form.category,

                                userTrainingStatus:
                                    form.userTrainingStatus,

                                serviceEnsuredBy:
                                    form.serviceEnsuredBy,

                                itConcern:
                                    form.itConcern,

                                acknowledgeToConcernDepartment:
                                    form.acknowledgeToConcernDepartment,

                                remarks:
                                    form.remarks,

                                computerScheduleMaintenance:
                                    form.computerScheduleMaintenance,

                                upsBatteryReplacementDate:
                                    form.upsBatteryReplacementDate,

                                dataBackupMethod:
                                    form.dataBackupMethod,

                                concernItEngineer:
                                    form.concernItEngineer,

                                userSignatureNote:
                                    form.userSignatureNote,
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
                    "Unable to create inventory user."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Inventory user created successfully."
            );

            if (
                form.portalUserId
            ) {
                setAvailablePortalUsers(
                    (
                        previous
                    ) =>
                        previous.filter(
                            (
                                user
                            ) =>
                                String(
                                    user.id
                                ) !==
                                form.portalUserId
                        )
                );
            }

            setForm(
                emptyForm
            );

            setShowAddForm(
                false
            );

            await loadUsers(
                search
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
    // SEARCH
    // ==========================================

    async function submitSearch(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        await loadUsers(
            search
        );
    }

    function clearSearch() {
        setSearch("");

        loadUsers();
    }

    // ==========================================
    // STYLE
    // ==========================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-semibold text-gray-700";

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <>
            {/* ================================= */}
            {/* TITLE                             */}
            {/* ================================= */}

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                <div>

                    <h2 className="text-2xl font-bold text-gray-900">
                        Inventory Users
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Manage employee inventory,
                        device ownership and IT-related information.
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
                            : "+ Add Inventory User"}
                    </button>

                </div>

            </div>

            {/* ================================= */}
            {/* KPI                               */}
            {/* ================================= */}

            <div className="mb-6 grid gap-4 md:grid-cols-3">

                <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Inventory Users
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {users.length}
                    </p>

                </div>

                <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Linked Portal Users
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {linkedUsers}
                    </p>

                </div>

                <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Assigned Assets
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-600">
                        {totalAssignedAssets}
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
            {/* ADD USER FORM                     */}
            {/* ================================= */}

            {showAddForm && (

                <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                    <h3 className="text-lg font-bold text-gray-900">
                        Add Inventory User
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        Link an existing portal user or manually create an inventory user.
                    </p>

                    <form
                        onSubmit={
                            createUser
                        }
                        className="mt-6"
                    >

                        {/* PORTAL USER */}

                        <div className="mb-6">

                            <label className={labelClass}>
                                Link Portal User
                            </label>

                            <select
                                value={
                                    form.portalUserId
                                }
                                onChange={(
                                    event
                                ) =>
                                    selectPortalUser(
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">
                                    No portal account / Manual entry
                                </option>

                                {availablePortalUsers.map(
                                    (
                                        user
                                    ) => (

                                        <option
                                            key={
                                                user.id
                                            }
                                            value={
                                                user.id
                                            }
                                        >
                                            {user.employee_id}
                                            {" - "}
                                            {user.full_name}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        {/* BASIC INFORMATION */}

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Employee ID
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.employeeId
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "employeeId",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Employee ID"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    User Name *
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.fullName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "fullName",
                                            event.target.value
                                        )
                                    }
                                    required
                                    placeholder="Full name"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Designation
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.designation
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "designation",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Designation"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Department
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.department
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "department",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Department"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Mobile No.
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.mobileNo
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "mobileNo",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Mobile number"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    User Location
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.userLocation
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "userLocation",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Floor / Building / Location"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Category
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.category
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "category",
                                            event.target.value
                                        )
                                    }
                                    placeholder="User category"
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    User Training Status
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.userTrainingStatus
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "userTrainingStatus",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Training status"
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        {/* IT / BACKUP */}

                        <h4 className="mb-4 mt-7 border-b border-gray-200 pb-2 font-bold text-gray-900">
                            IT & Backup Information
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Service Ensured By
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.serviceEnsuredBy
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "serviceEnsuredBy",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    IT Concern
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.itConcern
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "itConcern",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Concern IT Engineer
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.concernItEngineer
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "concernItEngineer",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Data Backup Method
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.dataBackupMethod
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "dataBackupMethod",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    Schedule Maintenance
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.computerScheduleMaintenance
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "computerScheduleMaintenance",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div>

                                <label className={labelClass}>
                                    UPS/Battery Replacement
                                </label>

                                <input
                                    type="date"
                                    value={
                                        form.upsBatteryReplacementDate
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "upsBatteryReplacementDate",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div className="md:col-span-2">

                                <label className={labelClass}>
                                    Acknowledge to Concern Department
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.acknowledgeToConcernDepartment
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "acknowledgeToConcernDepartment",
                                            event.target.value
                                        )
                                    }
                                    placeholder="1st / 2nd / 3rd Man"
                                    className={inputClass}
                                />

                            </div>

                            <div className="md:col-span-2">

                                <label className={labelClass}>
                                    User Signature / Verification Note
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.userSignatureNote
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "userSignatureNote",
                                            event.target.value
                                        )
                                    }
                                    className={inputClass}
                                />

                            </div>

                            <div className="md:col-span-2">

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
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        <div className="mt-6 flex justify-end gap-3">

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
                                className="border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    processing
                                }
                                className="bg-[#111111] px-7 py-3 font-bold text-white hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing
                                    ? "Saving..."
                                    : "Save Inventory User"}
                            </button>

                        </div>

                    </form>

                </section>

            )}

            {/* ================================= */}
            {/* SEARCH                            */}
            {/* ================================= */}

            <section className="mb-5 bg-white p-4 shadow-sm">

                <form
                    onSubmit={
                        submitSearch
                    }
                    className="flex flex-wrap gap-3"
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
                        placeholder="Search Employee ID, name, department, designation, mobile or location..."
                        className="h-11 min-w-[280px] flex-1 border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d4af37]"
                    />

                    <button
                        type="submit"
                        className="h-11 bg-[#111111] px-6 text-sm font-bold text-white hover:bg-[#292929]"
                    >
                        Search
                    </button>

                    <button
                        type="button"
                        onClick={
                            clearSearch
                        }
                        className="h-11 border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        Clear
                    </button>

                </form>

            </section>

            {/* ================================= */}
            {/* USER TABLE                        */}
            {/* ================================= */}

            <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                <div className="overflow-x-auto">

                    <table className="min-w-[1200px] w-full">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="px-4 py-4 text-left text-sm">
                                    Employee ID
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    User Name
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Designation
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Department
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Mobile
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Location
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Portal
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Assets
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
                                        Loading inventory users...
                                    </td>

                                </tr>

                            ) : users.length ===
                                0 ? (

                                <tr>

                                    <td
                                        colSpan={
                                            8
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        No inventory users found.
                                    </td>

                                </tr>

                            ) : (

                                users.map(
                                    (
                                        user
                                    ) => (

                                        <tr
                                            key={
                                                user.id
                                            }
                                            className="border-b border-gray-200 hover:bg-gray-50"
                                        >

                                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-700">
                                                {user.employee_id ||
                                                    "—"}
                                            </td>

                                            <td className="px-4 py-4">

                                                <p className="font-semibold text-gray-900">
                                                    {user.full_name}
                                                </p>

                                                {user.portal_email && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {user.portal_email}
                                                    </p>

                                                )}

                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {user.designation ||
                                                    "—"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {user.department ||
                                                    "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                {user.mobile_no ||
                                                    "—"}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {user.user_location ||
                                                    "—"}
                                            </td>

                                            <td className="px-4 py-4">

                                                {user.portal_user_id ? (

                                                    <span className="border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                                        LINKED
                                                    </span>

                                                ) : (

                                                    <span className="border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                                        NOT LINKED
                                                    </span>

                                                )}

                                            </td>

                                            <td className="px-4 py-4 text-center">

                                                <span className="inline-flex min-w-9 justify-center bg-[#fff8df] px-3 py-1 text-sm font-bold text-gray-900">
                                                    {user.assigned_asset_count}
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
    );
}