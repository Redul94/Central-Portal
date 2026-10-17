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

  const isAdmin =
    session &&
    (
      session.role === "ADMIN" ||
      session.role === "SUPER_ADMIN"
    );

  return (
    <main className="min-h-screen bg-[#f4f4f4]">

      {/* ================================= */}
      {/* HEADER                            */}
      {/* ================================= */}

      <header className="relative z-40 border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

        <div
          className="
                        mx-auto
                        flex
                        max-w-6xl
                        flex-col
                        gap-4
                        px-4
                        py-5

                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        sm:px-6

                        lg:px-8
                    "
        >

          {/* LEFT */}

          <div className="min-w-0">

            <p
              className="
                                text-xs
                                font-semibold
                                uppercase
                                tracking-[0.20em]
                                text-[#d4af37]

                                sm:text-sm
                                sm:tracking-[0.25em]
                            "
            >
              Auko-Tex Group
            </p>

            <h1
              className="
                                mt-1
                                text-xl
                                font-bold

                                sm:text-2xl
                            "
            >
              Central Portal
            </h1>

            <p
              className="
                                mt-1
                                text-xs
                                leading-5
                                text-gray-400

                                sm:text-sm
                            "
            >
              Centralized Internal Management System
            </p>

          </div>

          {/* ================================= */}
          {/* RIGHT SIDE                        */}
          {/* ================================= */}

          {!session ? (

            <Link
              href="/login"
              className="
                                inline-flex
                                min-h-11
                                w-full
                                items-center
                                justify-center
                                rounded-lg
                                bg-[#f4b400]
                                px-6
                                py-3
                                font-bold
                                text-black
                                transition
                                hover:bg-[#d4af37]

                                sm:w-auto
                            "
            >
              Login
            </Link>

          ) : (

            <div
              className="
                                flex
                                w-full
                                items-center
                                justify-between
                                gap-3

                                sm:w-auto
                                sm:justify-end
                                sm:gap-4
                            "
            >

              {/* ================================= */}
              {/* DESKTOP USER / PROFILE LINK       */}
              {/* ================================= */}

              <Link
                href="/profile"
                title="My Profile"
                className="
                                    group
                                    hidden
                                    min-w-0
                                    text-right

                                    md:block
                                "
              >

                <p
                  className="
                                        max-w-[220px]
                                        truncate
                                        font-semibold
                                        text-white
                                        transition
                                        group-hover:text-[#d4af37]
                                    "
                >
                  {session.fullName}
                </p>

                <p
                  className="
                                        mt-1
                                        text-xs
                                        text-gray-400
                                        transition
                                        group-hover:text-gray-300
                                    "
                >
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
                className="shrink-0"
              >
                <button
                  type="submit"
                  className="
                                        min-h-11
                                        rounded-lg
                                        border
                                        border-[#d4af37]
                                        px-4
                                        text-sm
                                        font-semibold
                                        text-[#d4af37]
                                        transition
                                        hover:bg-[#d4af37]
                                        hover:text-black

                                        sm:px-5
                                    "
                >
                  Logout
                </button>
              </form>

            </div>

          )}

        </div>

        {/* ================================= */}
        {/* MOBILE / TABLET USER INFO         */}
        {/* ================================= */}

        {session && (

          <div className="border-t border-gray-800 md:hidden">

            <div
              className="
                                mx-auto
                                max-w-6xl
                                px-4
                                py-3

                                sm:px-6
                            "
            >

              <Link
                href="/profile"
                title="My Profile"
                className="group block"
              >

                <p
                  className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-white
                                        transition
                                        group-hover:text-[#d4af37]
                                    "
                >
                  {session.fullName}
                </p>

                <p
                  className="
                                        mt-1
                                        text-xs
                                        text-gray-400
                                        transition
                                        group-hover:text-gray-300
                                    "
                >
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

      <div
        className="
                    mx-auto
                    w-full
                    max-w-6xl
                    px-4
                    py-8

                    sm:px-6
                    sm:py-10

                    lg:px-8
                    lg:py-12
                "
      >

        {/* TITLE */}

        <div className="mb-7 sm:mb-8">

          <h2
            className="
                            text-2xl
                            font-bold
                            text-gray-900

                            sm:text-3xl
                        "
          >
            Central Portal
          </h2>

          <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

          {session ? (

            <p
              className="
                                mt-3
                                text-sm
                                leading-6
                                text-gray-600

                                sm:text-base
                            "
            >
              Welcome,{" "}
              <span className="font-semibold text-gray-800">
                {session.fullName}
              </span>
              . Select a module to continue.
            </p>

          ) : (

            <p
              className="
                                mt-3
                                text-sm
                                leading-6
                                text-gray-600

                                sm:text-base
                            "
            >
              Select a module to continue.
            </p>

          )}

        </div>

        {/* ================================= */}
        {/* MODULES                           */}
        {/* ================================= */}

        <div
          className="
                        grid
                        grid-cols-1
                        gap-4

                        sm:grid-cols-2
                        sm:gap-5

                        xl:grid-cols-3
                        xl:gap-6
                    "
        >

          {/* MACHINERY */}

          <Link
            href="/machinery"
            className="
                            group
                            flex
                            min-h-[210px]
                            flex-col
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-5
                            shadow-sm
                            transition

                            hover:-translate-y-1
                            hover:border-[#d4af37]
                            hover:shadow-md

                            sm:p-6

                            lg:p-7
                        "
          >

            <h3
              className="
                                text-lg
                                font-bold
                                text-gray-900

                                sm:text-xl
                            "
            >
              Machinery Management
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              Access and monitor machine servers.
            </p>

            <p className="mt-auto pt-6 font-semibold text-[#d89500]">
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
            className="
                            group
                            flex
                            min-h-[210px]
                            flex-col
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-5
                            shadow-sm
                            transition

                            hover:-translate-y-1
                            hover:border-[#d4af37]
                            hover:shadow-md

                            sm:p-6

                            lg:p-7
                        "
          >

            <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
              Meeting Management
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              Check meeting room availability and booking requests.
            </p>

            <p className="mt-auto pt-6 font-semibold text-[#d89500]">
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
            className="
                            group
                            flex
                            min-h-[210px]
                            flex-col
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-5
                            shadow-sm
                            transition

                            hover:-translate-y-1
                            hover:border-[#d4af37]
                            hover:shadow-md

                            sm:p-6

                            lg:p-7
                        "
          >

            <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
              IT Inventory
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              View assigned IT assets, warranty and service information.
            </p>

            <p className="mt-auto pt-6 font-semibold text-[#d89500]">
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
            className="
                            group
                            flex
                            min-h-[210px]
                            flex-col
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            p-5
                            shadow-sm
                            transition

                            hover:-translate-y-1
                            hover:border-[#d4af37]
                            hover:shadow-md

                            sm:p-6

                            lg:p-7
                        "
          >

            <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
              IT Support
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              Submit IT problems, track support progress and communicate with IT.
            </p>

            <p className="mt-auto pt-6 font-semibold text-[#d89500]">
              Open Module →
            </p>

          </Link>

          {/* IT ENGINEER WORKBENCH */}

          {session && (

            <Link
              href="/support/assigned"
              className="
                                group
                                flex
                                min-h-[210px]
                                flex-col
                                rounded-xl
                                border
                                border-gray-200
                                bg-white
                                p-5
                                shadow-sm
                                transition

                                hover:-translate-y-1
                                hover:border-[#d4af37]
                                hover:shadow-md

                                sm:p-6

                                lg:p-7
                            "
            >

              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                IT Engineer Workbench
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
                View assigned support tickets and update IT work status.
              </p>

              <p className="mt-auto pt-6 font-semibold text-[#d89500]">
                Open Workbench →
              </p>

            </Link>

          )}

        </div>

        {/* ================================= */}
        {/* ADMIN                             */}
        {/* ================================= */}

        {isAdmin && (

          <div
            className="
                            mt-7
                            flex
                            flex-col
                            gap-3

                            sm:mt-8
                            sm:flex-row
                            sm:flex-wrap
                        "
          >

            <Link
              href="/admin"
              className="
                                inline-flex
                                min-h-12
                                w-full
                                items-center
                                justify-center
                                bg-[#111111]
                                px-6
                                py-3
                                text-center
                                font-semibold
                                text-white
                                transition
                                hover:bg-[#252525]

                                sm:w-auto
                            "
            >
              Admin Panel →
            </Link>

            <Link
              href="/admin/support"
              className="
                                inline-flex
                                min-h-12
                                w-full
                                items-center
                                justify-center
                                border
                                border-[#d4af37]
                                bg-[#fff8df]
                                px-6
                                py-3
                                text-center
                                font-semibold
                                text-gray-900
                                transition
                                hover:bg-[#f6e6a7]

                                sm:w-auto
                            "
            >
              IT Support Management →
            </Link>

          </div>

        )}

      </div>

    </main>
  );
}