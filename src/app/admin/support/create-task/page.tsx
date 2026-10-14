"use client";

import Link from "next/link";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import PortalHeader from "@/components/portal-header";

// ==========================================
// TYPES
// ==========================================

type Admin = {
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

    role: string;
};

type Employee = {
    inventory_user_id: number;

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

    official_email:
    | string
    | null;

    portal_account_status:
    | string
    | null;

    portal_status:
    | string
    | null;
};

type SupportStaff = {
    support_staff_id: number;

    portal_user_id: number;

    staff_title:
    | string
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
};

type Asset = {
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

    category_name:
    | string
    | null;

    is_primary_computer:
    | boolean
    | null;
};

type FormApiResponse = {
    success: boolean;

    message?: string;

    admin?: Admin;

    employees?: Employee[];

    staff?: SupportStaff[];

    assets?: Asset[];
};

type CreateResponse = {
    success: boolean;

    message?: string;

    requesterMode?:
    | "EXISTING"
    | "MANUAL";

    employeeNotificationSent?:
    boolean;

    requester?: {
        inventoryUserId:
        | number
        | null;

        employeeId:
        | string
        | null;

        fullName: string;

        designation:
        | string
        | null;

        department:
        | string
        | null;

        location:
        | string
        | null;

        mobile:
        | string
        | null;

        portalUserId:
        | number
        | null;
    };

    ticket?: {
        id: number;

        ticket_no:
        | string
        | null;

        ticket_status: string;

        tna_at:
        | string
        | null;
    };
};

// ==========================================
// PAGE
// ==========================================

export default function CreateITSupportTaskPage() {

    // ======================================
    // MASTER DATA
    // ======================================

    const [
        admin,
        setAdmin,
    ] =
        useState<
            Admin |
            null
        >(null);

    const [
        employees,
        setEmployees,
    ] =
        useState<Employee[]>(
            []
        );

    const [
        staff,
        setStaff,
    ] =
        useState<
            SupportStaff[]
        >([]);

    const [
        assets,
        setAssets,
    ] =
        useState<Asset[]>(
            []
        );

    // ======================================
    // REQUESTER MODE
    // ======================================

    const [
        manualRequester,
        setManualRequester,
    ] =
        useState(false);

    // ======================================
    // EXISTING EMPLOYEE
    // ======================================

    const [
        employeeSearch,
        setEmployeeSearch,
    ] =
        useState("");

    const [
        inventoryUserId,
        setInventoryUserId,
    ] =
        useState("");

    // ======================================
    // MANUAL EMPLOYEE
    // ======================================

    const [
        manualEmployeeId,
        setManualEmployeeId,
    ] =
        useState("");

    const [
        manualEmployeeName,
        setManualEmployeeName,
    ] =
        useState("");

    const [
        manualEmployeeDesignation,
        setManualEmployeeDesignation,
    ] =
        useState("");

    const [
        manualEmployeeDepartment,
        setManualEmployeeDepartment,
    ] =
        useState("");

    const [
        manualEmployeeLocation,
        setManualEmployeeLocation,
    ] =
        useState("");

    const [
        manualEmployeeMobile,
        setManualEmployeeMobile,
    ] =
        useState("");

    // ======================================
    // TASK DATA
    // ======================================

    const [
        assetId,
        setAssetId,
    ] =
        useState("");

    const [
        subject,
        setSubject,
    ] =
        useState("");

    const [
        issueCategory,
        setIssueCategory,
    ] =
        useState("");

    const [
        problemDescription,
        setProblemDescription,
    ] =
        useState("");

    const [
        priority,
        setPriority,
    ] =
        useState(
            "NORMAL"
        );

    const [
        assignedTo,
        setAssignedTo,
    ] =
        useState("");

    // ======================================
    // TNA
    // ======================================

    const [
        tnaAt,
        setTnaAt,
    ] =
        useState("");

    // ======================================
    // PROCESSING
    // ======================================

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        assetLoading,
        setAssetLoading,
    ] =
        useState(false);

    const [
        submitting,
        setSubmitting,
    ] =
        useState(false);

    const [
        success,
        setSuccess,
    ] =
        useState(false);

    const [
        message,
        setMessage,
    ] =
        useState("");

    const [
        createdTicket,
        setCreatedTicket,
    ] =
        useState<
            CreateResponse["ticket"] |
            null
        >(null);

    // ======================================
    // LOAD INITIAL DATA
    // ======================================

    useEffect(() => {

        async function loadData() {

            try {

                setLoading(
                    true
                );

                const response =
                    await fetch(
                        "/api/admin/support/create-task",
                        {
                            cache:
                                "no-store",
                        }
                    );

                const data:
                    FormApiResponse =
                    await response.json();

                if (
                    !response.ok
                ) {

                    setSuccess(
                        false
                    );

                    setMessage(
                        data.message ||
                        "Unable to load form data."
                    );

                    return;
                }

                setAdmin(
                    data.admin ||
                    null
                );

                setEmployees(
                    data.employees ||
                    []
                );

                setStaff(
                    data.staff ||
                    []
                );

            } catch (
            error
            ) {

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

        }

        void loadData();

    }, []);

    // ======================================
    // LOAD EMPLOYEE ASSETS
    // ======================================

    useEffect(() => {

        if (
            manualRequester ||
            !inventoryUserId
        ) {

            setAssets(
                []
            );

            setAssetId(
                ""
            );

            return;
        }

        async function loadAssets() {

            try {

                setAssetLoading(
                    true
                );

                setAssetId(
                    ""
                );

                const response =
                    await fetch(
                        `/api/admin/support/create-task?inventoryUserId=${encodeURIComponent(
                            inventoryUserId
                        )}`,
                        {
                            cache:
                                "no-store",
                        }
                    );

                const data:
                    FormApiResponse =
                    await response.json();

                if (
                    !response.ok
                ) {

                    setSuccess(
                        false
                    );

                    setMessage(
                        data.message ||
                        "Unable to load employee devices."
                    );

                    return;
                }

                setAssets(
                    data.assets ||
                    []
                );

            } catch (
            error
            ) {

                console.error(
                    error
                );

                setSuccess(
                    false
                );

                setMessage(
                    "Unable to load employee devices."
                );

            } finally {

                setAssetLoading(
                    false
                );

            }

        }

        void loadAssets();

    }, [
        inventoryUserId,
        manualRequester,
    ]);

    // ======================================
    // FILTER EMPLOYEES
    // ======================================

    const filteredEmployees =
        useMemo(
            () => {

                const searchValue =
                    employeeSearch
                        .trim()
                        .toLowerCase();

                if (
                    !searchValue
                ) {
                    return employees;
                }

                return employees.filter(
                    (
                        employee
                    ) => {

                        const searchable = [
                            employee.employee_id,
                            employee.full_name,
                            employee.designation,
                            employee.department,
                            employee.user_location,
                            employee.mobile_no,
                            employee.portal_status,
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                " "
                            )
                            .toLowerCase();

                        return searchable.includes(
                            searchValue
                        );

                    }
                );

            },
            [
                employees,
                employeeSearch,
            ]
        );

    // ======================================
    // SELECTED EMPLOYEE
    // ======================================

    const selectedEmployee =
        useMemo(
            () =>
                employees.find(
                    (
                        employee
                    ) =>
                        String(
                            employee.inventory_user_id
                        ) ===
                        inventoryUserId
                ) ||
                null,
            [
                employees,
                inventoryUserId,
            ]
        );

    const selectedEmployeeHasActivePortal =
        Boolean(
            selectedEmployee?.portal_user_id
        ) &&
        selectedEmployee?.portal_account_status ===
        "ACTIVE";

    // ======================================
    // SWITCH TO MANUAL
    // ======================================

    function switchToManualRequester() {

        setManualRequester(
            true
        );

        setEmployeeSearch(
            ""
        );

        setInventoryUserId(
            ""
        );

        setAssetId(
            ""
        );

        setAssets(
            []
        );

        setMessage(
            ""
        );

    }

    // ======================================
    // SWITCH TO EXISTING
    // ======================================

    function switchToExistingEmployee() {

        setManualRequester(
            false
        );

        setManualEmployeeId(
            ""
        );

        setManualEmployeeName(
            ""
        );

        setManualEmployeeDesignation(
            ""
        );

        setManualEmployeeDepartment(
            ""
        );

        setManualEmployeeLocation(
            ""
        );

        setManualEmployeeMobile(
            ""
        );

        setMessage(
            ""
        );

    }

    // ======================================
    // RESET FORM
    // ======================================

    function resetForm() {

        setManualRequester(
            false
        );

        setEmployeeSearch(
            ""
        );

        setInventoryUserId(
            ""
        );

        setManualEmployeeId(
            ""
        );

        setManualEmployeeName(
            ""
        );

        setManualEmployeeDesignation(
            ""
        );

        setManualEmployeeDepartment(
            ""
        );

        setManualEmployeeLocation(
            ""
        );

        setManualEmployeeMobile(
            ""
        );

        setAssetId(
            ""
        );

        setAssets(
            []
        );

        setSubject(
            ""
        );

        setIssueCategory(
            ""
        );

        setProblemDescription(
            ""
        );

        setPriority(
            "NORMAL"
        );

        setAssignedTo(
            ""
        );

        setTnaAt(
            ""
        );

    }

    // ======================================
    // SUBMIT TASK
    // ======================================

    async function submitTask(
        event:
            FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        setMessage(
            ""
        );

        setCreatedTicket(
            null
        );

        // ==================================
        // REQUESTER VALIDATION
        // ==================================

        if (
            manualRequester
        ) {

            if (
                !manualEmployeeId
                    .trim()
            ) {

                setSuccess(
                    false
                );

                setMessage(
                    "Please enter the manual employee ID."
                );

                return;
            }

            if (
                !manualEmployeeName
                    .trim()
            ) {

                setSuccess(
                    false
                );

                setMessage(
                    "Please enter the manual employee name."
                );

                return;
            }

        } else if (
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

        // ==================================
        // TASK VALIDATION
        // ==================================

        if (
            !subject.trim()
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Please enter the task subject."
            );

            return;
        }

        if (
            !problemDescription
                .trim()
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Please enter the task description."
            );

            return;
        }

        // ==================================
        // TNA VALIDATION
        // ==================================

        if (
            assignedTo &&
            !tnaAt
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Please enter TNA date and time for the assigned IT Engineer."
            );

            return;
        }

        try {

            setSubmitting(
                true
            );

            const response =
                await fetch(
                    "/api/admin/support/create-task",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({

                                requesterMode:
                                    manualRequester
                                        ? "MANUAL"
                                        : "EXISTING",

                                manualRequester,

                                inventoryUserId:
                                    manualRequester
                                        ? null
                                        : Number(
                                            inventoryUserId
                                        ),

                                manualEmployee:
                                    manualRequester
                                        ? {
                                            employeeId:
                                                manualEmployeeId
                                                    .trim(),

                                            fullName:
                                                manualEmployeeName
                                                    .trim(),

                                            designation:
                                                manualEmployeeDesignation
                                                    .trim(),

                                            department:
                                                manualEmployeeDepartment
                                                    .trim(),

                                            userLocation:
                                                manualEmployeeLocation
                                                    .trim(),

                                            mobileNo:
                                                manualEmployeeMobile
                                                    .trim(),
                                        }
                                        : null,

                                assetId:
                                    manualRequester
                                        ? null
                                        : assetId ||
                                        null,

                                subject:
                                    subject
                                        .trim(),

                                issueCategory:
                                    issueCategory
                                        .trim(),

                                problemDescription:
                                    problemDescription
                                        .trim(),

                                priority,

                                assignedTo:
                                    assignedTo ||
                                    null,

                                tnaAt:
                                    assignedTo
                                        ? tnaAt
                                        : null,
                            }),
                    }
                );

            const data:
                CreateResponse =
                await response.json();

            if (
                !response.ok
            ) {

                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to create IT Support task."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "IT Support task created successfully."
            );

            setCreatedTicket(
                data.ticket ||
                null
            );

            resetForm();
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }, 100);

        } catch (
        error
        ) {

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

            setSubmitting(
                false
            );

        }

    }

    // ======================================
    // STYLE
    // ======================================

    const inputClass =
        "h-11 w-full border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-bold text-gray-700";

    // ======================================
    // PAGE
    // ======================================

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            <PortalHeader
                title="Create IT Support Task"
                fullName={
                    admin?.full_name
                }
                employeeId={
                    admin?.employee_id
                }
                department={
                    admin?.department
                }
                role={
                    admin?.role
                }
                showHomeButton
                homeHref="/"
            />

            <div className="mx-auto max-w-[1200px] px-6 py-8">

                {/* ================================= */}
                {/* TITLE                             */}
                {/* ================================= */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Create IT Support Task
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                            Create a task for an existing Inventory employee
                            or enter manual details for an employee who is not
                            registered in Inventory or the Portal.
                        </p>

                    </div>

                    <Link
                        href="/admin/support"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#d4af37]"
                    >
                        ← Back to IT Support
                    </Link>

                </div>

                {/* ================================= */}
                {/* MESSAGE                           */}
                {/* ================================= */}

                {message && (

                    <div
                        className={`mb-6 border px-5 py-4 text-sm font-semibold ${success
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-red-300 bg-red-50 text-red-700"
                            }`}
                    >

                        {message}

                        {createdTicket && (

                            <div className="mt-3 flex flex-wrap items-center gap-3">

                                <span>
                                    Ticket:
                                    {" "}

                                    <strong>
                                        {createdTicket.ticket_no ||
                                            `#${createdTicket.id}`}
                                    </strong>
                                </span>

                                <span>
                                    Status:
                                    {" "}

                                    <strong>
                                        {createdTicket.ticket_status}
                                    </strong>
                                </span>

                                {createdTicket.tna_at && (

                                    <span>
                                        TNA:
                                        {" "}

                                        <strong>
                                            {createdTicket.tna_at}
                                        </strong>
                                    </span>

                                )}

                                <Link
                                    href={`/admin/support?ticket=${createdTicket.id}`}
                                    className="bg-[#111111] px-4 py-2 text-xs font-bold text-white hover:bg-[#292929]"
                                >
                                    Open Ticket
                                </Link>

                            </div>

                        )}

                    </div>

                )}

                {/* ================================= */}
                {/* LOADING                           */}
                {/* ================================= */}

                {loading ? (

                    <div className="border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
                        Loading support task form...
                    </div>

                ) : (

                    <form
                        onSubmit={
                            submitTask
                        }
                        className="border border-gray-200 bg-white shadow-sm"
                    >

                        {/* ========================= */}
                        {/* EMPLOYEE                  */}
                        {/* ========================= */}

                        <section className="border-b border-gray-200 p-6">

                            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">

                                <div>

                                    <h3 className="text-lg font-bold text-gray-900">
                                        1. Employee
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Select an existing employee or enter
                                        manual employee details for this task.
                                    </p>

                                </div>

                                {!manualRequester ? (

                                    <button
                                        type="button"
                                        onClick={
                                            switchToManualRequester
                                        }
                                        className="bg-[#d4af37] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#b99625]"
                                    >
                                        + Manual / Unregistered Employee
                                    </button>

                                ) : (

                                    <button
                                        type="button"
                                        onClick={
                                            switchToExistingEmployee
                                        }
                                        className="border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-[#d4af37]"
                                    >
                                        ← Select Existing Employee
                                    </button>

                                )}

                            </div>

                            {/* ===================== */}
                            {/* EXISTING EMPLOYEE     */}
                            {/* ===================== */}

                            {!manualRequester ? (

                                <>

                                    <div className="grid gap-5 lg:grid-cols-2">

                                        <div>

                                            <label className={labelClass}>
                                                Search Employee
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    employeeSearch
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEmployeeSearch(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Employee ID, name, department..."
                                                className={inputClass}
                                            />

                                        </div>

                                        <div>

                                            <label className={labelClass}>
                                                Employee *
                                            </label>

                                            <select
                                                required
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
                                                className={inputClass}
                                            >

                                                <option value="">
                                                    Select Employee
                                                </option>

                                                {filteredEmployees.map(
                                                    (
                                                        employee
                                                    ) => {

                                                        const activePortal =
                                                            Boolean(
                                                                employee.portal_user_id
                                                            ) &&
                                                            employee.portal_account_status ===
                                                            "ACTIVE";

                                                        return (

                                                            <option
                                                                key={
                                                                    employee.inventory_user_id
                                                                }
                                                                value={
                                                                    employee.inventory_user_id
                                                                }
                                                            >
                                                                {employee.employee_id
                                                                    ? `${employee.employee_id} - `
                                                                    : ""}

                                                                {employee.full_name}

                                                                {employee.department
                                                                    ? ` - ${employee.department}`
                                                                    : ""}

                                                                {activePortal
                                                                    ? " [Portal Active]"
                                                                    : " [No Portal Account]"}
                                                            </option>

                                                        );

                                                    }
                                                )}

                                            </select>

                                        </div>

                                    </div>

                                    {selectedEmployee && (

                                        <>

                                            <div className="mt-5 grid gap-4 border border-[#e4d08b] bg-[#fffbea] p-5 sm:grid-cols-2 lg:grid-cols-4">

                                                <Info
                                                    label="Employee"
                                                    value={
                                                        selectedEmployee.full_name
                                                    }
                                                />

                                                <Info
                                                    label="Employee ID"
                                                    value={
                                                        selectedEmployee.employee_id
                                                    }
                                                />

                                                <Info
                                                    label="Designation"
                                                    value={
                                                        selectedEmployee.designation
                                                    }
                                                />

                                                <Info
                                                    label="Department"
                                                    value={
                                                        selectedEmployee.department
                                                    }
                                                />

                                                <Info
                                                    label="Location"
                                                    value={
                                                        selectedEmployee.user_location
                                                    }
                                                />

                                                <Info
                                                    label="Mobile"
                                                    value={
                                                        selectedEmployee.mobile_no
                                                    }
                                                />

                                                <Info
                                                    label="Official Email"
                                                    value={
                                                        selectedEmployee.official_email
                                                    }
                                                />

                                                <div>

                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                                        Portal Status
                                                    </p>

                                                    {selectedEmployeeHasActivePortal ? (

                                                        <span className="mt-2 inline-block border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                                            Portal Active
                                                        </span>

                                                    ) : (

                                                        <span className="mt-2 inline-block border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                                            No Active Portal Account
                                                        </span>

                                                    )}

                                                </div>

                                            </div>

                                            {!selectedEmployeeHasActivePortal && (

                                                <div className="mt-4 border border-orange-300 bg-orange-50 p-4">

                                                    <p className="text-sm font-bold text-orange-800">
                                                        Employee has no active Portal account
                                                    </p>

                                                    <p className="mt-1 text-sm leading-6 text-orange-700">
                                                        The task can still be created and assigned.
                                                        The employee will not receive a Portal
                                                        notification until an active Portal account
                                                        is linked.
                                                    </p>

                                                </div>

                                            )}

                                        </>

                                    )}

                                </>

                            ) : (

                                /* ===================== */
                                /* MANUAL EMPLOYEE       */
                                /* ===================== */

                                <div className="border border-[#d4af37] bg-[#fffbea] p-5">

                                    <div className="mb-5">

                                        <p className="font-bold text-gray-900">
                                            Manual / Unregistered Employee
                                        </p>

                                        <p className="mt-1 text-sm text-gray-600">
                                            Enter the employee information only for this
                                            IT Support task. No Inventory user and no
                                            Portal user will be created.
                                        </p>

                                    </div>

                                    <div className="grid gap-5 md:grid-cols-2">

                                        <div>

                                            <label className={labelClass}>
                                                Employee ID *
                                            </label>

                                            <input
                                                required
                                                type="text"
                                                value={
                                                    manualEmployeeId
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setManualEmployeeId(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Employee ID"
                                                className={inputClass}
                                            />

                                        </div>

                                        <div>

                                            <label className={labelClass}>
                                                Full Name *
                                            </label>

                                            <input
                                                required
                                                type="text"
                                                value={
                                                    manualEmployeeName
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setManualEmployeeName(
                                                        event.target.value
                                                    )
                                                }
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
                                                    manualEmployeeDesignation
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setManualEmployeeDesignation(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Example: Executive"
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
                                                    manualEmployeeDepartment
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setManualEmployeeDepartment(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Example: Dyeing"
                                                className={inputClass}
                                            />

                                        </div>

                                        <div>

                                            <label className={labelClass}>
                                                Location
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    manualEmployeeLocation
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setManualEmployeeLocation(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Floor / Building / Office"
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
                                                    manualEmployeeMobile
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setManualEmployeeMobile(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Mobile number"
                                                className={inputClass}
                                            />

                                        </div>

                                    </div>

                                    <div className="mt-5 border border-orange-300 bg-orange-50 p-4">

                                        <p className="text-sm font-bold text-orange-800">
                                            Manual requester only
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-orange-700">
                                            These details will be stored with this ticket only.
                                            The employee will not be added to Inventory and
                                            will not receive Portal notifications.
                                        </p>

                                    </div>

                                </div>

                            )}

                        </section>

                        {/* ========================= */}
                        {/* RELATED DEVICE            */}
                        {/* ========================= */}

                        <section className="border-b border-gray-200 p-6">

                            <div className="mb-5">

                                <h3 className="text-lg font-bold text-gray-900">
                                    2. Related Device
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    Optional. Inventory devices are available only
                                    for an existing Inventory employee.
                                </p>

                            </div>

                            {manualRequester ? (

                                <div className="max-w-2xl border border-gray-200 bg-gray-50 p-4">

                                    <p className="text-sm font-semibold text-gray-700">
                                        General IT Support / No Inventory Device
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Manual employees are not linked to Inventory,
                                        so a device cannot be selected from the
                                        Inventory list.
                                    </p>

                                </div>

                            ) : (

                                <div className="max-w-2xl">

                                    <label className={labelClass}>
                                        Device
                                    </label>

                                    <select
                                        value={
                                            assetId
                                        }
                                        disabled={
                                            !inventoryUserId ||
                                            assetLoading
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setAssetId(
                                                event.target.value
                                            )
                                        }
                                        className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
                                    >

                                        <option value="">

                                            {assetLoading
                                                ? "Loading devices..."
                                                : "General IT Support / No Device"}

                                        </option>

                                        {assets.map(
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

                                                    {asset.category_name ||
                                                        "Device"}

                                                    {asset.brand
                                                        ? ` - ${asset.brand}`
                                                        : ""}

                                                    {asset.model
                                                        ? ` ${asset.model}`
                                                        : ""}

                                                    {asset.is_primary_computer
                                                        ? " [Primary]"
                                                        : ""}
                                                </option>

                                            )
                                        )}

                                    </select>

                                    {inventoryUserId &&
                                        !assetLoading &&
                                        assets.length ===
                                        0 && (

                                            <p className="mt-2 text-xs text-orange-700">
                                                No active Inventory device is assigned
                                                to this employee. You can still create
                                                a General IT Support task.
                                            </p>

                                        )}

                                </div>

                            )}

                        </section>

                        {/* ========================= */}
                        {/* TASK INFORMATION          */}
                        {/* ========================= */}

                        <section className="border-b border-gray-200 p-6">

                            <div className="mb-5">

                                <h3 className="text-lg font-bold text-gray-900">
                                    3. Task Information
                                </h3>

                            </div>

                            <div className="grid gap-5 lg:grid-cols-2">

                                <div className="lg:col-span-2">

                                    <label className={labelClass}>
                                        Subject *
                                    </label>

                                    <input
                                        required
                                        maxLength={
                                            250
                                        }
                                        value={
                                            subject
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSubject(
                                                event.target.value
                                            )
                                        }
                                        placeholder={
                                            manualRequester
                                                ? "Example: PC setup / email support / network issue"
                                                : "Example: Desktop not connecting to network"
                                        }
                                        className={inputClass}
                                    />

                                </div>

                                <div>

                                    <label className={labelClass}>
                                        Issue Category
                                    </label>

                                    <input
                                        value={
                                            issueCategory
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setIssueCategory(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Hardware / Software / Network / New Join Setup..."
                                        className={inputClass}
                                    />

                                </div>

                                <div>

                                    <label className={labelClass}>
                                        Priority *
                                    </label>

                                    <select
                                        value={
                                            priority
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setPriority(
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    >

                                        <option value="LOW">
                                            Low
                                        </option>

                                        <option value="NORMAL">
                                            Normal
                                        </option>

                                        <option value="MEDIUM">
                                            Medium
                                        </option>

                                        <option value="HIGH">
                                            High
                                        </option>

                                        <option value="CRITICAL">
                                            Critical
                                        </option>

                                    </select>

                                </div>

                                <div className="lg:col-span-2">

                                    <label className={labelClass}>
                                        Problem / Task Description *
                                    </label>

                                    <textarea
                                        required
                                        rows={
                                            7
                                        }
                                        value={
                                            problemDescription
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setProblemDescription(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Describe the issue, setup requirement or work instruction..."
                                        className="w-full resize-y border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-[#d4af37]"
                                    />

                                </div>

                            </div>

                        </section>

                        {/* ========================= */}
                        {/* ASSIGN ENGINEER + TNA     */}
                        {/* ========================= */}

                        <section className="p-6">

                            <div className="mb-5">

                                <h3 className="text-lg font-bold text-gray-900">
                                    4. Assign IT Engineer & TNA
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    Leave Engineer blank to create the task as OPEN.
                                    When an Engineer is selected, TNA Date & Time is required.
                                </p>

                            </div>

                            <div className="max-w-2xl">

                                {/* ENGINEER */}

                                <div>

                                    <label className={labelClass}>
                                        IT Support Engineer
                                    </label>

                                    <select
                                        value={
                                            assignedTo
                                        }
                                        onChange={(
                                            event
                                        ) => {

                                            const value =
                                                event.target.value;

                                            setAssignedTo(
                                                value
                                            );

                                            if (
                                                !value
                                            ) {
                                                setTnaAt(
                                                    ""
                                                );
                                            }

                                        }}
                                        className={inputClass}
                                    >

                                        <option value="">
                                            Do not assign now — keep OPEN
                                        </option>

                                        {staff.map(
                                            (
                                                member
                                            ) => (

                                                <option
                                                    key={
                                                        member.portal_user_id
                                                    }
                                                    value={
                                                        member.portal_user_id
                                                    }
                                                >
                                                    {member.employee_id
                                                        ? `${member.employee_id} - `
                                                        : ""}

                                                    {member.full_name}

                                                    {member.staff_title
                                                        ? ` - ${member.staff_title}`
                                                        : member.designation
                                                            ? ` - ${member.designation}`
                                                            : ""}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                                {/* TNA */}

                                {assignedTo && (

                                    <div className="mt-5 border border-[#e4d08b] bg-[#fffbea] p-5">

                                        <label className={labelClass}>
                                            TNA - Date & Time *
                                        </label>

                                        <input
                                            required
                                            type="datetime-local"
                                            value={
                                                tnaAt
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setTnaAt(
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />

                                        <p className="mt-2 text-xs leading-5 text-gray-600">
                                            Required when an IT Engineer is assigned.
                                            The Engineer will see this TNA in the
                                            IT Engineer Workbench.
                                        </p>

                                    </div>

                                )}

                                {/* STATUS */}

                                <div className="mt-4 border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">

                                    {assignedTo ? (

                                        <>

                                            Task status:
                                            {" "}

                                            <strong className="text-blue-700">
                                                ASSIGNED
                                            </strong>

                                            .

                                            {tnaAt ? (

                                                <>
                                                    {" "}
                                                    Engineer will receive the task
                                                    notification with TNA.
                                                </>

                                            ) : (

                                                <>
                                                    {" "}
                                                    Please select TNA Date & Time.
                                                </>

                                            )}

                                        </>

                                    ) : (

                                        <>

                                            Task status:
                                            {" "}

                                            <strong className="text-orange-700">
                                                OPEN
                                            </strong>

                                            .
                                            Admin can assign an Engineer and TNA later.

                                        </>

                                    )}

                                </div>

                            </div>

                        </section>

                        {/* ========================= */}
                        {/* SUBMIT                    */}
                        {/* ========================= */}

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-5">

                            <div className="text-xs text-gray-500">

                                {manualRequester ? (

                                    <p className="font-semibold text-orange-700">
                                        Manual employee details will be saved only
                                        with this ticket. No Inventory user will
                                        be created.
                                    </p>

                                ) : selectedEmployeeHasActivePortal ? (

                                    <p>
                                        Employee will receive a Portal notification.
                                    </p>

                                ) : selectedEmployee ? (

                                    <p className="font-semibold text-orange-700">
                                        Employee notification unavailable —
                                        no active Portal account.
                                    </p>

                                ) : (

                                    <p>
                                        Select an existing Employee or use
                                        Manual / Unregistered Employee.
                                    </p>

                                )}

                            </div>

                            <div className="flex gap-3">

                                <Link
                                    href="/admin/support"
                                    className="border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:border-[#d4af37]"
                                >
                                    Cancel
                                </Link>

                                <button
                                    type="submit"
                                    disabled={
                                        submitting ||
                                        loading ||
                                        (
                                            Boolean(
                                                assignedTo
                                            ) &&
                                            !tnaAt
                                        )
                                    }
                                    className="bg-[#d4af37] px-7 py-3 text-sm font-bold text-black transition hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    {submitting
                                        ? "Creating..."
                                        : manualRequester
                                            ? assignedTo
                                                ? "Create & Assign Manual Task"
                                                : "Create Manual IT Support Task"
                                            : assignedTo
                                                ? "Create & Assign Task"
                                                : "Create IT Support Task"}

                                </button>

                            </div>

                        </div>

                    </form>

                )}

            </div>

        </main>
    );
}

// ==========================================
// INFO COMPONENT
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

            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {label}
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
                {value ||
                    "—"}
            </p>

        </div>
    );
}