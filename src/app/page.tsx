import Link from "next/link";
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth";
import NotificationBell from "@/components/notification-bell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "auko_session"
    )?.value;

  const session =
    token
      ? await verifySessionToken(
        token
      )
      : null;

  return (
    <main className="min-h-screen bg-[#f4f4f4]">

      {/* ================================= */}
      {/* HEADER                            */}
      {/* ================================= */}

      <header className="relative z-40 border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-5">

          {/* LEFT */}

          <div>

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
              Auko-Tex Group
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Central Portal
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Centralized Internal Management System
            </p>

          </div>

          {/* ================================= */}
          {/* RIGHT SIDE                        */}
          {/* ================================= */}

          {!session ? (

            <Link
              href="/login"
              className="rounded-lg bg-[#f4b400] px-6 py-3 font-bold text-black transition hover:bg-[#d4af37]"
            >
              Login
            </Link>

          ) : (

            <div className="flex items-center gap-4">

              {/* ================================= */}
              {/* USER / PROFILE LINK               */}
              {/* ================================= */}

              <Link
                href="/profile"
                title="My Profile"
                className="group hidden text-right sm:block"
              >

                <p className="font-semibold text-white transition group-hover:text-[#d4af37]">
                  {session.fullName}
                </p>

                <p className="mt-1 text-xs text-gray-400 transition group-hover:text-gray-300">
                  {session.employeeId}
                  {" • "}
                  {session.role}
                </p>

              </Link>

              {/* NOTIFICATION */}

              <NotificationBell />

              {/* LOGOUT */}

              <form
                action="/api/logout"
                method="POST"
              >
                <button
                  type="submit"
                  className="h-11 rounded-lg border border-[#d4af37] px-5 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
                >
                  Logout
                </button>
              </form>

            </div>

          )}

        </div>

        {/* ================================= */}
        {/* MOBILE USER INFO / PROFILE LINK   */}
        {/* ================================= */}

        {session && (

          <div className="border-t border-gray-800 px-6 py-2 sm:hidden">

            <div className="mx-auto max-w-6xl">

              <Link
                href="/profile"
                title="My Profile"
                className="group block"
              >

                <p className="text-sm font-semibold text-white transition group-hover:text-[#d4af37]">
                  {session.fullName}
                </p>

                <p className="mt-1 text-xs text-gray-400 transition group-hover:text-gray-300">
                  {session.employeeId}
                  {" • "}
                  {session.role}
                </p>

              </Link>

            </div>

          </div>

        )}

      </header>

      {/* ================================= */}
      {/* CONTENT                           */}
      {/* ================================= */}

      <div className="mx-auto max-w-6xl px-8 py-12">

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Central Portal
          </h2>

          {session ? (

            <p className="mt-2 text-gray-600">
              Welcome, {session.fullName}. Select a module to continue.
            </p>

          ) : (

            <p className="mt-2 text-gray-600">
              Select a module to continue.
            </p>

          )}

        </div>

        {/* ================================= */}
        {/* MODULES                           */}
        {/* ================================= */}

        <div className="grid gap-6 md:grid-cols-3">

          {/* MACHINERY */}

          <Link
            href="/machinery"
            className="group rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-md"
          >

            <h3 className="text-xl font-bold text-gray-900">
              Machinery Management
            </h3>

            <p className="mt-3 text-gray-600">
              Access and monitor machine servers.
            </p>

            <p className="mt-7 font-semibold text-[#d89500]">
              Open Module →
            </p>

          </Link>

          {/* MEETING */}

          <Link
            href={
              session
                ? "/meeting"
                : "/login"
            }
            className="group rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-md"
          >

            <h3 className="text-xl font-bold text-gray-900">
              Meeting Management
            </h3>

            <p className="mt-3 text-gray-600">
              Check meeting room availability and booking requests.
            </p>

            <p className="mt-7 font-semibold text-[#d89500]">
              Open Module →
            </p>

          </Link>

          {/* INVENTORY */}

          <Link
            href={
              session
                ? "/inventory"
                : "/login"
            }
            className="group rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-md"
          >

            <h3 className="text-xl font-bold text-gray-900">
              IT Inventory
            </h3>

            <p className="mt-3 text-gray-600">
              View assigned IT assets, warranty and service information.
            </p>

            <p className="mt-7 font-semibold text-[#d89500]">
              Open Module →
            </p>

          </Link>

          {/* IT SUPPORT */}

          <Link
            href={
              session
                ? "/support"
                : "/login"
            }
            className="group rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-md"
          >

            <h3 className="text-xl font-bold text-gray-900">
              IT Support
            </h3>

            <p className="mt-3 text-gray-600">
              Submit IT problems, track support progress and communicate with IT.
            </p>

            <p className="mt-7 font-semibold text-[#d89500]">
              Open Module →
            </p>

          </Link>

          {/* IT ENGINEER WORKBENCH */}

          {session && (

            <Link
              href="/support/assigned"
              className="group rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37] hover:shadow-md"
            >

              <h3 className="text-xl font-bold text-gray-900">
                IT Engineer Workbench
              </h3>

              <p className="mt-3 text-gray-600">
                View assigned support tickets and update IT work status.
              </p>

              <p className="mt-7 font-semibold text-[#d89500]">
                Open Workbench →
              </p>

            </Link>

          )}

        </div>

        {/* ================================= */}
        {/* ADMIN                             */}
        {/* ================================= */}

        {session &&
          (
            session.role ===
            "ADMIN" ||
            session.role ===
            "SUPER_ADMIN"
          ) && (

            <div className="mt-8 flex flex-wrap gap-3">

              <Link
                href="/admin"
                className="inline-flex items-center bg-[#111111] px-6 py-3 font-semibold text-white transition hover:bg-[#252525]"
              >
                Admin Panel →
              </Link>

              <Link
                href="/admin/support"
                className="inline-flex items-center border border-[#d4af37] bg-[#fff8df] px-6 py-3 font-semibold text-gray-900 transition hover:bg-[#f6e6a7]"
              >
                IT Support Management →
              </Link>

            </div>

          )}

      </div>

    </main>
  );
}