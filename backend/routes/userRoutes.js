import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getDashboard,
} from "../controllers/userController.js";

const router = express.Router();
router.use(protect);

router.get("/profile", getProfile);
router.put(
  "/profile",
  [
    body("name").optional().isString().trim().isLength({ min: 1, max: 100 }),
    body("phone")
      .optional()
      .isString()
      .trim()
      .matches(/^\+?[1-9]\d{7,14}$/)
      .withMessage("Enter a valid phone number with 8 to 15 digits"),
    body("age").optional({ nullable: true }).isInt({ min: 1, max: 120 }),
    body("gender").optional().isIn(["Male", "Female", "Other"]),
    body("bloodGroup")
      .optional({ values: "falsy" })
      .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Prefer not to say"])
      .withMessage("Select a valid blood group"),
    body("address").optional().isString().trim().isLength({ max: 500 }),
  ],
  validateRequest,
  updateProfile,
);
router.delete("/delete", deleteAccount);
router.get("/dashboard", getDashboard);

export default router;
