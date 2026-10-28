import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import safetyJourneyRoutes from "./routes/safetyJourneyRoutes.js";
import twilioStatusRoutes from "./routes/twilioStatusRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { startJourneyReminderScheduler } from "./services/journeyReminderService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const allowedOrigins = new Set(
  (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://localhost:4173");
}

app.use(helmet());
app.use(cors({ origin: [...allowedOrigins], credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "not_ready",
    database: databaseReady ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/journeys", safetyJourneyRoutes);
app.use("/api/notifications/twilio-status", twilioStatusRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
      throw new Error("PORT must be an integer between 1 and 65535");
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters");
    }
    await connectDB();
    startJourneyReminderScheduler();
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    const serverMessages =
      error?.reason?.servers instanceof Map
        ? [...error.reason.servers.values()].map((server) => server.error?.message || "")
        : [];
    const message = [error?.message, ...serverMessages].filter(Boolean).join(" ");
    const reason = /authentication failed|bad auth/i.test(message)
      ? "Atlas authentication failed; verify the database username and password."
      : /ENOTFOUND|getaddrinfo|querySrv|queryTxt/i.test(message)
        ? "Atlas DNS lookup failed; verify the cluster hostname and this machine's DNS/network access."
        : /ETIMEDOUT|timed out|server selection/i.test(message)
          ? "Atlas connection timed out; verify Atlas Network Access permits this client's IP."
          : "Check MONGODB_URI and MongoDB Atlas network/database-user settings.";
    console.error(`Backend startup failed: ${reason} (${error?.name || "Error"}).`);
    process.exitCode = 1;
  }
};

startServer();
