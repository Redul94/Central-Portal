"use client";

import Link from "next/link";
import {
    FormEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    useSearchParams,
} from "next/navigation";

type User = {
    employee_id: string;
    full_name: string;
    department: string;
    designation: string;
    official_email: string;
};

type Room = {
    id: number;
    room_name: string;
};

type Props = {
    user: User;
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

export default function BookingForm({
    user,
    rooms,
}: Props) {
    const searchParams =
        useSearchParams();

    const requestedDate =
        searchParams.get(
            "date"
        );

    const initialDate =
        requestedDate &&
            /^\d{4}-\d{2}-\d{2}$/.test(
                requestedDate
            )
            ? requestedDate
            : getToday();

    const [
        loading,
        setLoading,
    ] =
        useState(false);

    const [
        message,
        setMessage,
    ] =
        useState("");

    const [
        success,
        setSuccess,
    ] =
        useState(false);

    // =================================
    // MESSAGE SCROLL
    // =================================

    const messageRef =
        useRef<HTMLDivElement | null>(
            null
        );

    useEffect(() => {
        if (
            !message
        ) {
            return;
        }

        const timer =
            window.setTimeout(
                () => {
                    messageRef.current?.scrollIntoView({
                        behavior:
                            "smooth",

                        block:
                            "start",
                    });
                },
                100
            );

        return () => {
            window.clearTimeout(
                timer
            );
        };
    }, [
        message,
    ]);

    // =================================
    // SUBMIT BOOKING
    // =================================

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const formElement =
            event.currentTarget;

        const form =
            new FormData(
                formElement
            );

        setLoading(
            true
        );

        setMessage(
            ""
        );

        setSuccess(
            false
        );

        const data = {
            meetingTitle:
                String(
                    form.get(
                        "meetingTitle"
                    ) || ""
                ),

            roomId:
                Number(
                    form.get(
                        "roomId"
                    )
                ),

            meetingDate:
                String(
                    form.get(
                        "meetingDate"
                    ) || ""
                ),

            startTime:
                String(
                    form.get(
                        "startTime"
                    ) || ""
                ),

            endTime:
                String(
                    form.get(
                        "endTime"
                    ) || ""
                ),

            expectedParticipants:
                Number(
                    form.get(
                        "expectedParticipants"
                    )
                ),

            agenda:
                String(
                    form.get(
                        "agenda"
                    ) || ""
                ),

            specialRequirement:
                String(
                    form.get(
                        "specialRequirement"
                    ) || ""
                ),
        };

        try {
            const response =
                await fetch(
                    "/api/meeting/book",
                    {
                        method:
                            "POST",

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

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    result.message ||
                    "Booking failed."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                result.message ||
                "Booking request submitted successfully."
            );

            // Keep employee info
            // but reset meeting fields

            formElement.reset();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to connect to meeting booking service."
            );

        } finally {
            setLoading(
                false
            );
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

                    <div>

                        

                        <h1 className="mt-1 text-2xl font-bold">
                            Meeting Management
                        </h1>

                    </div>

                    <Link
                        href="/meeting"
                        className="text-sm font-semibold text-gray-300 hover:text-[#d4af37]"
                    >
                        ← Meeting Dashboard
                    </Link>

                </div>

            </header>

            <div className="mx-auto max-w-5xl px-6 py-8">

                {/* TITLE */}

                <div className="mb-7">

                    <h2 className="text-2xl font-bold text-gray-900">
                        Book Meeting Room
                    </h2>

                    <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                    <p className="mt-3 text-gray-600">
                        Submit a meeting room booking request for Admin approval.
                    </p>

                </div>

                {/* MESSAGE */}

                {message && (

                    <div
                        ref={
                            messageRef
                        }
                        className={`scroll-mt-6 mb-6 border px-5 py-4 text-sm font-semibold ${success
                                ? "border-green-300 bg-green-50 text-green-700"
                                : "border-red-300 bg-red-50 text-red-700"
                            }`}
                    >
                        {
                            message
                        }
                    </div>

                )}

                {/* USER INFO */}

                <div className="mb-6 bg-white p-6 shadow-sm">

                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Requested By
                    </h3>

                    <div className="grid gap-5 md:grid-cols-3">

                        <div>

                            <p className="text-xs uppercase text-gray-500">
                                Employee
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {
                                    user.full_name
                                }
                            </p>

                        </div>

                        <div>

                            <p className="text-xs uppercase text-gray-500">
                                Employee ID
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {
                                    user.employee_id
                                }
                            </p>

                        </div>

                        <div>

                            <p className="text-xs uppercase text-gray-500">
                                Department
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {
                                    user.department
                                }
                            </p>

                        </div>

                        <div>

                            <p className="text-xs uppercase text-gray-500">
                                Designation
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {
                                    user.designation
                                }
                            </p>

                        </div>

                        <div className="md:col-span-2">

                            <p className="text-xs uppercase text-gray-500">
                                Official Email
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {
                                    user.official_email
                                }
                            </p>

                        </div>

                    </div>

                </div>

                {/* FORM */}

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="bg-white p-6 shadow-sm"
                >

                    <div className="grid gap-5 md:grid-cols-2">

                        {/* TITLE */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Meeting Title *
                            </label>

                            <input
                                name="meetingTitle"
                                required
                                type="text"
                                placeholder="Enter meeting title"
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#d4af37]"
                            />

                        </div>

                        {/* ROOM */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Meeting Room *
                            </label>

                            <select
                                name="roomId"
                                required
                                defaultValue=""
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#d4af37]"
                            >

                                <option
                                    value=""
                                    disabled
                                >
                                    Select Room
                                </option>

                                {rooms.map(
                                    (
                                        room
                                    ) => (

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
                                Meeting Date *
                            </label>

                            <input
                                name="meetingDate"
                                type="date"
                                required
                                min={
                                    getToday()
                                }
                                defaultValue={
                                    initialDate
                                }
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                            />

                        </div>

                        {/* START */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Start Time *
                            </label>

                            <input
                                name="startTime"
                                type="time"
                                required
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                            />

                        </div>

                        {/* END */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                End Time *
                            </label>

                            <input
                                name="endTime"
                                type="time"
                                required
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none [color-scheme:light] focus:border-[#d4af37]"
                            />

                        </div>

                        {/* PARTICIPANTS */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Expected Participants *
                            </label>

                            <input
                                name="expectedParticipants"
                                type="number"
                                required
                                min="1"
                                placeholder="Number of participants"
                                className="w-full border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                            />

                        </div>

                        {/* AGENDA */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Agenda / Purpose *
                            </label>

                            <textarea
                                name="agenda"
                                required
                                rows={
                                    4
                                }
                                placeholder="Meeting agenda or purpose"
                                className="w-full resize-none border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                            />

                        </div>

                        {/* SPECIAL REQUIREMENT */}

                        <div className="md:col-span-2">

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Special Requirement
                            </label>

                            <textarea
                                name="specialRequirement"
                                rows={
                                    3
                                }
                                placeholder="Optional: projector, video conference, special arrangement, etc."
                                className="w-full resize-none border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                            />

                        </div>

                    </div>

                    <div className="mt-7 flex justify-end gap-3">

                        <Link
                            href="/meeting"
                            className="border border-gray-300 px-6 py-3 font-semibold text-gray-600 hover:border-gray-500"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={
                                loading
                            }
                            className="bg-[#d4af37] px-7 py-3 font-bold text-black hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {
                                loading
                                    ? "Submitting..."
                                    : "Submit Booking Request"
                            }
                        </button>

                    </div>

                </form>

            </div>

        </main>
    );
}