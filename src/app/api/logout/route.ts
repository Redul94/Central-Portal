import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const response = NextResponse.redirect(
        new URL("/", request.url),
        {
            status: 303,
        }
    );

    response.cookies.set(
        "auko_session",
        "",
        {
            httpOnly: true,
            path: "/",
            sameSite: "lax",
            expires: new Date(0),
        }
    );

    return response;
}