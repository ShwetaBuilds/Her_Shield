import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  isTwilioConfigured,
  sendTwilioSms,
  TwilioConfigurationError,
  verifyTwilioSignature,
} from "../services/twilioSmsService.js";

test("SMS service requires backend-only Twilio configuration", async () => {
  assert.equal(isTwilioConfigured({}), false);
  await assert.rejects(
    sendTwilioSms(
      { to: "+919876543210", body: "Test" },
      {
        env: {},
        fetchImpl: async () => {
          throw new Error("A provider request must not be made without credentials");
        },
      },
    ),
    (error) =>
      error instanceof TwilioConfigurationError &&
      error.message.includes("TWILIO_ACCOUNT_SID") &&
      error.message.includes("TWILIO_AUTH_TOKEN") &&
      error.message.includes("TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM"),
  );
});

test("SMS service validates Twilio credentials before making a provider request", async () => {
  let requestMade = false;
  await assert.rejects(
    sendTwilioSms(
      { to: "+919876543210", body: "Consent-based test message" },
      {
        env: {
          TWILIO_ACCOUNT_SID: "invalid",
          TWILIO_AUTH_TOKEN: "test-auth-token",
          TWILIO_MESSAGING_SERVICE_SID: "MG00000000000000000000000000000000",
        },
        fetchImpl: async () => {
          requestMade = true;
          throw new Error("Provider must not be called with invalid settings");
        },
      },
    ),
    (error) =>
      error instanceof TwilioConfigurationError &&
      error.providerCode === "invalid_configuration",
  );
  assert.equal(requestMade, false);
});

test("SMS service rejects invalid sender and callback settings before making a provider request", async () => {
  const validAccount = `AC${"1".repeat(32)}`;
  const validMessagingService = `MG${"2".repeat(32)}`;
  const invalidConfigurations = [
    {
      TWILIO_ACCOUNT_SID: validAccount,
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_MESSAGING_SERVICE_SID: "not-a-service-sid",
    },
    {
      TWILIO_ACCOUNT_SID: validAccount,
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_FROM: "not-an-e164-number",
    },
    {
      TWILIO_ACCOUNT_SID: validAccount,
      TWILIO_AUTH_TOKEN: "test-auth-token",
      TWILIO_MESSAGING_SERVICE_SID: validMessagingService,
      TWILIO_STATUS_CALLBACK_URL: "http://example.test/twilio-status",
    },
  ];

  for (const env of invalidConfigurations) {
    let requestMade = false;
    await assert.rejects(
      sendTwilioSms(
        { to: "+919876543210", body: "Consent-based test message" },
        {
          env,
          fetchImpl: async () => {
            requestMade = true;
            throw new Error("Provider must not be called with invalid settings");
          },
        },
      ),
      (error) =>
        error instanceof TwilioConfigurationError &&
        error.providerCode === "invalid_configuration",
    );
    assert.equal(requestMade, false);
  }
});

test("SMS service submits a test request to the Twilio API using the configured messaging service", async () => {
  let request;
  const result = await sendTwilioSms(
    { to: "+919876543210", body: "Consent-based test message" },
    {
      env: {
        TWILIO_ACCOUNT_SID: "AC00000000000000000000000000000000",
        TWILIO_AUTH_TOKEN: "test-auth-token",
        TWILIO_MESSAGING_SERVICE_SID: "MG00000000000000000000000000000000",
        TWILIO_STATUS_CALLBACK_URL: "https://example.test/api/notifications/twilio-status",
      },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          json: async () => ({ sid: "SM00000000000000000000000000000000", status: "queued" }),
        };
      },
    },
  );

  assert.equal(result.sid, "SM00000000000000000000000000000000");
  assert.equal(result.status, "queued");
  assert.match(request.url, /api\.twilio\.com\/2010-04-01\/Accounts\/AC/);
  assert.equal(request.options.method, "POST");
  assert.equal(
    request.options.headers.Authorization,
    `Basic ${Buffer.from("AC00000000000000000000000000000000:test-auth-token").toString("base64")}`,
  );
  const form = new URLSearchParams(request.options.body);
  assert.equal(form.get("To"), "+919876543210");
  assert.equal(form.get("MessagingServiceSid"), "MG00000000000000000000000000000000");
  assert.equal(form.get("StatusCallback"), "https://example.test/api/notifications/twilio-status");
});

test("Twilio callback signature verification rejects tampered data", () => {
  const url = "https://example.test/api/notifications/twilio-status";
  const params = { MessageSid: "SM00000000000000000000000000000000", MessageStatus: "delivered" };
  const token = "test-auth-token";
  const signatureData = `${url}MessageSid${params.MessageSid}MessageStatus${params.MessageStatus}`;
  const signature = createHmac("sha1", token).update(signatureData).digest("base64");

  assert.equal(verifyTwilioSignature({ url, params, signature, authToken: token }), true);
  assert.equal(
    verifyTwilioSignature({
      url,
      params: { ...params, MessageStatus: "failed" },
      signature,
      authToken: token,
    }),
    false,
  );
});
