import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/authMiddleware.js";
import { getAlerts, createAlert } from "../controllers/alertController.js";

const router = express.Router();

router.use(authenticate);
router.get("/", getAlerts);
router.post(
  "/",
  [
    body("type").trim().notEmpty().withMessage("Alert type is required"),
    body("risk").isIn(["LOW", "MEDIUM", "HIGH"]).withMessage("Risk must be LOW, MEDIUM, or HIGH"),
    body("status").trim().notEmpty().withMessage("Status is required"),
    body("sentTo").trim().notEmpty().withMessage("Recipient is required"),
  ],
  createAlert
);

export default router;
