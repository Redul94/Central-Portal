"use client";

import Link from "next/link";
import {
    FormEvent,
    useState,
} from "react";

type RegisterForm = {
    employeeId: string;
    fullName: string;
    department: string;
    designation: string;
    officialEmail: string;
    password: string;
    confirmPassword: string;
};

const initialForm: RegisterForm = {
    employeeId: "",
    fullName: "",
    department: "",
    designation: "",
    officialEmail: "",
    password: "",
    confirmPassword: "",
};

export default function RegisterPage() {
    const [form, setForm] =
        useState<RegisterForm>(
            initialForm
        );

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [success, setSuccess] =
        useState(false);

    function updateField(
        field: keyof RegisterForm,
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        // Clear previous message
        // when user starts editing again
        if (message) {
            setMessage("");
            setSuccess(false);
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setMessage("");
        setSuccess(false);

        // --------------------------------
        // VALIDATION
        // --------------------------------

        if (
            !form.employeeId.trim() ||
            !form.fullName.trim() ||
            !form.department.trim() ||
            !form.designation.trim() ||
            !form.officialEmail.trim() ||
            !form.password ||
            !form.confirmPassword
        ) {
            setMessage(
                "Please complete all required fields."
            );
            return;
        }

        if (
            form.password.length < 8
        ) {
            setMessage(
                "Password must be at least 8 characters."
            );
            return;
        }

        if (
            form.password !==
            form.confirmPassword
        ) {
            setMessage(
                "Passwords do not match."
            );
            return;
        }

        setLoading(true);

        const data = {
            employeeId:
                form.employeeId.trim(),

            fullName:
                form.fullName.trim(),

            department:
                form.department.trim(),

            designation:
                form.designation.trim(),

            officialEmail:
                form.officialEmail
                    .trim()
                    .toLowerCase(),

            password:
                form.password,
        };

        try {
            const response =
                await fetch(
                    "/api/register",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                data
                            ),
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                setMessage(
                    result.message ||
                    "Registration failed."
                );

                return;
            }

            setSuccess(true);

            setMessage(
                result.message ||
                "Registration submitted successfully. Please wait for Admin approval."
            );
            window.alert(
                "Registration Successful!\n\n" +
                "Your account has been submitted for Admin approval.\n\n" +
                "You will be able to login after your account is approved."
            );
            // Reset only after
            // successful registration
            setForm(initialForm);

        } catch (error) {
            console.error(
                "Registration error:",
                error
            );

            setMessage(
                "Unable to connect to the registration service."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f4f4] px-4 py-10">

            <div className="w-full max-w-2xl">

                <div className="border border-gray-200 bg-white shadow-md">

                    {/* HEADER */}

                    <div className="border-b-[3px] border-[#d4af37] bg-[#111111] px-8 py-6">

                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-white">
                            Create Account
                        </h1>

                        <p className="mt-1 text-sm text-gray-400">
                            Central Portal Registration
                        </p>

                    </div>

                    {/* CONTENT */}

                    <div className="px-8 py-8">

                        <h2 className="text-2xl font-bold text-gray-900">
                            Employee Registration
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                            Your account requires Admin approval before login.
                        </p>

                        {/* MESSAGE */}

                        {message && (
                            <div
                                className={`mt-5 border px-4 py-3 text-sm font-medium ${success
                                    ? "border-green-300 bg-green-50 text-green-700"
                                    : "border-red-300 bg-red-50 text-red-700"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        {/* FORM */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            autoComplete="off"
                            className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2"
                        >

                            {/* EMPLOYEE ID */}

                            <div>

                                <label
                                    htmlFor="employeeId"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Employee ID
                                </label>

                                <input
                                    id="employeeId"
                                    name="employeeId"
                                    type="text"
                                    required
                                    autoComplete="off"
                                    value={
                                        form.employeeId
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "employeeId",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter Employee ID"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* FULL NAME */}

                            <div>

                                <label
                                    htmlFor="fullName"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Full Name
                                </label>

                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    autoComplete="name"
                                    value={
                                        form.fullName
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "fullName",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter Full Name"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* DEPARTMENT */}

                            <div>

                                <label
                                    htmlFor="department"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Department
                                </label>

                                <input
                                    id="department"
                                    name="department"
                                    type="text"
                                    required
                                    autoComplete="off"
                                    value={
                                        form.department
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "department",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter Department"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* DESIGNATION */}

                            <div>

                                <label
                                    htmlFor="designation"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Designation
                                </label>

                                <input
                                    id="designation"
                                    name="designation"
                                    type="text"
                                    required
                                    autoComplete="off"
                                    value={
                                        form.designation
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "designation",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter Designation"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* EMAIL */}

                            <div className="md:col-span-2">

                                <label
                                    htmlFor="officialEmail"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Official Email
                                </label>

                                <input
                                    id="officialEmail"
                                    name="officialEmail"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={
                                        form.officialEmail
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "officialEmail",
                                            event.target.value
                                        )
                                    }
                                    placeholder="example@auko-texgroup.com"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* PASSWORD */}

                            <div>

                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Password
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={
                                        form.password
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "password",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Minimum 8 characters"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* CONFIRM PASSWORD */}

                            <div>

                                <label
                                    htmlFor="confirmPassword"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Confirm Password
                                </label>

                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={
                                        form.confirmPassword
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "confirmPassword",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Confirm Password"
                                    className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />

                            </div>

                            {/* SUBMIT */}

                            <div className="md:col-span-2">

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#d4af37] px-4 py-3 font-bold text-black transition hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading
                                        ? "Submitting..."
                                        : "Submit Registration"}
                                </button>

                            </div>

                        </form>

                        {/* LOGIN */}

                        <div className="mt-7 border-t border-gray-200 pt-5 text-center">

                            <p className="text-sm text-gray-600">

                                Already have an account?{" "}

                                <Link
                                    href="/login"
                                    className="font-semibold text-[#a88718] hover:underline"
                                >
                                    Login
                                </Link>

                            </p>

                        </div>

                    </div>

                </div>

                {/* BACK */}

                <div className="mt-5 text-center">

                    <Link
                        href="/"
                        className="text-sm font-semibold text-gray-500 hover:text-[#a88718]"
                    >
                        ← Back to Central Portal
                    </Link>

                </div>

            </div>

        </main>
    );
}