import { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";

const createToken = (user: { id: string; email: string; role: string }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign(user, secret, { expiresIn: "7d" });
};

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, phone } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: "Email already registered" });

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed, phone });

  const token = createToken({ id: user._id.toString(), email: user.email, role: user.role });

  await sendEmail({
    to: user.email,
    subject: "Welcome to Her Shield",
    html: `<p>Hello ${user.name},</p><p>Welcome to Her Shield. Your account has been created successfully.</p>`,
  });

  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = createToken({ id: user._id.toString(), email: user.email, role: user.role });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ message: "If the email exists, a reset link will be sent." });

  const resetToken = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET || "", { expiresIn: "1h" });
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Her Shield Password Reset",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });

  res.json({ message: "If the email exists, a reset link will be sent." });
};
