import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import MyBookings from "./my-bookings";


export const dynamic =
    "force-dynamic";

export default async function MyBookingsPage() {
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
        <MyBookings
            fullName={session.fullName}
            employeeId={
                session.employeeId
            }
        />
    );
}