import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import express from "express";
import User from "../models/User.js";
import authRoutes from "../routes/authRoutes.js";

const jwtSecret = "auth-registration-test-secret-long-enough";
const originalJwtSecret = process.env.JWT_SECRET;
const users = [];
const originalFindOne = User.findOne;
const originalCreate = User.create;
let server;
let baseUrl;

const validSignup = {
  name: "Example User",
  email: "example@example.com",
  password: "secure-password",
  phone: "+12025550174",
  age: 29,
  address: "1 Example Street",
  bloodGroup: "AB+",
};

before(async () => {
  process.env.JWT_SECRET = jwtSecret;
  User.findOne = (query) => {
    const user =
      users.find(
        (user) =>
          (query.email === undefined || user.email === query.email) &&
          (query.phone === undefined || user.phone === query.phone),
      ) ?? null;
    return {
      select: async () => user,
      then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
    };
  };
  User.create = async (data) => {
    const user = { _id: `registration-user-${users.length + 1}`, ...data };
    users.push(user);
    return user;
  };

  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  User.findOne = originalFindOne;
  User.create = originalCreate;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

async function signup(data) {
  return fetch(`${baseUrl}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function login(email, password) {
  return fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

test("signup validates required profile fields and optional blood group", async () => {
  const validResponse = await signup(validSignup);
  assert.equal(validResponse.status, 201);

  for (const invalidData of [
    { ...validSignup, name: " " },
    { ...validSignup, email: "invalid-email" },
    { ...validSignup, password: "short" },
    { ...validSignup, phone: "invalid" },
    { ...validSignup, phone: "" },
    { ...validSignup, age: "" },
    { ...validSignup, age: 0 },
    { ...validSignup, age: 120.5 },
    { ...validSignup, age: 121 },
    { ...validSignup, address: " " },
    { ...validSignup, address: "" },
    { ...validSignup, bloodGroup: "X+" },
  ]) {
    const invalidPhone =
      invalidData.phone === validSignup.phone
        ? `+12025550${String(users.length).padStart(4, "0")}`
        : invalidData.phone;
    const response = await signup({
      ...invalidData,
      email:
        invalidData.email === "invalid-email"
          ? invalidData.email
          : `invalid-${users.length}@example.com`,
      phone: invalidPhone,
    });
    assert.equal(response.status, 400);
  }
});

test("signup hashes passwords and never returns hashes or secrets", async () => {
  const response = await signup({
    ...validSignup,
    email: "hash-test@example.com",
    phone: "+12025550175",
    bloodGroup: undefined,
  });
  assert.equal(response.status, 201);

  const responseBody = await response.text();
  const returnedUser = JSON.parse(responseBody).user;
  const savedUser = users.find((user) => user.email === "hash-test@example.com");
  assert.ok(savedUser.password.startsWith("$2"));
  assert.equal(await bcrypt.compare(validSignup.password, savedUser.password), true);
  assert.equal("password" in returnedUser, false);
  assert.equal(responseBody.includes(savedUser.password), false);
  assert.equal("JWT_SECRET" in returnedUser, false);
});

test("existing accounts can still log in without exposing password hashes", async () => {
  const legacyPasswordHash = await bcrypt.hash("legacy-password", 4);
  users.push({
    _id: "legacy-user",
    email: "legacy@example.com",
    password: legacyPasswordHash,
  });

  const response = await login("legacy@example.com", "legacy-password");
  assert.equal(response.status, 200);
  const responseBody = await response.text();
  const returnedUser = JSON.parse(responseBody).user;
  assert.equal(returnedUser.email, "legacy@example.com");
  assert.equal("password" in returnedUser, false);
  assert.equal(responseBody.includes(legacyPasswordHash), false);
});

test("legacy user documents without newly required profile fields remain valid", () => {
  const legacyUser = User.hydrate({
    _id: new User()._id,
    name: "Legacy User",
    email: "legacy@example.com",
    password: "$2b$12$legacyhash",
    phone: "Legacy phone format",
    bloodGroup: "Legacy value",
    gender: "Female",
  });

  assert.equal(legacyUser.validateSync(), undefined);
  assert.equal(User.schema.path("password").options.select, false);

  const invalidNewUser = new User({
    name: "New User",
    email: "new@example.com",
    password: "hashed-password",
    phone: "invalid",
    age: 29,
    address: "1 Example Street",
    bloodGroup: "Unknown",
  });
  const validationErrors = invalidNewUser.validateSync().errors;
  assert.ok(validationErrors.phone);
  assert.ok(validationErrors.bloodGroup);
});
