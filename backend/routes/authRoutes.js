import express from "express";
import { body, validationResult } from "express-validator";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

// Signup route
router.post(
  "/signup",
  [
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Full name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("phone")
      .isString()
      .trim()
      .matches(/^\+?[1-9]\d{7,14}$/)
      .withMessage("Enter a valid phone number with 8 to 15 digits"),
    body("age")
      .isInt({ min: 1, max: 120 })
      .withMessage("Age must be a whole number between 1 and 120")
      .toInt(),
    body("gender").optional().isIn(["Male", "Female", "Other"]),
    body("bloodGroup")
      .optional({ values: "falsy" })
      .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Prefer not to say"]),
    body("address")
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Address is required and must be 500 characters or fewer"),
  ],
  handleValidationErrors,
  signup,
);

// Login route
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  handleValidationErrors,
  login,
);

// Logout route
router.post("/logout", logout);

// Password recovery routes (placeholder for now)
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
  handleValidationErrors,
  forgotPassword,
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  handleValidationErrors,
  resetPassword,
);

export default router;
