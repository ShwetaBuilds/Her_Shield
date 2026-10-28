import express from "express";
import { body } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import EmergencyContact from "../models/EmergencyContact.js";

const router = express.Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const contacts = await EmergencyContact.find({ user: req.user._id });
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("name").isString().trim().isLength({ min: 1, max: 100 }).withMessage("Name is required"),
    body("phone")
      .isString()
      .trim()
      .matches(/^\+[1-9]\d{7,14}$/)
      .withMessage("Enter a phone number in E.164 format, including the country code"),
    body("relation")
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Relationship is required"),
    body("priority").isIn(["High", "Medium", "Low"]).withMessage("Priority is required"),
    body("smsConsent").optional().isBoolean().withMessage("SMS consent must be true or false"),
    body("journeyShareConsent")
      .optional()
      .isBoolean()
      .withMessage("Journey sharing consent must be true or false"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        name,
        phone,
        relation,
        priority,
        smsConsent = false,
        journeyShareConsent = false,
      } = req.body;
      const contact = await EmergencyContact.create({
        name,
        phone,
        relation,
        priority,
        smsConsent,
        smsConsentAt: smsConsent ? new Date() : undefined,
        journeyShareConsent,
        journeyShareConsentAt: journeyShareConsent ? new Date() : undefined,
        user: req.user._id,
      });
      res.status(201).json(contact);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  [
    body("name").optional().isString().trim().isLength({ min: 1, max: 100 }),
    body("phone")
      .optional()
      .isString()
      .trim()
      .matches(/^\+[1-9]\d{7,14}$/)
      .withMessage("Enter a phone number in E.164 format, including the country code"),
    body("relation").optional().isString().trim().isLength({ min: 1, max: 50 }),
    body("priority").optional().isIn(["High", "Medium", "Low"]),
    body("smsConsent").optional().isBoolean().withMessage("SMS consent must be true or false"),
    body("journeyShareConsent")
      .optional()
      .isBoolean()
      .withMessage("Journey sharing consent must be true or false"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, phone, relation, priority, smsConsent, journeyShareConsent } = req.body;
      const contact = await EmergencyContact.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        {
          name,
          phone,
          relation,
          priority,
          smsConsent,
          ...(smsConsent !== undefined ? { smsConsentAt: smsConsent ? new Date() : null } : {}),
          journeyShareConsent,
          ...(journeyShareConsent !== undefined
            ? { journeyShareConsentAt: journeyShareConsent ? new Date() : null }
            : {}),
        },
        { new: true, runValidators: true },
      );
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      res.json(contact);
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", async (req, res, next) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
