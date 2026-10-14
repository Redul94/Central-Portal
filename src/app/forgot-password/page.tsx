import Link from "next/link";

export default function ForgotPasswordPage() {
    return (
        <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white border border-gray-200 shadow-md">
                    {/* Header */}
                    <div className="bg-[#111111] border-b-[3px] border-[#d4af37] px-8 py-6">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-white">
                            Forgot Password
                        </h1>

                        <p className="mt-1 text-sm text-gray-400">
                            Central Portal Account Recovery
                        </p>
                    </div>

                    {/* Form */}
                    <div className="px-8 py-8">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Reset Your Password
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                            Enter your Employee ID or official email address.
                        </p>

                        <form className="mt-7 space-y-5">
                            <div>
                                <label
                                    htmlFor="account"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Employee ID or Official Email
                                </label>

                                <input
                                    id="account"
                                    name="account"
                                    type="text"
                                    placeholder="Employee ID or email"
                                    className="w-full border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[#d4af37] px-4 py-3 font-bold text-black transition hover:bg-[#b99625]"
                            >
                                Send Reset Link
                            </button>
                        </form>

                        <div className="mt-7 border-t border-gray-200 pt-5 text-center">
                            <Link
                                href="/login"
                                className="text-sm font-semibold text-[#a88718] hover:underline"
                            >
                                ← Back to Login
                            </Link>
                        </div>
                    </div>
                </div>

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