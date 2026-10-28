import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import Report from "../models/Report.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { title, description } = req.body;
      const report = await Report.create({ user: req.user._id, title, description });
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
