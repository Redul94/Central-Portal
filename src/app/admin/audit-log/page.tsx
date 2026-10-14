import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import AuditLogTable from "./audit-log-table";


export const dynamic =
    "force-dynamic";

export default async function AuditLogPage() {
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
        session.role !==
        "SUPER_ADMIN"
    ) {
        redirect("/");
    }

    return (
        <AuditLogTable
            adminName={
                session.fullName
            }
            adminRole={
                session.role
            }
        />
    );
}