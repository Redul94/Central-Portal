"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const form =
      new FormData(event.currentTarget);

    const data = {
      employeeId: String(
        form.get("employeeId") || ""
      ),
      password: String(
        form.get("password") || ""
      ),
    };

    try {
      const response = await fetch(
        "/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setMessage(
          result.message ||
            "Login failed."
        );

        return;
      }

      router.push("/");
      router.refresh();

    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to connect to login service."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        <div className="bg-white shadow-md border border-gray-200">

          <div className="bg-[#111111] border-b-[3px] border-[#d4af37] px-8 py-6">

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
              Auko-Tex Group
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white">
              Central Portal
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Internal Management System
            </p>

          </div>

          <div className="px-8 py-8">

            <h2 className="text-2xl font-bold text-gray-900">
              Sign In
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Login using your Employee ID
              and password.
            </p>

            {message && (
              <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {message}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >

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
                  autoComplete="username"
                  placeholder="Enter Employee ID"
                  className="w-full border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                />

              </div>

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#a88718] hover:underline"
                  >
                    Forgot Password?
                  </Link>

                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter Password"
                  className="w-full border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                />

              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#d4af37] px-4 py-3 font-bold text-black transition hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Signing In..."
                  : "Login"}
              </button>

            </form>

            <div className="mt-7 border-t border-gray-200 pt-5 text-center">

              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}

                <Link
                  href="/register"
                  className="font-semibold text-[#a88718] hover:underline"
                >
                  Register
                </Link>

              </p>

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