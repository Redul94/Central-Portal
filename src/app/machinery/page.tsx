"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { machines } from "@/data/machines";

type MachineState =
    | "checking"
    | "online"
    | "offline"
    | "unavailable";

type StatusMap = Record<string, MachineState>;

type MachineStatusResponse = {
    checkedAt: string;
    statuses: StatusMap;
};

export default function MachineryPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [machineStatuses, setMachineStatuses] =
        useState<StatusMap>({});
    const [lastChecked, setLastChecked] = useState("");
    const [statusError, setStatusError] = useState(false);

    // ------------------------------------------------
    // LOAD MACHINE STATUS
    // ------------------------------------------------

    useEffect(() => {
        let isMounted = true;

        async function loadMachineStatuses() {
            try {
                setStatusError(false);

                const response = await fetch("/api/machine-status", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(
                        `Machine status request failed: ${response.status}`
                    );
                }

                const data: MachineStatusResponse =
                    await response.json();

                if (isMounted) {
                    setMachineStatuses(data.statuses);
                    setLastChecked(data.checkedAt);
                }
            } catch (error) {
                console.error(
                    "Unable to retrieve machine status:",
                    error
                );

                if (isMounted) {
                    setStatusError(true);
                }
            }
        }

        // Initial check
        loadMachineStatuses();

        // Refresh every 30 seconds
        const intervalId = window.setInterval(
            loadMachineStatuses,
            30000
        );

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

    // ------------------------------------------------
    // GET MACHINE STATUS
    // ------------------------------------------------

    const getMachineStatus = (
        machine: (typeof machines)[number]
    ): MachineState => {
        if (!machine.url.trim()) {
            return "unavailable";
        }

        return (
            machineStatuses[String(machine.id)] ??
            "checking"
        );
    };

    // ------------------------------------------------
    // COUNTS
    // ------------------------------------------------

    const onlineCount = machines.filter(
        (machine) =>
            getMachineStatus(machine) === "online"
    ).length;

    const offlineCount = machines.filter(
        (machine) =>
            getMachineStatus(machine) === "offline"
    ).length;

    const unavailableCount = machines.filter(
        (machine) =>
            getMachineStatus(machine) === "unavailable"
    ).length;

    // ------------------------------------------------
    // SEARCH
    // ------------------------------------------------

    const filteredMachines = machines.filter(
        (machine) => {
            const searchValue = searchTerm
                .toLowerCase()
                .trim();

            return (
                machine.name
                    .toLowerCase()
                    .includes(searchValue) ||
                machine.location
                    .toLowerCase()
                    .includes(searchValue) ||
                machine.ip
                    .toLowerCase()
                    .includes(searchValue) ||
                machine.category
                    .toLowerCase()
                    .includes(searchValue)
            );
        }
    );

    return (
        <main className="min-h-screen bg-[#f4f4f4]">
            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

                    <div>


                        <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                            Machinery Central Portal
                        </h1>
                    </div>

                    <div className="hidden text-right md:block">
                        <p className="text-sm text-gray-400">
                            Internal IT System
                        </p>

                        <p className="font-semibold text-white">
                            24/7 Machine Access
                        </p>
                    </div>

                </div>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-8">

                {/* TITLE */}

                <section className="mb-8">
                    <div className="flex items-start justify-between gap-5">

                        <div>
                            <h2 className="text-2xl font-bold text-[#1a1a1a]">
                                All Machinery IP Address List
                            </h2>

                            <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                            <p className="mt-4 text-gray-600">
                                Access available machine interfaces
                                from one central portal.
                            </p>
                        </div>

                        <Link
                            href="/"
                            className="mt-1 text-sm font-semibold text-gray-500 transition hover:text-[#b99625]"
                        >
                            ← Back to Portal
                        </Link>

                    </div>
                </section>

                {/* KPI CARDS */}

                <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {/* TOTAL */}

                    <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                            Total Machines
                        </p>

                        <p className="mt-2 text-3xl font-bold text-[#1a1a1a]">
                            {machines.length}
                        </p>

                    </div>

                    {/* ONLINE */}

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                            Online
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-600">
                            {onlineCount}
                        </p>

                    </div>

                    {/* OFFLINE */}

                    <div className="border-l-[3px] border-red-600 bg-white p-5 shadow-sm">

                        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                            Offline
                        </p>

                        <p className="mt-2 text-3xl font-bold text-red-600">
                            {offlineCount}
                        </p>

                    </div>

                    {/* NO URL */}

                    <div className="border-l-[3px] border-gray-400 bg-white p-5 shadow-sm">

                        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                            No URL
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-500">
                            {unavailableCount}
                        </p>

                    </div>

                </section>

                {/* SEARCH */}

                <section className="mb-5 bg-white p-4 shadow-sm">

                    <label
                        htmlFor="machine-search"
                        className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                        Search Machinery
                    </label>

                    <input
                        id="machine-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) =>
                            setSearchTerm(event.target.value)
                        }
                        placeholder="Search by machine name, IP, location or category..."
                        className="w-full border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">

                        <p className="text-sm text-gray-500">
                            Showing {filteredMachines.length} of{" "}
                            {machines.length} machines
                        </p>

                        {lastChecked && (
                            <p className="text-xs text-gray-400">
                                Last status check:{" "}
                                {new Date(
                                    lastChecked
                                ).toLocaleString()}
                            </p>
                        )}

                    </div>

                    {statusError && (
                        <p className="mt-3 text-sm font-medium text-red-600">
                            Unable to retrieve machine status.
                            Please check the network connection.
                        </p>
                    )}

                </section>

                {/* TABLE */}

                <section className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-full border-collapse">

                            {/* TABLE HEADER */}

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        SL
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        Machine Name
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        Location
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        IP Address
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        Category
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        Status
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm font-semibold">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            {/* TABLE BODY */}

                            <tbody>

                                {filteredMachines.length > 0 ? (
                                    filteredMachines.map(
                                        (machine, index) => {
                                            const hasLink =
                                                machine.url.trim() !== "";

                                            const status =
                                                getMachineStatus(machine);

                                            return (
                                                <tr
                                                    key={machine.id}
                                                    className={`border-b border-gray-200 transition hover:bg-[#fff8df] ${index % 2 === 0
                                                        ? "bg-white"
                                                        : "bg-gray-50"
                                                        }`}
                                                >

                                                    {/* SL */}

                                                    <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                                                        {machine.id}
                                                    </td>

                                                    {/* MACHINE NAME */}

                                                    <td className="px-4 py-4 font-semibold text-[#1a1a1a]">
                                                        {machine.name}
                                                    </td>

                                                    {/* LOCATION */}

                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {machine.location}
                                                    </td>

                                                    {/* IP */}

                                                    <td className="px-4 py-4 font-mono text-sm text-gray-700">
                                                        {machine.ip || "—"}
                                                    </td>

                                                    {/* CATEGORY */}

                                                    <td className="px-4 py-4">

                                                        <span className="inline-block border border-[#d4af37] bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#735d00]">
                                                            {machine.category}
                                                        </span>

                                                    </td>

                                                    {/* STATUS */}

                                                    <td className="px-4 py-4">

                                                        {status ===
                                                            "checking" && (
                                                                <span className="inline-flex items-center gap-2 text-sm text-gray-500">

                                                                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-gray-400" />

                                                                    Checking

                                                                </span>
                                                            )}

                                                        {status ===
                                                            "online" && (
                                                                <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700">

                                                                    <span className="h-2.5 w-2.5 rounded-full bg-green-600" />

                                                                    Online

                                                                </span>
                                                            )}

                                                        {status ===
                                                            "offline" && (
                                                                <span className="inline-flex items-center gap-2 text-sm font-medium text-red-700">

                                                                    <span className="h-2.5 w-2.5 rounded-full bg-red-600" />

                                                                    Offline

                                                                </span>
                                                            )}

                                                        {status ===
                                                            "unavailable" && (
                                                                <span className="inline-flex items-center gap-2 text-sm text-gray-500">

                                                                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />

                                                                    No URL

                                                                </span>
                                                            )}

                                                    </td>

                                                    {/* ACTION */}

                                                    <td className="px-4 py-4">

                                                        {hasLink ? (
                                                            <a
                                                                href={
                                                                    machine.url.startsWith(
                                                                        "http"
                                                                    )
                                                                        ? machine.url
                                                                        : `http://${machine.url}`
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center justify-center bg-[#d4af37] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#b99625]"
                                                            >
                                                                Open
                                                            </a>
                                                        ) : (
                                                            <span className="text-sm font-semibold text-red-600">
                                                                No Link
                                                            </span>
                                                        )}

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )
                                ) : (
                                    <tr>

                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-gray-500"
                                        >
                                            No machinery found for &quot;
                                            {searchTerm}&quot;.
                                        </td>

                                    </tr>
                                )}

                            </tbody>

                        </table>

                    </div>

                </section>

                {/* FOOTER */}

                <footer className="mt-8 border-t border-gray-300 py-5 text-center text-sm text-gray-500">

                    <p className="font-medium">
                        Auko-Tex Group — Internal Machinery
                        Portal
                    </p>

                    <p className="mt-1">
                        Developed by IT Department
                    </p>

                </footer>

            </div>
        </main>
    );
}