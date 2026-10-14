"use client";

import Link from "next/link";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import PortalHeader from "@/components/portal-header";

// ==========================================
// TYPES
// ==========================================

type Profile = {
    portal_user_id: number;

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

    official_email:
    | string
    | null;

    role: string;

    account_status: string;

    inventory_user_id:
    | number
    | null;

    mobile_no:
    | string
    | null;

    user_location:
    | string
    | null;
};

type ProfileResponse = {
    success: boolean;

    message?: string;

    profile?: Profile;
};

// ==========================================
// PAGE
// ==========================================

export default function ProfilePage() {

    // ======================================
    // PROFILE
    // ======================================

    const [
        profile,
        setProfile,
    ] =
        useState<
            Profile |
            null
        >(null);

    const [
        originalProfile,
        setOriginalProfile,
    ] =
        useState<
            Profile |
            null
        >(null);

    // ======================================
    // EDITABLE FIELDS
    // ======================================

    const [
        employeeId,
        setEmployeeId,
    ] =
        useState("");

    const [
        fullName,
        setFullName,
    ] =
        useState("");

    const [
        designation,
        setDesignation,
    ] =
        useState("");

    const [
        department,
        setDepartment,
    ] =
        useState("");

    const [
        officialEmail,
        setOfficialEmail,
    ] =
        useState("");

    const [
        mobileNo,
        setMobileNo,
    ] =
        useState("");

    const [
        userLocation,
        setUserLocation,
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
        saving,
        setSaving,
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

    // ======================================
    // SET FORM VALUES
    // ======================================

    function applyProfile(
        data: Profile
    ) {

        setProfile(
            data
        );

        setEmployeeId(
            data.employee_id ||
            ""
        );

        setFullName(
            data.full_name ||
            ""
        );

        setDesignation(
            data.designation ||
            ""
        );

        setDepartment(
            data.department ||
            ""
        );

        setOfficialEmail(
            data.official_email ||
            ""
        );

        setMobileNo(
            data.mobile_no ||
            ""
        );

        setUserLocation(
            data.user_location ||
            ""
        );
    }

    // ======================================
    // LOAD PROFILE
    // ======================================

    useEffect(() => {

        async function loadProfile() {

            try {

                setLoading(
                    true
                );

                setMessage(
                    ""
                );

                const response =
                    await fetch(
                        "/api/profile",
                        {
                            cache:
                                "no-store",
                        }
                    );

                const data:
                    ProfileResponse =
                    await response.json();

                if (
                    !response.ok
                ) {

                    setSuccess(
                        false
                    );

                    setMessage(
                        data.message ||
                        "Unable to load profile."
                    );

                    return;
                }

                if (
                    !data.profile
                ) {

                    setSuccess(
                        false
                    );

                    setMessage(
                        "Profile information was not found."
                    );

                    return;
                }

                applyProfile(
                    data.profile
                );

                setOriginalProfile(
                    data.profile
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

        void loadProfile();

    }, []);

    // ======================================
    // RESET CHANGES
    // ======================================

    function resetChanges() {

        if (
            !originalProfile
        ) {
            return;
        }

        applyProfile(
            originalProfile
        );

        setSuccess(
            false
        );

        setMessage(
            ""
        );
    }

    // ======================================
    // SAVE PROFILE
    // ======================================

    async function saveProfile(
        event:
            FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        setMessage(
            ""
        );

        // ==================================
        // BASIC VALIDATION
        // ==================================

        if (
            !employeeId.trim()
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Employee ID is required."
            );

            return;
        }

        if (
            !fullName.trim()
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Full Name is required."
            );

            return;
        }

        if (
            !officialEmail.trim()
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Official Email is required."
            );

            return;
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(
                officialEmail.trim()
            )
        ) {

            setSuccess(
                false
            );

            setMessage(
                "Please enter a valid Official Email."
            );

            return;
        }

        try {

            setSaving(
                true
            );

            const response =
                await fetch(
                    "/api/profile",
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                employeeId:
                                    employeeId.trim(),

                                fullName:
                                    fullName.trim(),

                                designation:
                                    designation.trim(),

                                department:
                                    department.trim(),

                                officialEmail:
                                    officialEmail
                                        .trim()
                                        .toLowerCase(),

                                mobileNo:
                                    mobileNo.trim(),

                                userLocation:
                                    userLocation.trim(),
                            }),
                    }
                );

            const data:
                ProfileResponse =
                await response.json();

            if (
                !response.ok
            ) {

                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to update profile."
                );

                return;
            }

            if (
                data.profile
            ) {

                applyProfile(
                    data.profile
                );

                setOriginalProfile(
                    data.profile
                );

            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Profile updated successfully."
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

            setSaving(
                false
            );

        }
    }

    // ======================================
    // CHANGE DETECTION
    // ======================================

    const hasChanges =
        Boolean(
            originalProfile
        ) &&
        (
            employeeId.trim() !==
            (
                originalProfile?.employee_id ||
                ""
            ) ||

            fullName.trim() !==
            (
                originalProfile?.full_name ||
                ""
            ) ||

            designation.trim() !==
            (
                originalProfile?.designation ||
                ""
            ) ||

            department.trim() !==
            (
                originalProfile?.department ||
                ""
            ) ||

            officialEmail
                .trim()
                .toLowerCase() !==
            (
                originalProfile?.official_email ||
                ""
            )
                .trim()
                .toLowerCase() ||

            mobileNo.trim() !==
            (
                originalProfile?.mobile_no ||
                ""
            ) ||

            userLocation.trim() !==
            (
                originalProfile?.user_location ||
                ""
            )
        );

    const identityChanged =
        Boolean(
            originalProfile
        ) &&
        (
            employeeId.trim() !==
            (
                originalProfile?.employee_id ||
                ""
            ) ||

            officialEmail
                .trim()
                .toLowerCase() !==
            (
                originalProfile?.official_email ||
                ""
            )
                .trim()
                .toLowerCase()
        );

    // ======================================
    // STYLE
    // ======================================

    const inputClass =
        "h-12 w-full border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]";

    const labelClass =
        "mb-2 block text-sm font-bold text-gray-700";

    // ======================================
    // PAGE
    // ======================================

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            <PortalHeader
                title="My Profile"
                fullName={
                    profile?.full_name
                }
                employeeId={
                    profile?.employee_id
                }
                department={
                    profile?.department
                }
                role={
                    profile?.role
                }
                showHomeButton
                homeHref="/"
            />

            <div className="mx-auto max-w-[1100px] px-6 py-8">

                {/* ================================= */}
                {/* TITLE                             */}
                {/* ================================= */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Personal Information
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                            Review and update your personal and employment
                            information. Changes will also be reflected in
                            linked Inventory and IT Support records.
                        </p>

                    </div>

                    <Link
                        href="/"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#d4af37]"
                    >
                        ← Back to Home
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
                    </div>

                )}

                {/* ================================= */}
                {/* LOADING                           */}
                {/* ================================= */}

                {loading ? (

                    <div className="border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
                        Loading your profile...
                    </div>

                ) : !profile ? (

                    <div className="border border-red-300 bg-red-50 p-8 text-center text-red-700">
                        Unable to load profile information.
                    </div>

                ) : (

                    <form
                        onSubmit={
                            saveProfile
                        }
                        className="overflow-hidden border border-gray-200 bg-white shadow-sm"
                    >

                        {/* ========================= */}
                        {/* ACCOUNT SUMMARY           */}
                        {/* ========================= */}

                        <section className="border-b border-gray-200 bg-[#111111] px-6 py-5 text-white">

                            <div className="flex flex-wrap items-center justify-between gap-4">

                                <div>

                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                                        Portal Profile
                                    </p>

                                    <p className="mt-2 text-xl font-bold">
                                        {profile.full_name}
                                    </p>

                                    <p className="mt-1 text-sm text-gray-400">
                                        {profile.employee_id ||
                                            "No Employee ID"}

                                        {" • "}

                                        {profile.department ||
                                            "No Department"}
                                    </p>

                                </div>

                                <div className="flex flex-wrap gap-2">

                                    <span className="border border-[#d4af37] px-3 py-1 text-xs font-bold text-[#d4af37]">
                                        {profile.role}
                                    </span>

                                    <span className="border border-green-600 bg-green-950 px-3 py-1 text-xs font-bold text-green-300">
                                        {profile.account_status}
                                    </span>

                                </div>

                            </div>

                        </section>

                        {/* ========================= */}
                        {/* PERSONAL INFORMATION      */}
                        {/* ========================= */}

                        <section className="p-6">

                            <div className="mb-6">

                                <h3 className="text-lg font-bold text-gray-900">
                                    Profile Information
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    All fields below can be updated by you.
                                </p>

                            </div>

                            <div className="grid gap-6 md:grid-cols-2">

                                {/* EMPLOYEE ID */}

                                <div>

                                    <label className={labelClass}>
                                        Employee ID *
                                    </label>

                                    <input
                                        required
                                        type="text"
                                        maxLength={
                                            100
                                        }
                                        value={
                                            employeeId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setEmployeeId(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Employee ID"
                                        className={inputClass}
                                    />

                                </div>

                                {/* FULL NAME */}

                                <div>

                                    <label className={labelClass}>
                                        Full Name *
                                    </label>

                                    <input
                                        required
                                        type="text"
                                        maxLength={
                                            255
                                        }
                                        value={
                                            fullName
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setFullName(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Full Name"
                                        className={inputClass}
                                    />

                                </div>

                                {/* DESIGNATION */}

                                <div>

                                    <label className={labelClass}>
                                        Designation
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={
                                            255
                                        }
                                        value={
                                            designation
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDesignation(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Designation"
                                        className={inputClass}
                                    />

                                </div>

                                {/* DEPARTMENT */}

                                <div>

                                    <label className={labelClass}>
                                        Department
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={
                                            255
                                        }
                                        value={
                                            department
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setDepartment(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Department"
                                        className={inputClass}
                                    />

                                </div>

                                {/* OFFICIAL EMAIL */}

                                <div>

                                    <label className={labelClass}>
                                        Official Email *
                                    </label>

                                    <input
                                        required
                                        type="email"
                                        value={
                                            officialEmail
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setOfficialEmail(
                                                event.target.value
                                            )
                                        }
                                        placeholder="name@company.com"
                                        className={inputClass}
                                    />

                                </div>

                                {/* MOBILE */}

                                <div>

                                    <label className={labelClass}>
                                        Mobile No.
                                    </label>

                                    <input
                                        type="tel"
                                        maxLength={
                                            50
                                        }
                                        value={
                                            mobileNo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setMobileNo(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Example: 017XXXXXXXX"
                                        className={inputClass}
                                    />

                                </div>

                                {/* LOCATION */}

                                <div className="md:col-span-2">

                                    <label className={labelClass}>
                                        Location
                                    </label>

                                    <input
                                        type="text"
                                        maxLength={
                                            255
                                        }
                                        value={
                                            userLocation
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setUserLocation(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Example: Head Office - 3rd Floor / Factory - 6th Floor"
                                        className={inputClass}
                                    />

                                </div>

                            </div>

                            {/* ===================== */}
                            {/* IDENTITY WARNING      */}
                            {/* ===================== */}

                            {identityChanged && (

                                <div className="mt-6 border border-orange-300 bg-orange-50 p-4">

                                    <p className="text-sm font-bold text-orange-800">
                                        Employee ID or Official Email changed
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-orange-700">
                                        Please verify the information carefully before saving.
                                        The updated Employee ID and Official Email will become
                                        your current Portal profile information.
                                    </p>

                                </div>

                            )}

                            {/* ===================== */}
                            {/* INVENTORY LINK        */}
                            {/* ===================== */}

                            <div className="mt-6 border border-gray-200 bg-gray-50 p-4">

                                <div className="flex flex-wrap items-center justify-between gap-3">

                                    <div>

                                        <p className="text-sm font-bold text-gray-800">
                                            Inventory Profile
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            Your profile information is synchronized with
                                            the IT Inventory and IT Support system.
                                        </p>

                                    </div>

                                    {profile.inventory_user_id ? (

                                        <span className="border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                            Linked
                                        </span>

                                    ) : (

                                        <span className="border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                            Will Link on Save
                                        </span>

                                    )}

                                </div>

                            </div>

                        </section>

                        {/* ========================= */}
                        {/* SAVE                      */}
                        {/* ========================= */}

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-5">

                            <div>

                                {hasChanges ? (

                                    <p className="text-sm font-semibold text-orange-700">
                                        You have unsaved changes.
                                    </p>

                                ) : (

                                    <p className="text-sm text-gray-500">
                                        Your profile is up to date.
                                    </p>

                                )}

                            </div>

                            <div className="flex flex-wrap gap-3">

                                <button
                                    type="button"
                                    onClick={
                                        resetChanges
                                    }
                                    disabled={
                                        saving ||
                                        !hasChanges
                                    }
                                    className="border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-[#d4af37] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Reset Changes
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        !hasChanges
                                    }
                                    className="bg-[#d4af37] px-7 py-3 text-sm font-bold text-black transition hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    {saving
                                        ? "Saving..."
                                        : "Save Changes"}

                                </button>

                            </div>

                        </div>

                    </form>

                )}

            </div>

        </main>
    );
}