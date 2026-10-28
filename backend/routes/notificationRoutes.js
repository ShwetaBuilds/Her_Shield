import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("message").trim().notEmpty().withMessage("Message is required"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { title, message } = req.body;
      const notification = await Notification.create({ user: req.user._id, title, message });
      res.status(201).json(notification);
    } catch (error) {
      next(error);
    }
  },
);

router.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

export default router;
