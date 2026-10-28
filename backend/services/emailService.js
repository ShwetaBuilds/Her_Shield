import { sendEmail } from "../utils/sendEmail.js";

export const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your Her Shield account",
    html: `<p>Hello ${name},</p><p>Click <a href="${url}">here</a> to verify your email address.</p>`,
  });
};

export const sendResetPasswordEmail = async (email, name, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your Her Shield password",
    html: `<p>Hello ${name},</p><p>Click <a href="${url}">reset your password</a>.</p>`,
  });
};
