import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/authMiddleware.js";
import { getContacts, addContact, updateContact, deleteContact } from "../controllers/contactController.js";

const router = express.Router();

router.use(authenticate);
router.get("/", getContacts);
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("relation").trim().notEmpty().withMessage("Relationship is required"),
    body("priority").isIn(["High", "Medium", "Low"]).withMessage("Priority must be High, Medium, or Low"),
  ],
  addContact
);
router.put("/:id", [body("priority").optional().isIn(["High", "Medium", "Low"])], updateContact);
router.delete("/:id", deleteContact);

export default router;
