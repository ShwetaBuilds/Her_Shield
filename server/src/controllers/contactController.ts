import { type Response } from "express";
import Contact from "../models/Contact.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { validationResult } from "express-validator";

export const getContacts = async (req: AuthRequest, res: Response) => {
  const contacts = await Contact.find({ user: req.user?.id });
  res.json(contacts);
};

export const addContact = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone, relation, priority } = req.body;
  const contact = await Contact.create({ user: req.user?.id, name, phone, relation, priority });
  res.status(201).json(contact);
};

export const updateContact = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, user: req.user?.id },
    req.body,
    { new: true }
  );
  if (!contact) return res.status(404).json({ message: "Contact not found" });
  res.json(contact);
};

export const deleteContact = async (req: AuthRequest, res: Response) => {
  const contact = await Contact.findOneAndDelete({ _id: req.params.id, user: req.user?.id });
  if (!contact) return res.status(404).json({ message: "Contact not found" });
  res.json({ message: "Contact removed" });
};
