import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import MeetingDashboard from "./meeting-dashboard/page";


export const dynamic = "force-dynamic";

export default async function MeetingPage() {
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

    if (!session) {
        redirect("/login");
    }

    return (
        <MeetingDashboard
            fullName={session.fullName}
            employeeId={session.employeeId}
            role={session.role}
        />
    );
}