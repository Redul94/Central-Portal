import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import MeetingApprovals from "./meeting-approvals";


export const dynamic =
    "force-dynamic";

export default async function AdminMeetingsPage() {
    const cookieStore =
        await cookies();

    const token =
        cookieStore.get(
            "auko_session"
        )?.value;

    if (!token) {
        redirect("/login");
    }

    const session =
        await verifySessionToken(token);

    if (
        !session ||
        ![
            "ADMIN",
            "SUPER_ADMIN",
        ].includes(session.role)
    ) {
        redirect("/");
    }

    return (
        <MeetingApprovals
            adminName={
                session.fullName
            }
            adminRole={
                session.role
            }
        />
    );
}