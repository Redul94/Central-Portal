
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import AdminNav from "../admin-nav/page";
import LeftUserClient from "./left-user-client";


export const dynamic = "force-dynamic";

export default async function LeftUserPage() {
    const store = await cookies();

    const token =
        store.get("auko_session")?.value;

    const session = token
        ? await verifySessionToken(token)
        : null;

    if (!session) {
        redirect("/login");
    }

    if (
        session.role !== "ADMIN" &&
        session.role !== "SUPER_ADMIN"
    ) {
        redirect("/");
    }

    return (
        <>
            <AdminNav adminRole={session.role} />
            <LeftUserClient />
        </>
    );
}
