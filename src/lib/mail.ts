import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(
    to: string,
    resetUrl: string
) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM;

    if (
        !host ||
        !port ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !from
    ) {
        throw new Error(
            "SMTP host, port, or sender is not configured."
        );
    }

    if (Boolean(user) !== Boolean(pass)) {
        throw new Error(
            "SMTP username/password must both be set, or both omitted."
        );
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true",
        ...(user && pass
            ? { auth: { user, pass } }
            : {}),
    });

    await transporter.sendMail({
        from,
        to,
        subject: "Auko-Tex Central Portal - Password Reset",
        text: `
A password reset was requested for your
Auko-Tex Central Portal account.

Open this link within 15 minutes:

${resetUrl}

If you did not request this, ignore this email.
        `.trim(),
    });
}