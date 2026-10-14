"use client";

import Link from "next/link";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import AdminNav from "../admin-nav/page";


type RoomStatus =
    | "ACTIVE"
    | "MAINTENANCE"
    | "DISABLED";

type Room = {
    id: number;
    room_name: string;
    room_status: RoomStatus;
    remarks: string | null;
    created_at: string;
    updated_at: string;
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

    created_by: number;

    created_by_employee_id:
    | string
    | null;

    created_by_name:
    | string
    | null;

    created_at: string;
    updated_at: string;
};

type Props = {
    adminName: string;
    adminRole: string;
};

type EditForm = {
    roomName: string;
    roomStatus: RoomStatus;
    remarks: string;
};

// --------------------------------
// DATE FORMAT
// --------------------------------

function prettyDate(
    value: string
) {
    if (!value) {
        return "—";
    }

    const dateOnly =
        String(value).slice(
            0,
            10
        );

    const date =
        new Date(
            `${dateOnly}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return dateOnly;
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
}

// --------------------------------
// TIME FORMAT
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
    ] = value.split(":");

    let hour =
        Number(hourText);

    if (
        Number.isNaN(hour)
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

export default function RoomManagement({
    adminName,
    adminRole,
}: Props) {
    // ==========================================
    // ROOM STATE
    // ==========================================

    const [
        rooms,
        setRooms,
    ] =
        useState<Room[]>(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        processing,
        setProcessing,
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

    const [
        editingId,
        setEditingId,
    ] =
        useState<
            number | null
        >(null);

    const [
        newRoomName,
        setNewRoomName,
    ] =
        useState("");

    const [
        newRemarks,
        setNewRemarks,
    ] =
        useState("");

    const [
        editForm,
        setEditForm,
    ] =
        useState<EditForm>({
            roomName: "",
            roomStatus:
                "ACTIVE",
            remarks: "",
        });

    // ==========================================
    // BLOCK STATE
    // ==========================================

    const [
        blocks,
        setBlocks,
    ] =
        useState<
            RoomBlock[]
        >([]);

    const [
        blockLoading,
        setBlockLoading,
    ] =
        useState(true);

    const [
        blockRoomId,
        setBlockRoomId,
    ] =
        useState("");

    const [
        blockDate,
        setBlockDate,
    ] =
        useState("");

    const [
        blockStartTime,
        setBlockStartTime,
    ] =
        useState("");

    const [
        blockEndTime,
        setBlockEndTime,
    ] =
        useState("");

    const [
        blockReason,
        setBlockReason,
    ] =
        useState("");

    const [
        blockResponsiblePerson,
        setBlockResponsiblePerson,
    ] =
        useState("");

    const [
        blockResponsibleDesignation,
        setBlockResponsibleDesignation,
    ] =
        useState("");

    const [
        blockResponsiblePhone,
        setBlockResponsiblePhone,
    ] =
        useState("");

    const [
        blockFilter,
        setBlockFilter,
    ] =
        useState<
            | "ALL"
            | "ACTIVE"
            | "CANCELLED"
        >("ACTIVE");

    const [
        blockProcessingId,
        setBlockProcessingId,
    ] =
        useState<
            number | null
        >(null);

    // ==========================================
    // LOAD ROOMS
    // ==========================================

    async function loadRooms() {
        try {
            setLoading(
                true
            );

            const response =
                await fetch(
                    "/api/admin/meeting-rooms",
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
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to load meeting rooms."
                );

                return;
            }

            setRooms(
                data.rooms ||
                []
            );

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to connect to server."
            );

        } finally {
            setLoading(
                false
            );
        }
    }

    // ==========================================
    // LOAD ROOM BLOCKS
    // ==========================================

    async function loadBlocks() {
        try {
            setBlockLoading(
                true
            );

            const response =
                await fetch(
                    "/api/admin/meeting-room-blocks",
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
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to load scheduled room blocks."
                );

                return;
            }

            setBlocks(
                data.blocks ||
                []
            );

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to load scheduled room blocks."
            );

        } finally {
            setBlockLoading(
                false
            );
        }
    }

    useEffect(() => {
        loadRooms();
        loadBlocks();
    }, []);

    // ==========================================
    // ROOM COUNTS
    // ==========================================

    const activeCount =
        useMemo(
            () =>
                rooms.filter(
                    (
                        room
                    ) =>
                        room.room_status ===
                        "ACTIVE"
                ).length,
            [rooms]
        );

    const maintenanceCount =
        useMemo(
            () =>
                rooms.filter(
                    (
                        room
                    ) =>
                        room.room_status ===
                        "MAINTENANCE"
                ).length,
            [rooms]
        );

    const disabledCount =
        useMemo(
            () =>
                rooms.filter(
                    (
                        room
                    ) =>
                        room.room_status ===
                        "DISABLED"
                ).length,
            [rooms]
        );

    const activeRooms =
        useMemo(
            () =>
                rooms.filter(
                    (
                        room
                    ) =>
                        room.room_status ===
                        "ACTIVE"
                ),
            [rooms]
        );

    // ==========================================
    // FILTER BLOCKS
    // ==========================================

    const filteredBlocks =
        useMemo(() => {
            if (
                blockFilter ===
                "ALL"
            ) {
                return blocks;
            }

            return blocks.filter(
                (
                    block
                ) =>
                    block.block_status ===
                    blockFilter
            );

        }, [
            blocks,
            blockFilter,
        ]);

    const activeBlockCount =
        useMemo(
            () =>
                blocks.filter(
                    (
                        block
                    ) =>
                        block.block_status ===
                        "ACTIVE"
                ).length,
            [blocks]
        );

    // ==========================================
    // ADD ROOM
    // ==========================================

    async function addRoom(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const roomName =
            newRoomName.trim();

        if (!roomName) {
            setSuccess(
                false
            );

            setMessage(
                "Room name is required."
            );

            return;
        }

        setProcessing(
            true
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/admin/meeting-rooms",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                roomName,

                                remarks:
                                    newRemarks.trim(),
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to add meeting room."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Meeting room added successfully."
            );

            setNewRoomName(
                ""
            );

            setNewRemarks(
                ""
            );

            await loadRooms();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to add meeting room."
            );

        } finally {
            setProcessing(
                false
            );
        }
    }

    // ==========================================
    // START ROOM EDIT
    // ==========================================

    function startEdit(
        room: Room
    ) {
        setEditingId(
            room.id
        );

        setEditForm({
            roomName:
                room.room_name,

            roomStatus:
                room.room_status,

            remarks:
                room.remarks ||
                "",
        });

        setMessage("");
    }

    // ==========================================
    // CANCEL EDIT
    // ==========================================

    function cancelEdit() {
        setEditingId(
            null
        );

        setEditForm({
            roomName: "",
            roomStatus:
                "ACTIVE",
            remarks: "",
        });
    }

    // ==========================================
    // SAVE ROOM
    // ==========================================

    async function saveRoom(
        roomId: number
    ) {
        if (
            !editForm.roomName.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Room name is required."
            );

            return;
        }

        const confirmed =
            window.confirm(
                "Save changes to this meeting room?"
            );

        if (!confirmed) {
            return;
        }

        setProcessing(
            true
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/admin/meeting-rooms/${roomId}`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                roomName:
                                    editForm.roomName.trim(),

                                roomStatus:
                                    editForm.roomStatus,

                                remarks:
                                    editForm.remarks.trim(),
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to update room."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Meeting room updated successfully."
            );

            setEditingId(
                null
            );

            await loadRooms();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to update meeting room."
            );

        } finally {
            setProcessing(
                false
            );
        }
    }

    // ==========================================
    // CREATE ROOM BLOCK
    // ==========================================

    async function createBlock(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            !blockRoomId
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select a meeting room."
            );

            return;
        }

        if (
            !blockDate
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select a block date."
            );

            return;
        }

        if (
            !blockStartTime ||
            !blockEndTime
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Start time and end time are required."
            );

            return;
        }

        if (
            blockEndTime <=
            blockStartTime
        ) {
            setSuccess(
                false
            );

            setMessage(
                "End time must be later than start time."
            );

            return;
        }

        if (
            !blockReason.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Please select a reason."
            );

            return;
        }

        if (
            !blockResponsiblePerson.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Responsible person is required."
            );

            return;
        }

        if (
            !blockResponsibleDesignation.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Responsible person designation is required."
            );

            return;
        }

        if (
            !blockResponsiblePhone.trim()
        ) {
            setSuccess(
                false
            );

            setMessage(
                "Responsible person phone number is required."
            );

            return;
        }

        setProcessing(
            true
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    "/api/admin/meeting-room-blocks",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                roomId:
                                    Number(
                                        blockRoomId
                                    ),

                                blockDate,

                                startTime:
                                    blockStartTime,

                                endTime:
                                    blockEndTime,

                                reason:
                                    blockReason.trim(),

                                responsiblePerson:
                                    blockResponsiblePerson.trim(),

                                responsibleDesignation:
                                    blockResponsibleDesignation.trim(),

                                responsiblePhone:
                                    blockResponsiblePhone.trim(),
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to create room block."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Room block created successfully."
            );

            setBlockRoomId(
                ""
            );

            setBlockDate(
                ""
            );

            setBlockStartTime(
                ""
            );

            setBlockEndTime(
                ""
            );

            setBlockReason(
                ""
            );

            setBlockResponsiblePerson(
                ""
            );

            setBlockResponsibleDesignation(
                ""
            );

            setBlockResponsiblePhone(
                ""
            );

            await loadBlocks();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to create scheduled room block."
            );

        } finally {
            setProcessing(
                false
            );
        }
    }

    // ==========================================
    // CANCEL ROOM BLOCK
    // ==========================================

    async function cancelBlock(
        block: RoomBlock
    ) {
        const confirmed =
            window.confirm(
                `Cancel the scheduled block for "${block.room_name}" on ${prettyDate(
                    block.block_date
                )}?`
            );

        if (!confirmed) {
            return;
        }

        setBlockProcessingId(
            block.id
        );

        setMessage("");

        try {
            const response =
                await fetch(
                    `/api/admin/meeting-room-blocks/${block.id}`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action:
                                    "CANCEL",
                            }),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                setSuccess(
                    false
                );

                setMessage(
                    data.message ||
                    "Unable to cancel room block."
                );

                return;
            }

            setSuccess(
                true
            );

            setMessage(
                data.message ||
                "Room block cancelled successfully."
            );

            await loadBlocks();

        } catch (error) {
            console.error(
                error
            );

            setSuccess(
                false
            );

            setMessage(
                "Unable to cancel scheduled room block."
            );

        } finally {
            setBlockProcessingId(
                null
            );
        }
    }

    // ==========================================
    // ROOM STATUS STYLE
    // ==========================================

    function roomStatusStyle(
        status: string
    ) {
        switch (
        status
        ) {
            case "ACTIVE":
                return "border-green-300 bg-green-50 text-green-700";

            case "MAINTENANCE":
                return "border-yellow-300 bg-yellow-50 text-yellow-800";

            case "DISABLED":
                return "border-gray-300 bg-gray-100 text-gray-600";

            default:
                return "border-gray-300 bg-white text-gray-700";
        }
    }

    // ==========================================
    // BLOCK STATUS STYLE
    // ==========================================

    function blockStatusStyle(
        status: string
    ) {
        switch (
        status
        ) {
            case "ACTIVE":
                return "border-red-300 bg-red-50 text-red-700";

            case "CANCELLED":
                return "border-gray-300 bg-gray-100 text-gray-600";

            default:
                return "border-gray-300 bg-white text-gray-700";
        }
    }

    return (
        <main className="min-h-screen bg-[#f4f4f4]">

            {/* HEADER */}

            <header className="border-b-[3px] border-[#d4af37] bg-[#111111] text-white">

                <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5">

                    <div>

                        

                        <h1 className="mt-1 text-2xl font-bold">
                            Admin Panel
                        </h1>

                    </div>

                    <div className="text-right">

                        <p className="font-semibold">
                            {adminName}
                        </p>

                        <p className="text-xs text-gray-400">
                            {adminRole}
                        </p>

                    </div>

                </div>

            </header>

            <div className="mx-auto max-w-[1500px] px-6 py-8">

                {/* ADMIN NAVIGATION */}

                {/* NAVIGATION */}

                <AdminNav
                    adminRole={
                        adminRole
                    }
                />

                {/* TITLE */}

                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">

                    <div>

                        <h2 className="text-2xl font-bold text-gray-900">
                            Meeting Room Management
                        </h2>

                        <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                        <p className="mt-3 text-gray-600">
                            Manage meeting rooms and scheduled room unavailability.
                        </p>

                    </div>

                    <Link
                        href="/meeting"
                        className="border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-[#d4af37]"
                    >
                        Meeting Dashboard →
                    </Link>

                </div>

                {/* ROOM KPI */}

                <div className="mb-6 grid gap-4 md:grid-cols-4">

                    <div className="border-l-[3px] border-[#d4af37] bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Total Rooms
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900">
                            {rooms.length}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-green-600 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Active
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-600">
                            {activeCount}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-yellow-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Maintenance
                        </p>

                        <p className="mt-2 text-3xl font-bold text-yellow-600">
                            {maintenanceCount}
                        </p>

                    </div>

                    <div className="border-l-[3px] border-gray-500 bg-white p-5 shadow-sm">

                        <p className="text-sm uppercase text-gray-500">
                            Disabled
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-700">
                            {disabledCount}
                        </p>

                    </div>

                </div>

                {/* MESSAGE */}

                {message && (

                    <div
                        className={`mb-6 border px-4 py-3 text-sm font-semibold ${success
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-red-300 bg-red-50 text-red-700"
                            }`}
                    >
                        {message}
                    </div>

                )}

                {/* ADD ROOM */}

                <section className="mb-7 border border-gray-200 bg-white p-6 shadow-sm">

                    <h3 className="text-lg font-bold text-gray-900">
                        Add Meeting Room
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        New rooms are created with ACTIVE status.
                    </p>

                    <form
                        onSubmit={
                            addRoom
                        }
                        className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr_auto]"
                    >

                        <input
                            type="text"
                            value={
                                newRoomName
                            }
                            onChange={(
                                event
                            ) =>
                                setNewRoomName(
                                    event.target.value
                                )
                            }
                            required
                            placeholder="Room name"
                            className="border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                        />

                        <input
                            type="text"
                            value={
                                newRemarks
                            }
                            onChange={(
                                event
                            ) =>
                                setNewRemarks(
                                    event.target.value
                                )
                            }
                            placeholder="Remarks (optional)"
                            className="border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                        />

                        <button
                            type="submit"
                            disabled={
                                processing
                            }
                            className="bg-[#d4af37] px-6 py-3 font-bold text-black hover:bg-[#b99625] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing
                                ? "Processing..."
                                : "+ Add Room"}
                        </button>

                    </form>

                </section>

                {/* ROOM TABLE */}

                <section className="mb-10 overflow-hidden border border-gray-200 bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-[1000px] w-full">

                            <thead className="bg-[#1a1a1a] text-white">

                                <tr>

                                    <th className="px-4 py-4 text-left text-sm">
                                        ID
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Room Name
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Status
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Remarks
                                    </th>

                                    <th className="px-4 py-4 text-left text-sm">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan={5}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            Loading meeting rooms...
                                        </td>

                                    </tr>

                                ) : rooms.length ===
                                    0 ? (

                                    <tr>

                                        <td
                                            colSpan={5}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            No meeting rooms found.
                                        </td>

                                    </tr>

                                ) : (

                                    rooms.map(
                                        (
                                            room
                                        ) => {

                                            const isEditing =
                                                editingId ===
                                                room.id;

                                            return (

                                                <tr
                                                    key={
                                                        room.id
                                                    }
                                                    className="border-b border-gray-200 align-top hover:bg-gray-50"
                                                >

                                                    <td className="px-4 py-4 font-semibold text-gray-500">
                                                        #{room.id}
                                                    </td>

                                                    <td className="px-4 py-4">

                                                        {isEditing ? (

                                                            <input
                                                                type="text"
                                                                value={
                                                                    editForm.roomName
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setEditForm(
                                                                        (
                                                                            previous
                                                                        ) => ({
                                                                            ...previous,

                                                                            roomName:
                                                                                event.target.value,
                                                                        })
                                                                    )
                                                                }
                                                                className="w-full border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-[#d4af37]"
                                                            />

                                                        ) : (

                                                            <p className="font-semibold text-gray-900">
                                                                {
                                                                    room.room_name
                                                                }
                                                            </p>

                                                        )}

                                                    </td>

                                                    <td className="px-4 py-4">

                                                        {isEditing ? (

                                                            <select
                                                                value={
                                                                    editForm.roomStatus
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setEditForm(
                                                                        (
                                                                            previous
                                                                        ) => ({
                                                                            ...previous,

                                                                            roomStatus:
                                                                                event.target.value as RoomStatus,
                                                                        })
                                                                    )
                                                                }
                                                                className="border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-[#d4af37]"
                                                            >

                                                                <option value="ACTIVE">
                                                                    ACTIVE
                                                                </option>

                                                                <option value="MAINTENANCE">
                                                                    MAINTENANCE
                                                                </option>

                                                                <option value="DISABLED">
                                                                    DISABLED
                                                                </option>

                                                            </select>

                                                        ) : (

                                                            <span
                                                                className={`inline-block border px-3 py-1 text-xs font-semibold ${roomStatusStyle(
                                                                    room.room_status
                                                                )}`}
                                                            >
                                                                {
                                                                    room.room_status
                                                                }
                                                            </span>

                                                        )}

                                                    </td>

                                                    <td className="px-4 py-4">

                                                        {isEditing ? (

                                                            <input
                                                                type="text"
                                                                value={
                                                                    editForm.remarks
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setEditForm(
                                                                        (
                                                                            previous
                                                                        ) => ({
                                                                            ...previous,

                                                                            remarks:
                                                                                event.target.value,
                                                                        })
                                                                    )
                                                                }
                                                                placeholder="Remarks"
                                                                className="w-full border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                                                            />

                                                        ) : (

                                                            <span className="text-sm text-gray-600">
                                                                {
                                                                    room.remarks ||
                                                                    "—"
                                                                }
                                                            </span>

                                                        )}

                                                    </td>

                                                    <td className="px-4 py-4">

                                                        {isEditing ? (

                                                            <div className="flex gap-2">

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    onClick={() =>
                                                                        saveRoom(
                                                                            room.id
                                                                        )
                                                                    }
                                                                    className="bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                                                >
                                                                    Save
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    onClick={
                                                                        cancelEdit
                                                                    }
                                                                    className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                                                >
                                                                    Cancel
                                                                </button>

                                                            </div>

                                                        ) : (

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEdit(
                                                                        room
                                                                    )
                                                                }
                                                                className="border border-[#d4af37] bg-[#fff8df] px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-[#f6e9b0]"
                                                            >
                                                                Edit
                                                            </button>

                                                        )}

                                                    </td>

                                                </tr>

                                            );
                                        }
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>

                {/* ================================= */}
                {/* SCHEDULED ROOM UNAVAILABILITY   */}
                {/* ================================= */}

                <section className="mb-7">

                    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">

                        <div>

                            <h2 className="text-2xl font-bold text-gray-900">
                                Scheduled Room Unavailability
                            </h2>

                            <div className="mt-2 h-[3px] w-20 bg-[#d4af37]" />

                            <p className="mt-3 text-gray-600">
                                Block a room for buyer visits, online meetings, supplier meetings, audits, training or meetings.
                            </p>

                        </div>

                        <div className="border-l-[3px] border-red-500 bg-white px-5 py-3 shadow-sm">

                            <p className="text-xs uppercase text-gray-500">
                                Active Blocks
                            </p>

                            <p className="mt-1 text-2xl font-bold text-red-600">
                                {activeBlockCount}
                            </p>

                        </div>

                    </div>

                    {/* CREATE BLOCK */}

                    <div className="mb-6 border border-gray-200 bg-white p-6 shadow-sm">

                        <h3 className="text-lg font-bold text-gray-900">
                            Room Book Info
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            Approved meeting periods cannot be blocked.
                        </p>

                        <form
                            onSubmit={
                                createBlock
                            }
                            className="mt-5"
                        >

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                                {/* ROOM */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Meeting Room
                                    </label>

                                    <select
                                        value={
                                            blockRoomId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockRoomId(
                                                event.target.value
                                            )
                                        }
                                        required
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-[#d4af37]"
                                    >

                                        <option value="">
                                            Select room
                                        </option>

                                        {activeRooms.map(
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
                                        Visit Date
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            blockDate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockDate(
                                                event.target.value
                                            )
                                        }
                                        required
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-[#d4af37]"
                                    />

                                </div>

                                {/* START */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Start Time
                                    </label>

                                    <input
                                        type="time"
                                        value={
                                            blockStartTime
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockStartTime(
                                                event.target.value
                                            )
                                        }
                                        required
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-[#d4af37]"
                                    />

                                </div>

                                {/* END */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        End Time
                                    </label>

                                    <input
                                        type="time"
                                        value={
                                            blockEndTime
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockEndTime(
                                                event.target.value
                                            )
                                        }
                                        required
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-[#d4af37]"
                                    />

                                </div>

                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                                {/* REASON */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Reason
                                    </label>

                                    <select
                                        value={
                                            blockReason
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockReason(
                                                event.target.value
                                            )
                                        }
                                        required
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:border-[#d4af37]"
                                    >
                                        <option value="">
                                            Select reason
                                        </option>

                                        <option value="Buyer Visit">
                                            Buyer Visit
                                        </option>

                                        <option value="Buyer Online Meeting">
                                            Buyer Online Meeting
                                        </option>

                                        <option value="Supplier Meeting">
                                            Supplier Meeting
                                        </option>

                                        <option value="Audit (External/Internal)">
                                            Audit (External/Internal)
                                        </option>

                                        <option value="Training">
                                            Training
                                        </option>

                                        <option value="Meeting">
                                            Meeting
                                        </option>
                                    </select>

                                </div>

                                {/* RESPONSIBLE PERSON */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Responsible Person
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            blockResponsiblePerson
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockResponsiblePerson(
                                                event.target.value
                                            )
                                        }
                                        maxLength={
                                            150
                                        }
                                        required
                                        placeholder="Responsible person name"
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                                    />

                                </div>

                                {/* RESPONSIBLE DESIGNATION */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Designation
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            blockResponsibleDesignation
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockResponsibleDesignation(
                                                event.target.value
                                            )
                                        }
                                        maxLength={
                                            150
                                        }
                                        required
                                        placeholder="Responsible person designation"
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                                    />

                                </div>

                                {/* RESPONSIBLE PHONE */}

                                <div>

                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Phone Number
                                    </label>

                                    <input
                                        type="tel"
                                        value={
                                            blockResponsiblePhone
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setBlockResponsiblePhone(
                                                event.target.value
                                            )
                                        }
                                        maxLength={
                                            50
                                        }
                                        required
                                        placeholder="e.g. 017XXXXXXXX"
                                        className="h-12 w-full border border-gray-300 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#d4af37]"
                                    />

                                </div>

                            </div>

                            <div className="mt-4 flex justify-end">

                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        activeRooms.length ===
                                        0
                                    }
                                    className="h-12 bg-[#111111] px-7 font-bold text-white hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing
                                        ? "Processing..."
                                        : "Book Now"}
                                </button>

                            </div>

                        </form>

                    </div>

                    {/* BLOCK FILTER */}

                    <div className="mb-4 flex flex-wrap gap-2">

                        {[
                            "ACTIVE",
                            "CANCELLED",
                            "ALL",
                        ].map(
                            (
                                status
                            ) => (

                                <button
                                    key={
                                        status
                                    }
                                    type="button"
                                    onClick={() =>
                                        setBlockFilter(
                                            status as
                                            | "ACTIVE"
                                            | "CANCELLED"
                                            | "ALL"
                                        )
                                    }
                                    className={`px-4 py-2 text-sm font-semibold ${blockFilter ===
                                        status
                                        ? "bg-[#111111] text-white"
                                        : "border border-gray-300 bg-white text-gray-700 hover:border-[#d4af37]"
                                        }`}
                                >
                                    {
                                        status
                                    }
                                </button>

                            )
                        )}

                    </div>

                    {/* BLOCK TABLE */}

                    <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">

                        <div className="overflow-x-auto">

                            <table className="min-w-[1650px] w-full">

                                <thead className="bg-[#1a1a1a] text-white">

                                    <tr>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Room
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Date
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Time
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Reason
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Responsible Person
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Designation
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Phone
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Created By
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Status
                                        </th>

                                        <th className="px-4 py-4 text-left text-sm">
                                            Action
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {blockLoading ? (

                                        <tr>

                                            <td
                                                colSpan={
                                                    10
                                                }
                                                className="px-4 py-12 text-center text-gray-500"
                                            >
                                                Loading scheduled room blocks...
                                            </td>

                                        </tr>

                                    ) : filteredBlocks.length ===
                                        0 ? (

                                        <tr>

                                            <td
                                                colSpan={
                                                    10
                                                }
                                                className="px-4 py-12 text-center text-gray-500"
                                            >
                                                No scheduled room blocks found.
                                            </td>

                                        </tr>

                                    ) : (

                                        filteredBlocks.map(
                                            (
                                                block
                                            ) => (

                                                <tr
                                                    key={
                                                        block.id
                                                    }
                                                    className="border-b border-gray-200 align-top hover:bg-gray-50"
                                                >

                                                    {/* ROOM */}

                                                    <td className="px-4 py-4">

                                                        <p className="font-semibold text-gray-900">
                                                            {
                                                                block.room_name
                                                            }
                                                        </p>

                                                    </td>

                                                    {/* DATE */}

                                                    <td className="whitespace-nowrap px-4 py-4 text-gray-700">

                                                        {prettyDate(
                                                            block.block_date
                                                        )}

                                                    </td>

                                                    {/* TIME */}

                                                    <td className="whitespace-nowrap px-4 py-4 text-gray-700">

                                                        {prettyTime(
                                                            block.start_time
                                                        )}

                                                        {" - "}

                                                        {prettyTime(
                                                            block.end_time
                                                        )}

                                                    </td>

                                                    {/* REASON */}

                                                    <td className="max-w-[350px] px-4 py-4 text-sm text-gray-700">

                                                        {
                                                            block.reason
                                                        }

                                                    </td>

                                                    {/* RESPONSIBLE PERSON */}

                                                    <td className="px-4 py-4">

                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {
                                                                block.responsible_person ||
                                                                "—"
                                                            }
                                                        </p>

                                                    </td>

                                                    {/* RESPONSIBLE DESIGNATION */}

                                                    <td className="px-4 py-4 text-sm text-gray-700">

                                                        {
                                                            block.responsible_designation ||
                                                            "—"
                                                        }

                                                    </td>

                                                    {/* RESPONSIBLE PHONE */}

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">

                                                        {
                                                            block.responsible_phone ||
                                                            "—"
                                                        }

                                                    </td>

                                                    {/* CREATED BY */}

                                                    <td className="px-4 py-4">

                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {
                                                                block.created_by_name ||
                                                                "—"
                                                            }
                                                        </p>

                                                        {block.created_by_employee_id && (

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {
                                                                    block.created_by_employee_id
                                                                }
                                                            </p>

                                                        )}

                                                    </td>

                                                    {/* STATUS */}

                                                    <td className="px-4 py-4">

                                                        <span
                                                            className={`inline-block border px-3 py-1 text-xs font-semibold ${blockStatusStyle(
                                                                block.block_status
                                                            )}`}
                                                        >
                                                            {
                                                                block.block_status
                                                            }
                                                        </span>

                                                    </td>

                                                    {/* ACTION */}

                                                    <td className="px-4 py-4">

                                                        {block.block_status ===
                                                            "ACTIVE" ? (

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    blockProcessingId ===
                                                                    block.id
                                                                }
                                                                onClick={() =>
                                                                    cancelBlock(
                                                                        block
                                                                    )
                                                                }
                                                                className="border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {blockProcessingId ===
                                                                    block.id
                                                                    ? "Processing..."
                                                                    : "Cancel Block"}
                                                            </button>

                                                        ) : (

                                                            <span className="text-gray-400">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                </tr>

                                            )
                                        )

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </section>

                {/* NOTE */}

                <div className="border-l-[3px] border-[#d4af37] bg-white p-4 text-sm leading-6 text-gray-600">

                    <strong className="text-gray-900">
                        Room Status:
                    </strong>{" "}

                    Use <strong>MAINTENANCE</strong> or{" "}
                    <strong>DISABLED</strong> when the entire room should be unavailable.

                    <br />

                    <strong className="text-gray-900">
                        Scheduled Block:
                    </strong>{" "}

                    Use scheduled blocks when the room should only be unavailable for a specific date and time.

                </div>

            </div>

        </main>
    );
}