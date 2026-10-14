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

type InventoryUser = {
    id: number;

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

    user_location:
        | string
        | null;
};

type AvailableAsset = {
    id: number;

    asset_code: string;

    brand:
        | string
        | null;

    model:
        | string
        | null;

    serial_number:
        | string
        | null;

    asset_status: string;

    category_name: string;
};

type Assignment = {
    id: number;

    asset_id: number;

    inventory_user_id: number;

    assigned_at: string;

    assignment_status: string;

    is_primary_computer: boolean;

    remarks:
        | string
        | null;

    asset_code: string;

    brand:
        | string
        | null;

    model:
        | string
        | null;

    serial_number:
        | string
        | null;

    asset_status: string;

    category_name: string;

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

    user_location:
        | string
        | null;
};

type ActionType =
    | "RETURN"
    | "TRANSFER"
    | null;

// ==========================================
// LOCAL DATE
// ==========================================

function getToday() {
    const date =
        new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}

// ==========================================
// DISPLAY DATE
// ==========================================

function prettyDate(
    value: string
) {
    if (!value) {
        return "—";
    }

    const datePart =
        String(
            value
        ).slice(
            0,
            10
        );

    const date =
        new Date(
            `${datePart}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return datePart;
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

export default function AssignmentManagement() {
    const [
        assignments,
        setAssignments,
    ] =
        useState<
            Assignment[]
        >([]);

    const [
        users,
        setUsers,
    ] =
        useState<
            InventoryUser[]
        >([]);

    const [
        availableAssets,
        setAvailableAssets,
    ] =
        useState<
            AvailableAsset[]
        >([]);

    // ==========================================
    // NEW ASSIGNMENT
    // ==========================================

    const [
        inventoryUserId,
        setInventoryUserId,
    ] =
        useState("");

    const [
        assetId,
        setAssetId,
    ] =
        useState("");

    const [
        assignedDate,
        setAssignedDate,
    ] =
        useState(
            getToday()
        );

    const [
        isPrimaryComputer,
        setIsPrimaryComputer,
    ] =
        useState(false);

    const [
        remarks,
        setRemarks,
    ] =
        useState("");

    // ==========================================
    // RETURN / TRANSFER
    // ==========================================

    const [
        selectedAssignment,
        setSelectedAssignment,
    ] =
        useState<
            Assignment |
            null
        >(null);

    const [
        actionType,
        setActionType,
    ] =
        useState<ActionType>(
            null
        );

    const [
        actionDate,
        setActionDate,
    ] =
        useState(
            getToday()
        );

    const [
        transferUserId,
        setTransferUserId,
    ] =
        useState("");

    const [
        transferPrimary,
        setTransferPrimary,
    ] =
        useState(false);

    const [
        actionRemarks,
        setActionRemarks,
    ] =
        useState("");

    // ==========================================
    // GENERAL
    // ==========================================

    const [
        search,
        setSearch,
    ] =
        useState("");

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
    // LOAD DATA
    // ==========================================

    const loadData =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    const response =
                        await fetch(
                            "/api/admin/inventory/assignments",
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
                            "Unable to load assignment information."
                        );

                        return;
                    }

                    setAssignments(
                        data.assignments ||
                        []
                    );

                    setUsers(
                        data.users ||
                        []
                    );

                    setAvailableAssets(
                        data.availableAssets ||
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
        loadData();
    }, [
        loadData,
    ]);

    // ==========================================
    // SELECTED ASSET
    // ==========================================

    const selectedAsset =
        useMemo(
            () =>
                availableAssets.find(
                    (
                        asset
                    ) =>
                        String(
                            asset.id
                        ) ===
                        assetId
                ) || null,
            [
                availableAssets,
                assetId,
            ]
        );

    const canBePrimaryComputer =
        selectedAsset?.category_name ===
            "Desktop Set" ||
        selectedAsset?.category_name ===
            "Laptop";

    useEffect(() => {
        if (
            !canBePrimaryComputer
        ) {
            setIsPrimaryComputer(
                false
            );
        }
    }, [
        canBePrimaryComputer,
    ]);

    // ==========================================
    // TRANSFER PRIMARY COMPUTER
    // ==========================================

    const transferCanBePrimary =
        selectedAssignment?.category_name ===
            "Desktop Set" ||
        selectedAssignment?.category_name ===
            "Laptop";

    useEffect(() => {
        if (
            !transferCanBePrimary
        ) {
            setTransferPrimary(
                false
            );
        }
    }, [
        transferCanBePrimary,
    ]);

    // ==========================================
    // FILTER ASSIGNMENTS
    // ==========================================

    const filteredAssignments =
        useMemo(
            () => {
                const keyword =
                    search
                        .trim()
                        .toLowerCase();

                if (!keyword) {
                    return assignments;
                }

                return assignments.filter(
                    (
                        assignment
                    ) => {
                        const combined =
                            [
                                assignment.asset_code,
                                assignment.category_name,
                                assignment.brand,
                                assignment.model,
                                assignment.serial_number,
                                assignment.employee_id,
                                assignment.full_name,
                                assignment.designation,
                                assignment.department,
                                assignment.user_location,
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    " "
                                )
                                .toLowerCase();

                        return combined.includes(
                            keyword
                        );
                    }
                );
            },
            [
                assignments,
                search,
            ]
        );

    // ==========================================
    // ASSIGN ASSET
    // ==========================================

    async function assignAsset(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !inventoryUserId
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select an employee."
            );

            return;
        }

        if (
            !assetId
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select an available asset."
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
                    "/api/admin/inventory/assignments",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                inventoryUserId,
                                assetId,
                                assignedDate,
                                isPrimaryComputer,
                                remarks,
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
                    "Unable to assign asset."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Asset assigned successfully."
            );

            setInventoryUserId(
                ""
            );

            setAssetId(
                ""
            );

            setAssignedDate(
                getToday()
            );

            setIsPrimaryComputer(
                false
            );

            setRemarks(
                ""
            );

            await loadData();

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
    // OPEN ACTION
    // ==========================================

    function openAction(
        assignment:
            Assignment,
        action:
            "RETURN" |
            "TRANSFER"
    ) {
        setSelectedAssignment(
            assignment
        );

        setActionType(
            action
        );

        setActionDate(
            getToday()
        );

        setTransferUserId(
            ""
        );

        setTransferPrimary(
            false
        );

        setActionRemarks(
            ""
        );

        setMessage("");
    }

    // ==========================================
    // CLOSE ACTION
    // ==========================================

    function closeAction() {
        if (
            processing
        ) {
            return;
        }

        setSelectedAssignment(
            null
        );

        setActionType(
            null
        );

        setTransferUserId(
            ""
        );

        setTransferPrimary(
            false
        );

        setActionRemarks(
            ""
        );
    }

    // ==========================================
    // PROCESS RETURN / TRANSFER
    // ==========================================

    async function processAction(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !selectedAssignment ||
            !actionType
        ) {
            return;
        }

        if (
            actionType ===
                "TRANSFER" &&
            !transferUserId
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select the employee to transfer this asset to."
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
                    `/api/admin/inventory/assignments/${selectedAssignment.id}`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action:
                                    actionType,

                                effectiveDate:
                                    actionDate,

                                newInventoryUserId:
                                    transferUserId,

                                isPrimaryComputer:
                                    transferPrimary,

                                remarks:
                                    actionRemarks,
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
                    "Unable to process assignment."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                (
                    actionType ===
                    "RETURN"
                        ? "Asset returned successfully."
                        : "Asset transferred successfully."
                )
            );

            closeAction();

            await loadData();

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
    // CLASSES
    // ==========================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-semibold text-gray-700";

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <>
            {/* TITLE */}

            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                <div>

                    <h2 className="text-2xl font-bold text-gray-900">
                        Asset Assignment
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Assign, return and transfer IT devices
                        while preserving complete ownership history.
                    </p>

                </div>

                <div className="flex flex-wrap gap-3">

                    <Link
                        href="/admin/inventory"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        ← Inventory Dashboard
                    </Link>

                    <Link
                        href="/admin/inventory/assets"
                        className="bg-[#111111] px-5 py-3 text-sm font-semibold text-white hover:bg-[#292929]"
                    >
                        IT Assets
                    </Link>

                </div>

            </div>

            {/* KPI */}

            <div className="mb-6 grid gap-4 sm:grid-cols-3">

                <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Active Assignments
                    </p>

                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {assignments.length}
                    </p>

                </div>

                <div className="border-l-[3px] border-blue-500 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Available Assets
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-600">
                        {availableAssets.length}
                    </p>

                </div>

                <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                    <p className="text-xs font-semibold uppercase text-gray-500">
                        Inventory Users
                    </p>

                    <p className="mt-2 text-3xl font-bold text-green-600">
                        {users.length}
                    </p>

                </div>

            </div>

            {/* MESSAGE */}

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

            {/* NEW ASSIGNMENT */}

            <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                <div className="mb-5">

                    <h3 className="text-lg font-bold text-gray-900">
                        Assign Device
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        Only available IN STOCK devices are shown.
                    </p>

                </div>

                <form
                    onSubmit={
                        assignAsset
                    }
                >

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                        <div>

                            <label className={labelClass}>
                                Employee *
                            </label>

                            <select
                                value={
                                    inventoryUserId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setInventoryUserId(
                                        event.target.value
                                    )
                                }
                                required
                                className={inputClass}
                            >

                                <option value="">
                                    Select employee
                                </option>

                                {users.map(
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
                                            {user.employee_id
                                                ? `${user.employee_id} - `
                                                : ""}
                                            {user.full_name}
                                            {user.department
                                                ? ` (${user.department})`
                                                : ""}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        <div>

                            <label className={labelClass}>
                                Available Asset *
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
                                required
                                className={inputClass}
                            >

                                <option value="">
                                    Select asset
                                </option>

                                {availableAssets.map(
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
                                            {asset.brand
                                                ? ` - ${asset.brand}`
                                                : ""}
                                            {asset.model
                                                ? ` ${asset.model}`
                                                : ""}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        <div>

                            <label className={labelClass}>
                                Assigned Date *
                            </label>

                            <input
                                type="date"
                                value={
                                    assignedDate
                                }
                                onChange={(
                                    event
                                ) =>
                                    setAssignedDate(
                                        event.target.value
                                    )
                                }
                                required
                                className={inputClass}
                            />

                        </div>

                        <div>

                            <label className={labelClass}>
                                Primary Computer
                            </label>

                            <label
                                className={`flex h-11 items-center gap-3 border px-3 ${
                                    canBePrimaryComputer
                                        ? "border-gray-300 bg-white"
                                        : "border-gray-200 bg-gray-100"
                                }`}
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        isPrimaryComputer
                                    }
                                    disabled={
                                        !canBePrimaryComputer
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setIsPrimaryComputer(
                                            event.target.checked
                                        )
                                    }
                                    className="h-4 w-4"
                                />

                                <span className="text-sm text-gray-700">
                                    Set as Primary PC
                                </span>

                            </label>

                        </div>

                    </div>

                    {selectedAsset && (

                        <div className="mt-5 border-l-[3px] border-[#d4af37] bg-[#fafafa] p-4">

                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">

                                <span>
                                    <strong>Asset:</strong>{" "}
                                    {selectedAsset.asset_code}
                                </span>

                                <span>
                                    <strong>Type:</strong>{" "}
                                    {selectedAsset.category_name}
                                </span>

                                <span>
                                    <strong>Brand:</strong>{" "}
                                    {selectedAsset.brand || "—"}
                                </span>

                                <span>
                                    <strong>Model:</strong>{" "}
                                    {selectedAsset.model || "—"}
                                </span>

                                <span>
                                    <strong>Serial:</strong>{" "}
                                    {selectedAsset.serial_number || "—"}
                                </span>

                            </div>

                        </div>

                    )}

                    <div className="mt-5">

                        <label className={labelClass}>
                            Remarks
                        </label>

                        <input
                            type="text"
                            value={
                                remarks
                            }
                            onChange={(
                                event
                            ) =>
                                setRemarks(
                                    event.target.value
                                )
                            }
                            placeholder="Optional assignment note"
                            className={inputClass}
                        />

                    </div>

                    <div className="mt-6 flex justify-end">

                        <button
                            type="submit"
                            disabled={
                                processing ||
                                !inventoryUserId ||
                                !assetId
                            }
                            className="h-11 bg-[#d4af37] px-8 font-bold text-black hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing
                                ? "Assigning..."
                                : "Assign Asset"}
                        </button>

                    </div>

                </form>

            </section>

            {/* RETURN / TRANSFER PANEL */}

            {selectedAssignment &&
                actionType && (

                <section className="mb-7 border-2 border-[#d4af37] bg-white p-6 shadow-sm">

                    <div className="flex flex-wrap items-start justify-between gap-4">

                        <div>

                            <h3 className="text-lg font-bold text-gray-900">

                                {actionType ===
                                "RETURN"
                                    ? "Return Asset"
                                    : "Transfer Asset"}

                            </h3>

                            <p className="mt-1 text-sm text-gray-500">

                                {selectedAssignment.asset_code}
                                {" • "}
                                {selectedAssignment.category_name}
                                {" • Current User: "}
                                {selectedAssignment.full_name}

                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={
                                closeAction
                            }
                            className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            Close
                        </button>

                    </div>

                    <form
                        onSubmit={
                            processAction
                        }
                        className="mt-6"
                    >

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <div>

                                <label className={labelClass}>
                                    Effective Date *
                                </label>

                                <input
                                    type="date"
                                    value={
                                        actionDate
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setActionDate(
                                            event.target.value
                                        )
                                    }
                                    required
                                    className={inputClass}
                                />

                            </div>

                            {actionType ===
                                "TRANSFER" && (

                                <div>

                                    <label className={labelClass}>
                                        Transfer To *
                                    </label>

                                    <select
                                        value={
                                            transferUserId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setTransferUserId(
                                                event.target.value
                                            )
                                        }
                                        required
                                        className={inputClass}
                                    >

                                        <option value="">
                                            Select new employee
                                        </option>

                                        {users
                                            .filter(
                                                (
                                                    user
                                                ) =>
                                                    user.id !==
                                                    selectedAssignment.inventory_user_id
                                            )
                                            .map(
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
                                                        {user.employee_id
                                                            ? `${user.employee_id} - `
                                                            : ""}
                                                        {user.full_name}
                                                        {user.department
                                                            ? ` (${user.department})`
                                                            : ""}
                                                    </option>

                                                )
                                            )}

                                    </select>

                                </div>

                            )}

                            {actionType ===
                                "TRANSFER" && (

                                <div>

                                    <label className={labelClass}>
                                        Primary Computer
                                    </label>

                                    <label
                                        className={`flex h-11 items-center gap-3 border px-3 ${
                                            transferCanBePrimary
                                                ? "border-gray-300 bg-white"
                                                : "border-gray-200 bg-gray-100"
                                        }`}
                                    >

                                        <input
                                            type="checkbox"
                                            checked={
                                                transferPrimary
                                            }
                                            disabled={
                                                !transferCanBePrimary
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setTransferPrimary(
                                                    event.target.checked
                                                )
                                            }
                                            className="h-4 w-4"
                                        />

                                        <span className="text-sm text-gray-700">
                                            Set as Primary PC
                                        </span>

                                    </label>

                                </div>

                            )}

                            <div
                                className={
                                    actionType ===
                                    "RETURN"
                                        ? "md:col-span-1 xl:col-span-3"
                                        : ""
                                }
                            >

                                <label className={labelClass}>
                                    Remarks
                                </label>

                                <input
                                    type="text"
                                    value={
                                        actionRemarks
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setActionRemarks(
                                            event.target.value
                                        )
                                    }
                                    placeholder={
                                        actionType ===
                                        "RETURN"
                                            ? "Reason / return condition"
                                            : "Transfer reason / note"
                                    }
                                    className={inputClass}
                                />

                            </div>

                        </div>

                        <div className="mt-6 flex justify-end gap-3">

                            <button
                                type="button"
                                onClick={
                                    closeAction
                                }
                                disabled={
                                    processing
                                }
                                className="h-11 border border-gray-300 bg-white px-6 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    processing ||
                                    (
                                        actionType ===
                                            "TRANSFER" &&
                                        !transferUserId
                                    )
                                }
                                className={`h-11 px-7 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                                    actionType ===
                                    "RETURN"
                                        ? "bg-orange-600 hover:bg-orange-700"
                                        : "bg-[#111111] hover:bg-[#292929]"
                                }`}
                            >
                                {processing
                                    ? "Processing..."
                                    : actionType ===
                                      "RETURN"
                                        ? "Confirm Return"
                                        : "Confirm Transfer"}
                            </button>

                        </div>

                    </form>

                </section>

            )}

            {/* SEARCH */}

            <section className="mb-5 bg-white p-4 shadow-sm">

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
                    placeholder="Search employee, department, Asset ID, device type, brand, model or serial..."
                    className={inputClass}
                />

            </section>

            {/* ASSIGNMENT TABLE */}

            <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-200 px-5 py-4">

                    <h3 className="font-bold text-gray-900">
                        Current Asset Assignments
                    </h3>

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-[1500px] w-full">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="px-4 py-4 text-left text-sm">
                                    Employee
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Department
                                </th>

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
                                    Serial
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Assigned Date
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Primary
                                </th>

                                <th className="px-4 py-4 text-left text-sm">
                                    Remarks
                                </th>

                                <th className="px-4 py-4 text-center text-sm">
                                    Action
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan={
                                            10
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        Loading assignments...
                                    </td>

                                </tr>

                            ) : filteredAssignments.length ===
                                0 ? (

                                <tr>

                                    <td
                                        colSpan={
                                            10
                                        }
                                        className="px-4 py-14 text-center text-gray-500"
                                    >
                                        No active assignments found.
                                    </td>

                                </tr>

                            ) : (

                                filteredAssignments.map(
                                    (
                                        assignment
                                    ) => (

                                        <tr
                                            key={
                                                assignment.id
                                            }
                                            className="border-b border-gray-200 align-top hover:bg-gray-50"
                                        >

                                            <td className="px-4 py-4">

                                                <p className="font-semibold text-gray-900">
                                                    {assignment.full_name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    {assignment.employee_id ||
                                                        "No Employee ID"}
                                                </p>

                                                {assignment.designation && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {assignment.designation}
                                                    </p>

                                                )}

                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {assignment.department ||
                                                    "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-gray-900">
                                                {assignment.asset_code}
                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {assignment.category_name}
                                            </td>

                                            <td className="px-4 py-4">

                                                <p className="text-sm font-semibold text-gray-900">
                                                    {assignment.brand ||
                                                        "—"}
                                                </p>

                                                {assignment.model && (

                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {assignment.model}
                                                    </p>

                                                )}

                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {assignment.serial_number ||
                                                    "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                                                {prettyDate(
                                                    assignment.assigned_at
                                                )}
                                            </td>

                                            <td className="px-4 py-4 text-center">

                                                {assignment.is_primary_computer ? (

                                                    <span className="inline-block border border-[#d4af37] bg-[#fff8df] px-3 py-1 text-xs font-bold text-gray-900">
                                                        PRIMARY
                                                    </span>

                                                ) : (

                                                    <span className="text-gray-400">
                                                        —
                                                    </span>

                                                )}

                                            </td>

                                            <td className="px-4 py-4 text-sm text-gray-700">
                                                {assignment.remarks ||
                                                    "—"}
                                            </td>

                                            <td className="px-4 py-4">

                                                <div className="flex justify-center gap-2">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openAction(
                                                                assignment,
                                                                "RETURN"
                                                            )
                                                        }
                                                        className="border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                                                    >
                                                        Return
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openAction(
                                                                assignment,
                                                                "TRANSFER"
                                                            )
                                                        }
                                                        className="border border-[#d4af37] bg-[#fff8df] px-3 py-2 text-xs font-bold text-gray-900 hover:bg-[#f6e6a7]"
                                                    >
                                                        Transfer
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
        </>
    );
}