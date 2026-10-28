import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import EmergencyContact from "../models/EmergencyContact.js";
import LocationHistory from "../models/LocationHistory.js";
import NotificationLog from "../models/NotificationLog.js";
import SafetyJourney from "../models/SafetyJourney.js";
import SOSHistory from "../models/SOSHistory.js";
import User from "../models/User.js";
import contactRoutes from "../routes/contactRoutes.js";
import locationRoutes from "../routes/locationRoutes.js";
import safetyJourneyRoutes from "../routes/safetyJourneyRoutes.js";
import sosRoutes from "../routes/sosRoutes.js";
import userRoutes from "../routes/userRoutes.js";

const jwtSecret = "account-route-test-secret-which-is-long-enough";
const testUser = {
  _id: "test-user",
  name: "Test User",
  email: "test@example.com",
  phone: "",
  age: null,
  gender: "Female",
  bloodGroup: "",
  address: "",
  async save() {},
};
const otherUser = { _id: "other-user" };
const contacts = [];
const sosRecords = [];
const locationRecords = [];
const journeys = [];
const notificationLogs = [];
const twilioEnvironment = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID",
  "TWILIO_FROM",
].map((key) => [key, process.env[key]]);
let contactId = 0;
let server;
let baseUrl;

const originalMethods = {
  findUser: User.findById,
  findContacts: EmergencyContact.find,
  createContact: EmergencyContact.create,
  updateContact: EmergencyContact.findOneAndUpdate,
  deleteContact: EmergencyContact.findOneAndDelete,
  findSos: SOSHistory.find,
  findSosByIdempotencyKey: SOSHistory.findOne,
  createSos: SOSHistory.create,
  createNotificationLog: NotificationLog.create,
  findNotificationLogByEventKey: NotificationLog.findOne,
  findNotificationLogs: NotificationLog.find,
  findLocations: LocationHistory.find,
  createLocation: LocationHistory.create,
  findJourneys: SafetyJourney.find,
  findJourney: SafetyJourney.findOne,
  createJourney: SafetyJourney.create,
  updateJourney: SafetyJourney.findOneAndUpdate,
  updateJourneyById: SafetyJourney.updateOne,
  deleteJourney: SafetyJourney.findOneAndDelete,
};

before(async () => {
  for (const [key] of twilioEnvironment) delete process.env[key];
  process.env.JWT_SECRET = jwtSecret;
  User.findById = async (id) =>
    id === testUser._id ? testUser : id === otherUser._id ? otherUser : null;
  EmergencyContact.find = async ({ user, _id, smsConsent, journeyShareConsent }) =>
    contacts.filter(
      (contact) =>
        contact.user === user &&
        (!_id?.$in || _id.$in.includes(contact._id)) &&
        (smsConsent === undefined || contact.smsConsent === smsConsent) &&
        (journeyShareConsent === undefined || contact.journeyShareConsent === journeyShareConsent),
    );
  EmergencyContact.create = async (data) => {
    const id = (++contactId).toString(16).padStart(24, "0");
    const contact = { smsConsent: false, ...data, _id: id };
    contacts.push(contact);
    return contact;
  };
  EmergencyContact.findOneAndUpdate = async ({ _id, user }, updates) => {
    const contact = contacts.find((item) => item._id === _id && item.user === user);
    if (!contact) return null;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) contact[key] = value;
    }
    return contact;
  };
  EmergencyContact.findOneAndDelete = async ({ _id, user }) => {
    const index = contacts.findIndex((item) => item._id === _id && item.user === user);
    if (index < 0) return null;
    return contacts.splice(index, 1)[0];
  };
  SOSHistory.find = ({ user }) => ({
    sort: async () => sosRecords.filter((record) => record.user === user),
  });
  SOSHistory.findOne = async ({ user, idempotencyKey }) =>
    sosRecords.find((record) => record.user === user && record.idempotencyKey === idempotencyKey) ??
    null;
  SOSHistory.create = async (data) => {
    const record = {
      ...data,
      _id: `sos-${sosRecords.length + 1}`,
      triggeredAt: new Date(),
    };
    sosRecords.push(record);
    return record;
  };
  NotificationLog.create = async (data) => {
    const log = { ...data, _id: `notification-${notificationLogs.length + 1}`, async save() {} };
    notificationLogs.push(log);
    return log;
  };
  NotificationLog.findOne = async ({ user, eventKey, contact }) =>
    notificationLogs.find(
      (log) =>
        log.user === user && log.eventKey === eventKey && String(log.contact) === String(contact),
    ) ?? null;
  NotificationLog.find = ({ user, eventType, eventId }) => ({
    populate: async () =>
      notificationLogs
        .filter(
          (log) =>
            log.user === user &&
            (eventType?.$in
              ? eventType.$in.includes(log.eventType)
              : log.eventType === eventType) &&
            (eventId?.$in
              ? eventId.$in.map(String).includes(String(log.eventId))
              : String(log.eventId) === String(eventId)),
        )
        .map((log) => ({
          ...log,
          contact: contacts.find((contact) => contact._id === log.contact),
        })),
  });
  LocationHistory.find = ({ user }) => ({
    sort: () => ({
      limit: async () => locationRecords.filter((record) => record.user === user),
    }),
  });
  LocationHistory.create = async (data) => {
    const record = {
      ...data,
      _id: `location-${locationRecords.length + 1}`,
      recordedAt: new Date(),
    };
    locationRecords.push(record);
    return record;
  };
  SafetyJourney.find = ({ user }) => ({
    sort: async () => journeys.filter((journey) => journey.user === user),
  });
  SafetyJourney.findOne = async ({ _id, user, "checkIns.idempotencyKey": key }) =>
    journeys.find(
      (journey) =>
        journey._id === _id &&
        journey.user === user &&
        (!key || journey.checkIns.some((checkIn) => checkIn.idempotencyKey === key)),
    ) ?? null;
  SafetyJourney.create = async (data) => {
    const journey = {
      ...data,
      _id: `journey-${journeys.length + 1}`,
      status: "active",
      checkIns: [],
      createdAt: new Date(),
    };
    journeys.push(journey);
    return journey;
  };
  SafetyJourney.findOneAndUpdate = async ({ _id, user, status }, updates) => {
    const journey = journeys.find(
      (item) =>
        item._id === _id &&
        item.user === user &&
        (!status || item.status === status) &&
        (!updates.$push?.checkIns?.idempotencyKey ||
          !item.checkIns.some(
            (checkIn) => checkIn.idempotencyKey === updates.$push.checkIns.idempotencyKey,
          )),
    );
    if (!journey) return null;
    if (updates.$push?.checkIns) journey.checkIns.push(updates.$push.checkIns);
    for (const [key, value] of Object.entries(updates)) {
      if (!key.startsWith("$")) journey[key] = value;
    }
    if (updates.status) journey.status = updates.status;
    if (updates.completedAt) journey.completedAt = updates.completedAt;
    if (updates.cancelledAt) journey.cancelledAt = updates.cancelledAt;
    return journey;
  };
  SafetyJourney.updateOne = async () => ({ acknowledged: true, modifiedCount: 1 });
  SafetyJourney.findOneAndDelete = async ({ _id, user }) => {
    const index = journeys.findIndex((item) => item._id === _id && item.user === user);
    if (index < 0) return null;
    return journeys.splice(index, 1)[0];
  };

  const app = express();
  app.use(express.json());
  app.use("/api/contacts", contactRoutes);
  app.use("/api/sos", sosRoutes);
  app.use("/api/location", locationRoutes);
  app.use("/api/journeys", safetyJourneyRoutes);
  app.use("/api/users", userRoutes);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  User.findById = originalMethods.findUser;
  EmergencyContact.find = originalMethods.findContacts;
  EmergencyContact.create = originalMethods.createContact;
  EmergencyContact.findOneAndUpdate = originalMethods.updateContact;
  EmergencyContact.findOneAndDelete = originalMethods.deleteContact;
  SOSHistory.find = originalMethods.findSos;
  SOSHistory.findOne = originalMethods.findSosByIdempotencyKey;
  SOSHistory.create = originalMethods.createSos;
  NotificationLog.create = originalMethods.createNotificationLog;
  NotificationLog.findOne = originalMethods.findNotificationLogByEventKey;
  NotificationLog.find = originalMethods.findNotificationLogs;
  LocationHistory.find = originalMethods.findLocations;
  LocationHistory.create = originalMethods.createLocation;
  SafetyJourney.find = originalMethods.findJourneys;
  SafetyJourney.findOne = originalMethods.findJourney;
  SafetyJourney.create = originalMethods.createJourney;
  SafetyJourney.findOneAndUpdate = originalMethods.updateJourney;
  SafetyJourney.updateOne = originalMethods.updateJourneyById;
  SafetyJourney.findOneAndDelete = originalMethods.deleteJourney;
  for (const [key, value] of twilioEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("authenticated APIs validate and scope account, SOS, location, and journey data", async () => {
  const tokenFor = (userId) => jwt.sign({ id: userId }, jwtSecret);
  const request = (path, { token, ...options } = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  const ownerToken = tokenFor(testUser._id);
  const otherToken = tokenFor(otherUser._id);

  assert.equal((await request("/contacts")).status, 401);
  assert.equal((await request("/contacts", { token: ownerToken })).status, 200);
  assert.equal((await request("/users/profile")).status, 401);

  const invalidContact = await request("/contacts", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({
      name: "Trusted person",
      phone: "+1 202 555 0174",
      relation: "Friend",
      priority: "High",
      smsConsent: true,
    }),
  });
  assert.equal(invalidContact.status, 400);

  const createdResponse = await request("/contacts", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({
      name: "Trusted person",
      phone: "+12025550174",
      relation: "Friend",
      priority: "High",
      smsConsent: true,
    }),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.name, "Trusted person");

  const listedResponse = await request("/contacts", { token: ownerToken });
  assert.equal((await listedResponse.json()).length, 1);

  const updatedResponse = await request(`/contacts/${created._id}`, {
    token: ownerToken,
    method: "PUT",
    body: JSON.stringify({ name: "Updated person", priority: "Medium" }),
  });
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).name, "Updated person");

  assert.equal(
    (
      await request(`/contacts/${created._id}`, {
        token: otherToken,
        method: "DELETE",
      })
    ).status,
    404,
  );

  const deletedResponse = await request(`/contacts/${created._id}`, {
    token: ownerToken,
    method: "DELETE",
  });
  assert.equal(deletedResponse.status, 200);
  assert.deepEqual(await (await request("/contacts", { token: ownerToken })).json(), []);

  const profileResponse = await request("/users/profile", { token: ownerToken });
  assert.equal(profileResponse.status, 200);
  const profile = await profileResponse.json();
  assert.equal(profile.email, testUser.email);
  assert.equal("password" in profile, false);

  const invalidProfile = await request("/users/profile", {
    token: ownerToken,
    method: "PUT",
    body: JSON.stringify({ age: 121 }),
  });
  assert.equal(invalidProfile.status, 400);

  const updatedProfile = await request("/users/profile", {
    token: ownerToken,
    method: "PUT",
    body: JSON.stringify({ name: "Updated user", age: 32, address: "Test address" }),
  });
  assert.equal(updatedProfile.status, 200);
  const savedProfile = await updatedProfile.json();
  assert.equal(savedProfile.name, "Updated user");
  assert.equal(savedProfile.age, 32);
  assert.equal(savedProfile.address, "Test address");

  const partialSosLocation = await request("/sos", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({ location: { latitude: 20 } }),
  });
  assert.equal(partialSosLocation.status, 400);

  const sosRecipientResponse = await request("/contacts", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({
      name: "SOS recipient",
      phone: "+12025550174",
      relation: "Friend",
      priority: "High",
      smsConsent: true,
      journeyShareConsent: true,
    }),
  });
  assert.equal(sosRecipientResponse.status, 201);
  const sosRecipient = await sosRecipientResponse.json();

  const invalidSosRecipient = await request("/sos", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({ contactIds: ["000000000000000000000000"] }),
  });
  assert.equal(invalidSosRecipient.status, 400);

  const createdSosResponse = await request("/sos", {
    token: ownerToken,
    method: "POST",
    headers: { "Idempotency-Key": "b553aba7-2fd1-4856-9bd4-17212fb09001" },
    body: JSON.stringify({
      location: { latitude: 20, longitude: 75 },
      contactIds: [sosRecipient._id],
    }),
  });
  assert.equal(createdSosResponse.status, 201, await createdSosResponse.clone().text());
  const createdSos = await createdSosResponse.json();
  assert.equal(createdSos.status, "Recorded; SMS attempts are tracked separately");
  assert.deepEqual(
    createdSos.notificationAttempts.map(({ contactName, status }) => ({ contactName, status })),
    [{ contactName: "SOS recipient", status: "not_configured" }],
  );
  assert.match(createdSos.notificationError, /TWILIO_ACCOUNT_SID/);
  assert.match(createdSos.notificationError, /TWILIO_AUTH_TOKEN/);
  assert.match(createdSos.notificationError, /TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM/);
  const replayedSosResponse = await request("/sos", {
    token: ownerToken,
    method: "POST",
    headers: { "Idempotency-Key": "b553aba7-2fd1-4856-9bd4-17212fb09001" },
    body: JSON.stringify({
      location: { latitude: 20, longitude: 75 },
      contactIds: [sosRecipient._id],
    }),
  });
  assert.equal(replayedSosResponse.status, 200);
  assert.equal(sosRecords.filter((record) => record.user === testUser._id).length, 1);
  assert.equal(notificationLogs.filter((log) => log.eventType === "sos").length, 1);
  assert.equal((await (await request("/sos", { token: ownerToken })).json()).length, 1);
  assert.equal((await (await request("/sos", { token: otherToken })).json()).length, 0);

  const invalidCoordinates = await request("/location", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({ latitude: 100, longitude: 75 }),
  });
  assert.equal(invalidCoordinates.status, 400);

  const createdLocation = await request("/location", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({ latitude: 20, longitude: 75 }),
  });
  assert.equal(createdLocation.status, 201);
  assert.equal((await createdLocation.json()).latitude, 20);
  assert.equal((await (await request("/location", { token: ownerToken })).json()).length, 1);
  assert.equal((await (await request("/location", { token: otherToken })).json()).length, 0);

  const invalidJourney = await request("/journeys", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({ destination: "Home", expectedArrivalAt: new Date(0).toISOString() }),
  });
  assert.equal(invalidJourney.status, 400);

  const foreignJourneyContact = await request("/journeys", {
    token: otherToken,
    method: "POST",
    body: JSON.stringify({
      destination: "Home",
      expectedArrivalAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      notifyContactIds: [sosRecipient._id],
    }),
  });
  assert.equal(foreignJourneyContact.status, 400);

  const createdJourney = await request("/journeys", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({
      destination: "Home",
      expectedArrivalAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      notifyContactIds: [sosRecipient._id],
    }),
  });
  assert.equal(createdJourney.status, 201);
  const journey = await createdJourney.json();
  assert.equal(journey.status, "active");
  assert.deepEqual(
    journey.notificationAttempts.map(({ contactName, status, eventType }) => ({
      contactName,
      status,
      eventType,
    })),
    [{ contactName: "SOS recipient", status: "not_configured", eventType: "journey_started" }],
  );
  assert.equal((await (await request("/journeys", { token: ownerToken })).json()).length, 1);
  assert.equal((await (await request("/journeys", { token: otherToken })).json()).length, 0);

  const checkIn = await request(`/journeys/${journey._id}/check-in`, {
    token: ownerToken,
    method: "POST",
    headers: { "Idempotency-Key": "journey-checkin-test-1" },
  });
  assert.equal(checkIn.status, 200);
  const checkInResult = await checkIn.json();
  assert.equal(checkInResult.checkIns.length, 1);
  assert.equal(
    checkInResult.notificationAttempts.filter(({ eventType }) => eventType === "journey_checkin")
      .length,
    1,
  );
  const repeatedCheckIn = await request(`/journeys/${journey._id}/check-in`, {
    token: ownerToken,
    method: "POST",
    headers: { "Idempotency-Key": "journey-checkin-test-1" },
  });
  assert.equal((await repeatedCheckIn.json()).checkIns.length, 1);

  const extended = await request(`/journeys/${journey._id}/extend`, {
    token: ownerToken,
    method: "PATCH",
    body: JSON.stringify({
      expectedArrivalAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    }),
  });
  assert.equal(extended.status, 200);
  const extendedJourney = await extended.json();
  assert(
    extendedJourney.notificationAttempts.some(({ eventType }) => eventType === "journey_extended"),
  );

  const shortened = await request(`/journeys/${journey._id}/extend`, {
    token: ownerToken,
    method: "PATCH",
    body: JSON.stringify({
      expectedArrivalAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }),
  });
  assert.equal(shortened.status, 400);

  const completed = await request(`/journeys/${journey._id}/complete`, {
    token: ownerToken,
    method: "PATCH",
  });
  assert.equal(completed.status, 200);
  const completedJourney = await completed.json();
  assert.equal(completedJourney.status, "completed");
  assert(
    completedJourney.notificationAttempts.some(
      ({ eventType }) => eventType === "journey_completed",
    ),
  );
  assert.equal(
    (
      await request(`/journeys/${journey._id}/check-in`, {
        token: ownerToken,
        method: "POST",
      })
    ).status,
    404,
  );
  assert.equal(
    (await request(`/journeys/${journey._id}`, { token: otherToken, method: "DELETE" })).status,
    404,
  );
  assert.equal(
    (await request(`/journeys/${journey._id}`, { token: ownerToken, method: "DELETE" })).status,
    200,
  );

  const cancellableResponse = await request("/journeys", {
    token: ownerToken,
    method: "POST",
    body: JSON.stringify({
      destination: "Office",
      expectedArrivalAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }),
  });
  const cancellable = await cancellableResponse.json();
  const cancelled = await request(`/journeys/${cancellable._id}/cancel`, {
    token: ownerToken,
    method: "PATCH",
  });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).status, "cancelled");
});
