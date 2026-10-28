import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import LocationHistory from "../models/LocationHistory.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const locations = await LocationHistory.find({ user: req.user._id })
      .sort({ recordedAt: -1 })
      .limit(50);
    res.json(locations);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
    body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { latitude, longitude } = req.body;
      const location = await LocationHistory.create({ user: req.user._id, latitude, longitude });
      res.status(201).json(location);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
