import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";

import AdminNav from "../../admin-nav/page";
import WarrantyClient from "./warranty-client";

export const dynamic = "force-dynamic";

export default async function WarrantyPage() {
    const cookieStore = await cookies();

    const token = cookieStore.get("auko_session")?.value;

    if (!token) {
        redirect("/login");
    }

    const session = await verifySessionToken(token);

    if (
        !session ||
        !["ADMIN", "SUPER_ADMIN"].includes(session.role)
    ) {
        redirect("/");
    }

    return (
        <>
            <div className="bg-[#f4f4f4] px-3 pt-5 sm:px-5 lg:px-7">
                <div className="mx-auto max-w-[1800px]">
                    <AdminNav adminRole={session.role} />
                </div>
            </div>

            <WarrantyClient />
        </>
    );
}