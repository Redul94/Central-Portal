"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { useRouter } from "next/navigation";

// ==========================================
// TYPES
// ==========================================

type NotificationItem = {
    id: number;

    recipient_user_id: number;

    actor_user_id:
    | number
    | null;

    module: string;

    notification_type: string;

    title: string;

    message:
    | string
    | null;

    reference_type:
    | string
    | null;

    reference_id:
    | number
    | null;

    link_url:
    | string
    | null;

    is_read: boolean;

    read_at:
    | string
    | null;

    created_at: string;

    actor_employee_id:
    | string
    | null;

    actor_name:
    | string
    | null;
};

type NotificationResponse = {
    success: boolean;

    message?: string;

    unreadCount: number;

    notifications: NotificationItem[];
};

// ==========================================
// DATE
// ==========================================

function prettyDateTime(
    value: string
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

// ==========================================
// NOTIFICATION TYPE ICON
// ==========================================

function notificationIcon(
    type: string
) {
    if (
        type.includes(
            "COMPLETED"
        )
    ) {
        return "✓";
    }

    if (
        type.includes(
            "WAITING"
        )
    ) {
        return "!";
    }

    if (
        type.includes(
            "REPLY"
        )
    ) {
        return "↩";
    }

    if (
        type.includes(
            "ASSIGNED"
        )
    ) {
        return "→";
    }

    return "i";
}

// ==========================================
// COMPONENT
// ==========================================

export default function NotificationBell() {
    const router =
        useRouter();

    const containerRef =
        useRef<HTMLDivElement | null>(
            null
        );

    const [
        open,
        setOpen,
    ] =
        useState(false);

    const [
        loading,
        setLoading,
    ] =
        useState(false);

    const [
        unreadCount,
        setUnreadCount,
    ] =
        useState(0);

    const [
        notifications,
        setNotifications,
    ] =
        useState<NotificationItem[]>(
            []
        );

    const [
        markingAll,
        setMarkingAll,
    ] =
        useState(false);

    // ==========================================
    // LOAD NOTIFICATIONS
    // ==========================================

    const loadNotifications =
        useCallback(
            async (
                showLoading = false
            ) => {
                try {
                    if (
                        showLoading
                    ) {
                        setLoading(
                            true
                        );
                    }

                    const response =
                        await fetch(
                            "/api/notifications?limit=20",
                            {
                                cache:
                                    "no-store",
                            }
                        );

                    if (
                        response.status ===
                        401
                    ) {
                        return;
                    }

                    const data:
                        NotificationResponse =
                        await response.json();

                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        return;
                    }

                    setUnreadCount(
                        data.unreadCount ||
                        0
                    );

                    setNotifications(
                        data.notifications ||
                        []
                    );

                } catch (error) {
                    console.error(
                        "Notification load error:",
                        error
                    );

                } finally {
                    if (
                        showLoading
                    ) {
                        setLoading(
                            false
                        );
                    }
                }
            },
            []
        );

    // ==========================================
    // INITIAL LOAD + POLLING
    // ==========================================

    useEffect(() => {
        loadNotifications();

        const timer =
            window.setInterval(
                () => {
                    loadNotifications();
                },
                30000
            );

        return () => {
            window.clearInterval(
                timer
            );
        };
    }, [
        loadNotifications,
    ]);

    // ==========================================
    // REFRESH WHEN TAB BECOMES ACTIVE
    // ==========================================

    useEffect(() => {
        function handleFocus() {
            loadNotifications();
        }

        window.addEventListener(
            "focus",
            handleFocus
        );

        return () => {
            window.removeEventListener(
                "focus",
                handleFocus
            );
        };
    }, [
        loadNotifications,
    ]);

    // ==========================================
    // CLICK OUTSIDE
    // ==========================================

    useEffect(() => {
        function handleOutsideClick(
            event: MouseEvent
        ) {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(
                    false
                );
            }
        }

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    // ==========================================
    // OPEN / CLOSE
    // ==========================================

    async function toggleNotifications() {
        const nextOpen =
            !open;

        setOpen(
            nextOpen
        );

        if (
            nextOpen
        ) {
            await loadNotifications(
                true
            );
        }
    }

    // ==========================================
    // OPEN NOTIFICATION
    // ==========================================

    async function openNotification(
        notification: NotificationItem
    ) {
        try {
            if (
                !notification.is_read
            ) {
                const response =
                    await fetch(
                        `/api/notifications/${notification.id}`,
                        {
                            method:
                                "PATCH",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    action:
                                        "MARK_READ",
                                }),
                        }
                    );

                if (
                    response.ok
                ) {
                    setNotifications(
                        (
                            previous
                        ) =>
                            previous.map(
                                (
                                    item
                                ) =>
                                    item.id ===
                                        notification.id
                                        ? {
                                            ...item,
                                            is_read:
                                                true,
                                        }
                                        : item
                            )
                    );

                    setUnreadCount(
                        (
                            previous
                        ) =>
                            Math.max(
                                0,
                                previous - 1
                            )
                    );
                }
            }

        } catch (error) {
            console.error(
                "Mark notification read error:",
                error
            );
        }

        setOpen(
            false
        );

        if (
            notification.link_url
        ) {
            router.push(
                notification.link_url
            );
        }
    }

    // ==========================================
    // MARK ALL READ
    // ==========================================

    async function markAllRead() {
        if (
            unreadCount === 0
        ) {
            return;
        }

        try {
            setMarkingAll(
                true
            );

            const response =
                await fetch(
                    "/api/notifications",
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                action:
                                    "MARK_ALL_READ",
                            }),
                    }
                );

            if (
                !response.ok
            ) {
                return;
            }

            setUnreadCount(
                0
            );

            setNotifications(
                (
                    previous
                ) =>
                    previous.map(
                        (
                            item
                        ) => ({
                            ...item,
                            is_read:
                                true,
                        })
                    )
            );

        } catch (error) {
            console.error(
                "Mark all notification error:",
                error
            );

        } finally {
            setMarkingAll(
                false
            );
        }
    }

    // ==========================================
    // UI
    // ==========================================

    return (
        <div
            ref={
                containerRef
            }
            className="relative"
        >

            {/* BELL */}

            <button
                type="button"
                onClick={
                    toggleNotifications
                }
                aria-label="Notifications"
                className="relative flex h-11 w-11 items-center justify-center border border-gray-700 bg-[#1a1a1a] text-white transition hover:border-[#d4af37] hover:text-[#d4af37]"
            >

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 00-12 0v.75a8.967 8.967 0 01-2.312 6.022 23.848 23.848 0 005.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                </svg>

                {unreadCount >
                    0 && (

                        <span className="absolute -right-2 -top-2 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-[#111111] bg-red-600 px-1 text-[10px] font-bold text-white">

                            {unreadCount >
                                99
                                ? "99+"
                                : unreadCount}

                        </span>

                    )}

            </button>

            {/* DROPDOWN */}

            {open && (

                <div className="absolute right-0 z-[100] mt-3 w-[390px] max-w-[calc(100vw-24px)] overflow-hidden border border-gray-200 bg-white shadow-2xl">

                    {/* HEADER */}

                    <div className="flex items-center justify-between border-b border-gray-200 bg-[#111111] px-4 py-4">

                        <div>

                            <h3 className="font-bold text-white">
                                Notifications
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                                {unreadCount}
                                {" "}
                                unread
                            </p>

                        </div>

                        {unreadCount >
                            0 && (

                                <button
                                    type="button"
                                    onClick={
                                        markAllRead
                                    }
                                    disabled={
                                        markingAll
                                    }
                                    className="text-xs font-semibold text-[#d4af37] hover:underline disabled:opacity-50"
                                >
                                    {markingAll
                                        ? "Updating..."
                                        : "Mark all read"}
                                </button>

                            )}

                    </div>

                    {/* BODY */}

                    <div className="max-h-[520px] overflow-y-auto">

                        {loading ? (

                            <div className="px-5 py-10 text-center text-sm text-gray-500">
                                Loading notifications...
                            </div>

                        ) : notifications.length ===
                            0 ? (

                            <div className="px-5 py-12 text-center">

                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                                    🔔
                                </div>

                                <p className="mt-3 font-semibold text-gray-700">
                                    No notifications
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    New portal activities will appear here.
                                </p>

                            </div>

                        ) : (

                            notifications.map(
                                (
                                    notification
                                ) => (

                                    <button
                                        key={
                                            notification.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            openNotification(
                                                notification
                                            )
                                        }
                                        className={`flex w-full gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${notification.is_read
                                                ? "bg-white"
                                                : "bg-[#fffbea]"
                                            }`}
                                    >

                                        {/* ICON */}

                                        <div
                                            className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${notification.is_read
                                                    ? "bg-gray-100 text-gray-600"
                                                    : "bg-[#d4af37] text-black"
                                                }`}
                                        >
                                            {notificationIcon(
                                                notification.notification_type
                                            )}
                                        </div>

                                        {/* CONTENT */}

                                        <div className="min-w-0 flex-1">

                                            <div className="flex items-start gap-2">

                                                <p
                                                    className={`flex-1 text-sm ${notification.is_read
                                                            ? "font-semibold text-gray-700"
                                                            : "font-bold text-gray-900"
                                                        }`}
                                                >
                                                    {notification.title}
                                                </p>

                                                {!notification.is_read && (

                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />

                                                )}

                                            </div>

                                            {notification.message && (

                                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                                                    {notification.message}
                                                </p>

                                            )}

                                            <div className="mt-2 flex flex-wrap items-center gap-2">

                                                <span className="text-[11px] text-gray-400">
                                                    {prettyDateTime(
                                                        notification.created_at
                                                    )}
                                                </span>

                                                {notification.actor_name && (

                                                    <>
                                                        <span className="text-gray-300">
                                                            •
                                                        </span>

                                                        <span className="text-[11px] text-gray-500">
                                                            {notification.actor_name}
                                                        </span>
                                                    </>

                                                )}

                                            </div>

                                        </div>

                                    </button>

                                )
                            )

                        )}

                    </div>

                    {/* FOOTER */}

                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center">

                        <p className="text-xs text-gray-500">
                            Showing latest
                            {" "}
                            {notifications.length}
                            {" "}
                            notification(s)
                        </p>

                    </div>

                </div>

            )}

        </div>
    );
}