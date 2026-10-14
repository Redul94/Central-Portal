import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import PendingUsers from "./pending-users";


export const dynamic =
    "force-dynamic";

export default async function AdminPage() {
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
        <PendingUsers
            adminName={
                session.fullName
            }
            adminRole={
                session.role
            }
        />
    );
}