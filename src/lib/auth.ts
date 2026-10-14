import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET
);

export type SessionPayload = {
    userId: number;
    employeeId: string;
    fullName: string;
    role: "USER" | "ADMIN" | "SUPER_ADMIN";
};

export async function createSessionToken(
    payload: SessionPayload
) {
    return new SignJWT(payload)
        .setProtectedHeader({
            alg: "HS256",
        })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret);
}

export async function verifySessionToken(
    token: string
) {
    try {
        const { payload } = await jwtVerify(
            token,
            secret
        );

        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}