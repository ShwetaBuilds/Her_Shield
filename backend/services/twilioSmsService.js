import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.twilio.com/2010-04-01";

export class TwilioConfigurationError extends Error {
  constructor(message = "Twilio SMS is not configured", providerCode = "missing_configuration") {
    super(message);
    this.name = "TwilioConfigurationError";
    this.providerCode = providerCode;
  }
}

export function getTwilioConfigurationStatus(env = process.env) {
  const missing = [];
  if (!env.TWILIO_ACCOUNT_SID?.trim()) missing.push("TWILIO_ACCOUNT_SID");
  if (!env.TWILIO_AUTH_TOKEN?.trim()) missing.push("TWILIO_AUTH_TOKEN");
  if (!env.TWILIO_MESSAGING_SERVICE_SID?.trim() && !env.TWILIO_FROM?.trim()) {
    missing.push("TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM");
  }
  return { configured: missing.length === 0, missing };
}

export const isTwilioConfigured = (env = process.env) =>
  getTwilioConfigurationStatus(env).configured;

function validateTwilioConfiguration(env) {
  const { missing } = getTwilioConfigurationStatus(env);
  if (missing.length) {
    throw new TwilioConfigurationError(
      `Twilio SMS configuration is incomplete. Set: ${missing.join(", ")}`,
    );
  }
  if (!/^AC[0-9a-f]{32}$/i.test(env.TWILIO_ACCOUNT_SID.trim())) {
    throw new TwilioConfigurationError(
      "TWILIO_ACCOUNT_SID must be a valid Twilio Account SID",
      "invalid_configuration",
    );
  }
  if (
    env.TWILIO_MESSAGING_SERVICE_SID?.trim() &&
    !/^MG[0-9a-f]{32}$/i.test(env.TWILIO_MESSAGING_SERVICE_SID.trim())
  ) {
    throw new TwilioConfigurationError(
      "TWILIO_MESSAGING_SERVICE_SID must be a valid Twilio Messaging Service SID",
      "invalid_configuration",
    );
  }
  if (
    !env.TWILIO_MESSAGING_SERVICE_SID?.trim() &&
    !/^\+[1-9]\d{7,14}$/.test(env.TWILIO_FROM.trim())
  ) {
    throw new TwilioConfigurationError(
      "TWILIO_FROM must be a valid E.164 sender number",
      "invalid_configuration",
    );
  }
  if (env.TWILIO_STATUS_CALLBACK_URL?.trim()) {
    let callbackUrl;
    try {
      callbackUrl = new URL(env.TWILIO_STATUS_CALLBACK_URL.trim());
    } catch {
      throw new TwilioConfigurationError(
        "TWILIO_STATUS_CALLBACK_URL must be a valid public HTTPS URL",
        "invalid_configuration",
      );
    }
    if (callbackUrl.protocol !== "https:") {
      throw new TwilioConfigurationError(
        "TWILIO_STATUS_CALLBACK_URL must use HTTPS",
        "invalid_configuration",
      );
    }
  }
}

export async function sendTwilioSms({ to, body }, { env = process.env, fetchImpl = fetch } = {}) {
  validateTwilioConfiguration(env);
  if (!/^\+[1-9]\d{7,14}$/.test(to)) {
    throw new TypeError("SMS recipient must be an E.164 phone number");
  }
  if (typeof body !== "string" || body.length < 1 || body.length > 1600) {
    throw new TypeError("SMS body must contain between 1 and 1600 characters");
  }

  const accountSid = env.TWILIO_ACCOUNT_SID.trim();
  const form = new URLSearchParams({ To: to, Body: body });
  if (env.TWILIO_MESSAGING_SERVICE_SID?.trim()) {
    form.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID.trim());
  } else {
    form.set("From", env.TWILIO_FROM.trim());
  }
  if (env.TWILIO_STATUS_CALLBACK_URL?.trim()) {
    form.set("StatusCallback", env.TWILIO_STATUS_CALLBACK_URL.trim());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(
      `${API_BASE}/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${env.TWILIO_AUTH_TOKEN.trim()}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: controller.signal,
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error("Twilio rejected the SMS request");
      error.providerCode = Number.isInteger(result.code) ? String(result.code) : "twilio_error";
      throw error;
    }

    if (!/^SM[0-9a-fA-F]{32}$/.test(result.sid ?? "")) {
      const error = new Error("Twilio returned an invalid message identifier");
      error.providerCode = "invalid_provider_response";
      throw error;
    }
    const acceptedStatuses = new Set(["accepted", "queued", "sending", "sent"]);
    if (!acceptedStatuses.has(result.status)) {
      const error = new Error("Twilio returned an unexpected message status");
      error.providerCode = "invalid_provider_response";
      throw error;
    }
    return { sid: result.sid, status: result.status };
  } finally {
    clearTimeout(timeout);
  }
}

export function verifyTwilioSignature({ url, params, signature, authToken }) {
  if (!signature || !authToken) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((value, key) => `${value}${key}${params[key] ?? ""}`, url);
  const expected = createHmac("sha1", authToken.trim()).update(data).digest("base64");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
