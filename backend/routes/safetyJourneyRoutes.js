import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import {
  listJourneys,
  createJourney,
  checkInJourney,
  extendJourney,
  completeJourney,
  cancelJourney,
  deleteJourney,
} from "../controllers/safetyJourneyController.js";

const router = express.Router();
router.use(protect);

router.get("/", listJourneys);
router.post(
  "/",
  [
    body("destination")
      .isString()
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage("Destination must be between 2 and 120 characters"),
    body("expectedArrivalAt")
      .isISO8601({ strict: true })
      .withMessage("Expected arrival must be a valid date and time")
      .bail()
      .custom((value) => new Date(value) > new Date())
      .withMessage("Expected arrival must be in the future"),
    body("notifyContactIds")
      .optional()
      .isArray({ max: 5 })
      .withMessage("Choose up to five journey contacts"),
    body("notifyContactIds.*")
      .optional()
      .isMongoId()
      .withMessage("Journey contact IDs must be valid"),
  ],
  validateRequest,
  createJourney,
);
router.post("/:id/check-in", checkInJourney);
router.patch(
  "/:id/extend",
  [
    body("expectedArrivalAt")
      .isISO8601({ strict: true })
      .withMessage("Expected arrival must be a valid date and time")
      .bail()
      .custom((value) => new Date(value) > new Date())
      .withMessage("Expected arrival must be in the future"),
  ],
  validateRequest,
  extendJourney,
);
router.patch("/:id/complete", completeJourney);
router.patch("/:id/cancel", cancelJourney);
router.delete("/:id", deleteJourney);

export default router;
