import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("message").trim().notEmpty().withMessage("Message is required"),
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { message, rating } = req.body;
      const feedback = await Feedback.create({ user: req.user._id, message, rating });
      res.status(201).json(feedback);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
