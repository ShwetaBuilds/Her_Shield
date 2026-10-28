import { type Response } from "express";
import Alert from "../models/Alert.js";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { validationResult } from "express-validator";

export const getAlerts = async (req: AuthRequest, res: Response) => {
  const alerts = await Alert.find({ user: req.user?.id }).sort({ createdAt: -1 });
  res.json(alerts);
};

export const createAlert = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { type, risk, status, sentTo, metadata } = req.body;
  const alert = await Alert.create({ user: req.user?.id, type, risk, status, sentTo, metadata });
  res.status(201).json(alert);
};
