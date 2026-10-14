"use client";

import Link from "next/link";
import {
    FormEvent,
    useState,
} from "react";
import {
    useRouter,
} from "next/navigation";

type Booking = {
    id: number;
    meeting_title: string;
    room_id: number;
    room_name: string;
    meeting_date: string;
    start_time: string;
    end_time: string;
};

type Room = {
    id: number;
    room_name: string;
};

type Props = {
    booking: Booking;
    rooms: Room[];
};

function getToday() {
    const date =
        new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDateValue(
    value: string
) {
    return String(value)
        .slice(0, 10);
}

function formatTimeValue(
    value: string
) {
    return String(value)
        .slice(0, 5);
}

export default function RescheduleForm({
    booking,
    rooms,
}: Props) {
    const router =
        useRouter();

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [success, setSuccess] =
        useState(false);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const form =
            new FormData(
                event.currentTarget
            );

        setLoading(true);
        setMessage("");
        setSuccess(false);

        const data = {
            bookingId:
                booking.id,

            requestType:
                "RESCHEDULE",

            newRoomId:
                Number(
                    form.get(
                        "newRoomId"
                    )
                ),

            newMeetingDate:
                String(
                    form.get(
                        "newMeetingDate"
                    ) || ""
                ),

            newStartTime:
                String(
                    form.get(
                        "newStartTime"
                    ) || ""
                ),

            newEndTime:
                String(
                    form.get(
                        "newEndTime"
                    ) || ""
                ),

            reason:
                String(
                    form.get(
                        "reason"
                    ) || ""
                ),
        };

        try {
            const response =
                await fetch(
                    "/api/meeting/change-request",
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
                    "Unable to submit reschedule request."
                );

                return;
            }

            setSuccess(true);

            setMessage(
                result.message
            );

            // Return to My Bookings
            setTimeout(() => {
                router.push(
                    "/meeting/my-bookings"
                );

                router.refresh();
            }, 1500);

        } catch (error) {
            console.error(error);

            setMessage(
                "Unable to connect to meeting service."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

                    <div>

                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                            Auko-Tex Group
                        </p>

                        <h1 className="mt-1 text-2xl font-bold">
                            Meeting Management
                        </h1>

                    </div>

                    <Link
                        href="/meeting/my-bookings"
                        className="text-sm font-semibold text-gray-300 hover:text-[#d4af37]"
                    >
                        ← My Bookings
                    </Link>

                </div>

            </header>

            <div className="mx-auto max-w-5xl px-6 py-8">

                {/* TITLE */}

                <div className="mb-7">

                    <h2 className="text-2xl font-bold text-gray-900">
                        Request Reschedule
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Request a new room, date or time for your approved meeting.
                    </p>

                </div>

                {/* ORIGINAL BOOKING */}

                <div className="mb-6 border-l-[3px] border-[#d4af37] bg-white p-6 shadow-sm">

                    <h3 className="text-lg font-bold text-gray-900">
                        Current Approved Booking
                    </h3>

                    <div className="mt-5 grid gap-5 md:grid-cols-4">

                        <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                                Meeting
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {booking.meeting_title}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                                Room
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {booking.room_name}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                                Date
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {new Date(
                                    `${formatDateValue(
                                        booking.meeting_date
                                    )}T00:00:00`
                                ).toLocaleDateString()}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                                Time
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {formatTimeValue(
                                    booking.start_time
                                )}
                                {" - "}
                                {formatTimeValue(
                                    booking.end_time
                                )}
                            </p>
                        </div>

                    </div>

                </div>

                {/* WARNING */}

                <div className="mb-6 border border-yellow-300 bg-yellow-50 p-4 text-sm font-medium text-yellow-800">
                    Your current approved booking will remain active until the Admin approves this reschedule request.
                </div>

                {/* MESSAGE */}

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

                {/* FORM */}

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="bg-white p-6 shadow-sm"
                >

                    <div className="grid gap-5 md:grid-cols-2">

                        {/* ROOM */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                New Meeting Room *
                            </label>

                            <select
                                name="newRoomId"
                                required
                                defaultValue={
                                    booking.room_id
                                }
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#d4af37]"
                            >

                                {rooms.map(
                                    (room) => (
                                        <option
                                            key={
                                                room.id
                                            }
                                            value={
                                                room.id
                                            }
                                        >
                                            {
                                                room.room_name
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        {/* DATE */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                New Meeting Date *
                            </label>

                            <input
                                name="newMeetingDate"
                                type="date"
                                required
                                min={getToday()}
                                defaultValue={
                                    formatDateValue(
                                        booking.meeting_date
                                    )
                                }
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                            />

                        </div>

                        {/* START */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                New Start Time *
                            </label>

                            <input
                                name="newStartTime"
                                type="time"
                                required
                                defaultValue={
                                    formatTimeValue(
                                        booking.start_time
                                    )
                                }
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                            />

                        </div>

                        {/* END */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                New End Time *
                            </label>

                            <input
                                name="newEndTime"
                                type="time"
                                required
                                defaultValue={
                                    formatTimeValue(
                                        booking.end_time
                                    )
                                }
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                            />

                        </div>

                        {/* REASON */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Reason for Reschedule *
                            </label>

                            <textarea
                                name="reason"
                                required
                                rows={4}
                                placeholder="Explain why the meeting needs to be rescheduled..."
                                className="w-full resize-none border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                            />

                        </div>

                    </div>

                    <div className="mt-7 flex justify-end gap-3">

                        <Link
                            href="/meeting/my-bookings"
                            className="border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:border-gray-500"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#d4af37] px-7 py-3 font-bold text-black transition hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading
                                ? "Submitting..."
                                : "Submit Reschedule Request"}
                        </button>

                    </div>

                </form>

            </div>

        </main>
    );
}