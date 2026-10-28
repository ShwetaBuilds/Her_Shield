import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.use(authenticate);
router.get("/me", getProfile);
router.put(
  "/me",
  [body("name").trim().notEmpty().withMessage("Name is required"), body("phone").optional().trim()],
  updateProfile
);

export default router;
