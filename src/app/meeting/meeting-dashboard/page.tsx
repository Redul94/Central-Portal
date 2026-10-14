"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useState,
} from "react";

// --------------------------------
// TYPES
// --------------------------------

type Room = {
    id: number;
    room_name: string;

    room_status:
    | "ACTIVE"
    | "MAINTENANCE"
    | "DISABLED";

    remarks: string | null;
};

type Booking = {
    id: number;
    room_id: number;
    meeting_title: string;
    meeting_date: string;
    start_time: string;
    end_time: string;

    expected_participants:
    | number
    | null;

    agenda: string;

    special_requirement:
    | string
    | null;

    booking_status:
    | "PENDING"
    | "APPROVED";

    employee_id: string;
    full_name: string;
    department: string;
    designation: string;
};

type RoomBlock = {
    id: number;
    room_id: number;
    room_name: string;
    block_date: string;
    start_time: string;
    end_time: string;
    reason: string;

    responsible_person:
    | string
    | null;

    responsible_designation:
    | string
    | null;

    responsible_phone:
    | string
    | null;

    block_status:
    | "ACTIVE"
    | "CANCELLED";
};

type Props = {
    fullName: string;
    employeeId: string;
    role: string;
};

// --------------------------------
// DATE FORMAT
// --------------------------------

function formatDate(
    date: Date
) {
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

// --------------------------------
// TODAY
// --------------------------------

function getToday() {
    return formatDate(
        new Date()
    );
}

// --------------------------------
// CHANGE DATE
// --------------------------------

function changeDate(
    currentDate: string,
    days: number
) {
    const date =
        new Date(
            `${currentDate}T00:00:00`
        );

    date.setDate(
        date.getDate() +
        days
    );

    return formatDate(
        date
    );
}

// --------------------------------
// TIME TO MINUTES
// --------------------------------

function minutesFromTime(
    value: string
) {
    if (!value) {
        return 0;
    }

    const parts =
        value
            .slice(0, 5)
            .split(":");

    const hour =
        Number(
            parts[0]
        );

    const minute =
        Number(
            parts[1]
        );

    return (
        hour * 60 +
        minute
    );
}

// --------------------------------
// PRETTY TIME
// --------------------------------

function prettyTime(
    value: string
) {
    if (!value) {
        return "—";
    }

    const [
        hourText,
        minute,
    ] =
        value
            .slice(0, 5)
            .split(":");

    let hour =
        Number(
            hourText
        );

    if (
        Number.isNaN(
            hour
        )
    ) {
        return value;
    }

    const suffix =
        hour >= 12
            ? "PM"
            : "AM";

    hour =
        hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
}

// --------------------------------
// DASHBOARD HOURS
// --------------------------------

const timeSlots = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
];

export default function MeetingDashboard({
    fullName,
    employeeId,
    role,
}: Props) {
    const [
        selectedDate,
        setSelectedDate,
    ] =
        useState(
            getToday()
        );

    const [
        rooms,
        setRooms,
    ] =
        useState<Room[]>(
            []
        );

    const [
        bookings,
        setBookings,
    ] =
        useState<
            Booking[]
        >([]);

    const [
        blocks,
        setBlocks,
    ] =
        useState<
            RoomBlock[]
        >([]);

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        message,
        setMessage,
    ] =
        useState("");

    // ==================================
    // LOAD AVAILABILITY
    // ==================================

    const loadAvailability =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setMessage(
                        ""
                    );

                    const response =
                        await fetch(
                            `/api/meeting/availability?date=${selectedDate}`,
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
                        setMessage(
                            data.message ||
                            "Unable to load availability."
                        );

                        return;
                    }

                    setRooms(
                        data.rooms ||
                        []
                    );

                    setBookings(
                        data.bookings ||
                        []
                    );

                    setBlocks(
                        data.blocks ||
                        []
                    );

                } catch (
                error
                ) {
                    console.error(
                        error
                    );

                    setMessage(
                        "Unable to connect to meeting service."
                    );

                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                selectedDate,
            ]
        );

    useEffect(() => {
        loadAvailability();
    }, [
        loadAvailability,
    ]);

    // ==================================
    // GET BOOKINGS FOR SLOT
    // ==================================

    function getSlotBookings(
        roomId: number,
        slot: string
    ) {
        const slotStart =
            minutesFromTime(
                slot
            );

        const slotEnd =
            slotStart +
            60;

        return bookings.filter(
            (
                booking
            ) => {
                if (
                    booking.room_id !==
                    roomId
                ) {
                    return false;
                }

                const bookingStart =
                    minutesFromTime(
                        booking.start_time
                    );

                const bookingEnd =
                    minutesFromTime(
                        booking.end_time
                    );

                return (
                    bookingStart <
                    slotEnd &&
                    bookingEnd >
                    slotStart
                );
            }
        );
    }

    // ==================================
    // GET BLOCK FOR SLOT
    // ==================================

    function getSlotBlock(
        roomId: number,
        slot: string
    ) {
        const slotStart =
            minutesFromTime(
                slot
            );

        const slotEnd =
            slotStart +
            60;

        return blocks.find(
            (
                block
            ) => {
                if (
                    block.room_id !==
                    roomId ||
                    block.block_status !==
                    "ACTIVE"
                ) {
                    return false;
                }

                const blockStart =
                    minutesFromTime(
                        block.start_time
                    );

                const blockEnd =
                    minutesFromTime(
                        block.end_time
                    );

                return (
                    blockStart <
                    slotEnd &&
                    blockEnd >
                    slotStart
                );
            }
        );
    }

    // ==================================
    // RENDER SLOT
    // ==================================

    function renderSlot(
        room: Room,
        slot: string
    ) {
        // --------------------------------
        // FULL ROOM UNAVAILABLE
        // --------------------------------

        if (
            room.room_status !==
            "ACTIVE"
        ) {
            return (
                <div className="rounded border border-gray-300 bg-gray-100 px-3 py-3">

                    <div className="flex items-center gap-2">

                        <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />

                        <span className="text-xs font-bold uppercase text-gray-700">
                            Unavailable
                        </span>

                    </div>

                    <p className="mt-2 text-xs font-semibold text-gray-600">
                        {room.room_status ===
                            "MAINTENANCE"
                            ? "Room Maintenance"
                            : "Room Disabled"}
                    </p>

                    {room.remarks && (

                        <p className="mt-1 text-xs text-gray-500">
                            {
                                room.remarks
                            }
                        </p>

                    )}

                </div>
            );
        }

        // --------------------------------
        // SCHEDULED BLOCK
        // --------------------------------

        const roomBlock =
            getSlotBlock(
                room.id,
                slot
            );

        if (
            roomBlock
        ) {
            return (
                <div className="rounded border border-gray-400 bg-gray-200 p-3">

                    <div className="flex items-center gap-2">

                        <span className="h-2.5 w-2.5 rounded-full bg-gray-600" />

                        <span className="text-xs font-bold uppercase text-gray-800">
                            Unavailable
                        </span>

                    </div>

                    <p className="mt-2 text-xs font-semibold text-gray-800">

                        {prettyTime(
                            roomBlock.start_time
                        )}

                        {" - "}

                        {prettyTime(
                            roomBlock.end_time
                        )}

                    </p>

                    <p className="mt-2 text-xs font-bold text-gray-800">
                        {
                            roomBlock.reason
                        }
                    </p>

                    {roomBlock.responsible_person && (

                        <p className="mt-2 text-xs text-gray-700">
                            <span className="font-semibold">
                                Responsible:
                            </span>{" "}
                            {
                                roomBlock.responsible_person
                            }
                        </p>

                    )}

                    {roomBlock.responsible_designation && (

                        <p className="mt-1 text-xs text-gray-700">
                            <span className="font-semibold">
                                Designation:
                            </span>{" "}
                            {
                                roomBlock.responsible_designation
                            }
                        </p>

                    )}

                    {roomBlock.responsible_phone && (

                        <p className="mt-1 text-xs text-gray-700">
                            <span className="font-semibold">
                                Phone:
                            </span>{" "}
                            {
                                roomBlock.responsible_phone
                            }
                        </p>

                    )}

                </div>
            );
        }

        // --------------------------------
        // BOOKINGS
        // --------------------------------

        const slotBookings =
            getSlotBookings(
                room.id,
                slot
            );

        const approved =
            slotBookings.find(
                (
                    booking
                ) =>
                    booking.booking_status ===
                    "APPROVED"
            );

        const pending =
            slotBookings.filter(
                (
                    booking
                ) =>
                    booking.booking_status ===
                    "PENDING"
            );

        // --------------------------------
        // APPROVED / BOOKED
        // --------------------------------

        if (
            approved
        ) {
            return (
                <div className="rounded border border-red-300 bg-red-50 p-3">

                    <div className="flex items-center gap-2">

                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />

                        <span className="text-xs font-bold text-red-700">
                            BOOKED
                        </span>

                    </div>

                    <p className="mt-2 text-sm font-semibold text-gray-900">
                        {
                            approved.meeting_title
                        }
                    </p>

                    <p className="mt-1 text-xs text-gray-600">

                        {prettyTime(
                            approved.start_time
                        )}

                        {" - "}

                        {prettyTime(
                            approved.end_time
                        )}

                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                        {
                            approved.full_name
                        }
                    </p>

                    {approved.department && (

                        <p className="mt-1 text-xs text-gray-500">
                            {
                                approved.department
                            }
                        </p>

                    )}

                </div>
            );
        }

        // --------------------------------
        // PENDING
        // --------------------------------

        if (
            pending.length >
            0
        ) {
            return (
                <div className="rounded border border-yellow-300 bg-yellow-50 p-3">

                    <div className="flex items-center gap-2">

                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />

                        <span className="text-xs font-bold text-yellow-700">
                            PENDING
                        </span>

                    </div>

                    <p className="mt-2 text-xs text-gray-700">

                        {
                            pending.length
                        }{" "}

                        request

                        {pending.length >
                            1
                            ? "s"
                            : ""}

                    </p>

                    {pending
                        .slice(
                            0,
                            2
                        )
                        .map(
                            (
                                booking
                            ) => (

                                <p
                                    key={
                                        booking.id
                                    }
                                    className="mt-1 truncate text-xs text-gray-500"
                                >
                                    {
                                        booking.meeting_title
                                    }
                                </p>

                            )
                        )}

                    {pending.length >
                        2 && (

                            <p className="mt-1 text-xs font-semibold text-gray-500">
                                +
                                {pending.length -
                                    2}{" "}
                                more
                            </p>

                        )}

                </div>
            );
        }

        // --------------------------------
        // AVAILABLE
        // --------------------------------

        return (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-3 text-center">

                <div className="flex items-center justify-center gap-2">

                    <span className="h-2.5 w-2.5 rounded-full bg-green-600" />

                    <span className="text-xs font-semibold text-green-700">
                        Available
                    </span>

                </div>

            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* ================================= */}
            {/* HEADER                            */}
            {/* ================================= */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5">

                    <div>



                        <h1 className="mt-1 text-2xl font-bold">
                            Meeting Management
                        </h1>

                    </div>

                    <div className="text-right">

                        <p className="font-semibold">
                            {
                                fullName
                            }
                        </p>

                        <p className="text-xs text-gray-400">
                            {employeeId} •{" "}
                            {role}
                        </p>

                    </div>

                </div>

            </header>

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                {/* ================================= */}
                {/* TOP                               */}
                {/* ================================= */}

                <div className="mb-6 flex flex-wrap items-start justify-between gap-5">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Meeting Room Availability
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Check room availability, approved bookings, pending requests and scheduled room blocks.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-3">

                        <Link
                            href={`/meeting/book?date=${selectedDate}`}
                            className="bg-[#d4af37] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#b99625]"
                        >
                            + Book Meeting Room
                        </Link>

                        <Link
                            href="/meeting/my-bookings"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                        >
                            My Bookings
                        </Link>

                        <Link
                            href="/"
                            className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-600 hover:border-[#d4af37]"
                        >
                            ← Portal
                        </Link>

                    </div>

                </div>

                {/* ================================= */}
                {/* DATE CONTROLS                     */}
                {/* ================================= */}

                <div className="mb-6 flex flex-wrap items-center gap-3 bg-white p-4 shadow-sm">

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedDate(
                                changeDate(
                                    selectedDate,
                                    -1
                                )
                            )
                        }
                        className="border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 hover:border-[#d4af37]"
                    >
                        ← Previous
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedDate(
                                getToday()
                            )
                        }
                        className="border border-[#d4af37] bg-[#fff8df] px-4 py-2 font-semibold text-gray-900"
                    >
                        Today
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedDate(
                                changeDate(
                                    selectedDate,
                                    1
                                )
                            )
                        }
                        className="border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 hover:border-[#d4af37]"
                    >
                        Next →
                    </button>

                    <input
                        type="date"
                        value={
                            selectedDate
                        }
                        onChange={(
                            event
                        ) =>
                            setSelectedDate(
                                event
                                    .target
                                    .value
                            )
                        }
                        className="border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                    />

                    <p className="ml-auto text-sm font-semibold text-gray-600">

                        Selected:{" "}

                        {new Date(
                            `${selectedDate}T00:00:00`
                        ).toLocaleDateString(
                            undefined,
                            {
                                weekday:
                                    "long",

                                year:
                                    "numeric",

                                month:
                                    "long",

                                day:
                                    "numeric",
                            }
                        )}

                    </p>

                </div>

                {/* ================================= */}
                {/* LEGEND                            */}
                {/* ================================= */}

                <div className="mb-5 flex flex-wrap gap-5 text-sm">

                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">

                        <span className="h-3 w-3 rounded-full bg-green-600" />

                        Available

                    </span>

                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">

                        <span className="h-3 w-3 rounded-full bg-yellow-500" />

                        Pending

                    </span>

                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">

                        <span className="h-3 w-3 rounded-full bg-red-600" />

                        Approved / Booked

                    </span>

                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">

                        <span className="h-3 w-3 rounded-full bg-gray-500" />

                        Unavailable / Scheduled Block

                    </span>

                </div>

                {/* ================================= */}
                {/* MESSAGE                           */}
                {/* ================================= */}

                {message && (

                    <div className="mb-5 border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-700">
                        {
                            message
                        }
                    </div>

                )}

                {/* ================================= */}
                {/* AVAILABILITY TABLE                */}
                {/* ================================= */}

                <div className="overflow-x-auto border border-gray-200 bg-white shadow-sm">

                    <table className="min-w-[1200px] w-full table-fixed">

                        <thead className="bg-[#1a1a1a] text-white">

                            <tr>

                                <th className="w-[110px] px-4 py-4 text-left">
                                    Time
                                </th>

                                {rooms.map(
                                    (
                                        room
                                    ) => (

                                        <th
                                            key={
                                                room.id
                                            }
                                            className="px-4 py-4 text-left"
                                        >

                                            <p className="font-semibold">
                                                {
                                                    room.room_name
                                                }
                                            </p>

                                            {room.room_status !==
                                                "ACTIVE" && (

                                                    <p className="mt-1 text-xs font-normal text-gray-400">
                                                        {
                                                            room.room_status
                                                        }
                                                    </p>

                                                )}

                                        </th>

                                    )
                                )}

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan={
                                            rooms.length +
                                            1
                                        }
                                        className="py-16 text-center text-gray-500"
                                    >
                                        Loading meeting availability...
                                    </td>

                                </tr>

                            ) : rooms.length ===
                                0 ? (

                                <tr>

                                    <td
                                        colSpan={1}
                                        className="py-16 text-center text-gray-500"
                                    >
                                        No meeting rooms found.
                                    </td>

                                </tr>

                            ) : (

                                timeSlots.map(
                                    (
                                        slot
                                    ) => (

                                        <tr
                                            key={
                                                slot
                                            }
                                            className="border-b border-gray-200"
                                        >

                                            {/* TIME */}

                                            <td className="bg-gray-50 px-4 py-4 align-top font-semibold text-gray-700">

                                                {prettyTime(
                                                    `${slot}:00`
                                                )}

                                            </td>

                                            {/* ROOMS */}

                                            {rooms.map(
                                                (
                                                    room
                                                ) => (

                                                    <td
                                                        key={
                                                            room.id
                                                        }
                                                        className="border-l border-gray-200 p-2 align-top"
                                                    >

                                                        {renderSlot(
                                                            room,
                                                            slot
                                                        )}

                                                    </td>

                                                )
                                            )}

                                        </tr>

                                    )
                                )

                            )}

                        </tbody>

                    </table>

                </div>

                {/* ================================= */}
                {/* NOTES                             */}
                {/* ================================= */}

                <div className="mt-4 border-l-[3px] border-[#d4af37] bg-white p-4 text-sm leading-6 text-gray-600">

                    <p>
                        <strong className="text-gray-900">
                            Pending Requests:
                        </strong>{" "}
                        Multiple pending requests may exist for the same period. A room becomes booked only after Admin approval.
                    </p>

                    <p className="mt-1">
                        <strong className="text-gray-900">
                            Unavailable:
                        </strong>{" "}
                        A gray slot means the entire room is unavailable or Admin has scheduled a temporary room block for that period.
                    </p>

                </div>

            </div>

        </main>
    );
}