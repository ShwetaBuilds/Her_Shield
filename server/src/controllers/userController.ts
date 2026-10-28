import { type Response } from "express";
import User from "../models/User.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { validationResult } from "express-validator";

export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id).select("name email phone role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(req.user?.id, { name, phone }, { new: true }).select("name email phone role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};
