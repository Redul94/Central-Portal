"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ResetPasswordForm({
    token,
}: {
    token: string;
}) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 12) {
            setError(
                "Password must contain at least 12 characters."
            );
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "/api/reset-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        password,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Password reset failed."
                );
            }

            setDone(true);
            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Request failed."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md bg-white border border-gray-200 shadow-md">

                {/* Header */}
                <div className="bg-[#111111] border-b-[3px] border-[#d4af37] px-8 py-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                        Auko-Tex Group
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-white">
                        Set New Password
                    </h1>
                </div>

                <div className="px-8 py-8">
                    {done ? (
                        <>
                            <p
                                role="status"
                                className="font-semibold text-green-800"
                            >
                                Password updated successfully.
                            </p>

                            <Link
                                href="/login"
                                className="mt-5 inline-block font-semibold text-[#a88718] hover:underline"
                            >
                                Go to Login →
                            </Link>
                        </>
                    ) : (
                        <>
                            <p className="mb-6 text-sm text-gray-600">
                                Enter a new password with at least
                                12 characters.
                            </p>

                            {!/^[a-f0-9]{64}$/.test(token) ? (
                                <p
                                    role="alert"
                                    className="text-red-700"
                                >
                                    Invalid reset link.
                                    Request a new one.
                                </p>
                            ) : (
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-5"
                                >
                                    <div>
                                        <label
                                            htmlFor="new-password"
                                            className="mb-2 block text-sm font-semibold text-gray-800"
                                        >
                                            New Password
                                        </label>

                                        <input
                                            id="new-password"
                                            type="password"
                                            minLength={12}
                                            maxLength={128}
                                            required
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(
                                                    e.target.value
                                                )
                                            }
                                            className="w-full border border-gray-300 px-4 py-3 text-gray-900 focus:border-[#d4af37] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="confirm-password"
                                            className="mb-2 block text-sm font-semibold text-gray-800"
                                        >
                                            Confirm New Password
                                        </label>

                                        <input
                                            id="confirm-password"
                                            type="password"
                                            minLength={12}
                                            maxLength={128}
                                            required
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(
                                                    e.target.value
                                                )
                                            }
                                            className="w-full border border-gray-300 px-4 py-3 text-gray-900 focus:border-[#d4af37] outline-none"
                                        />
                                    </div>

                                    {error && (
                                        <p
                                            role="alert"
                                            className="text-sm text-red-700"
                                        >
                                            {error}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#d4af37] px-4 py-3 font-bold text-black hover:bg-[#b99625] disabled:opacity-60"
                                    >
                                        {loading
                                            ? "Saving..."
                                            : "Reset Password"}
                                    </button>
                                </form>
                            )}

                            <Link
                                href="/forgot-password"
                                className="mt-6 inline-block text-sm font-semibold text-[#a88718] hover:underline"
                            >
                                Request another reset link
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}