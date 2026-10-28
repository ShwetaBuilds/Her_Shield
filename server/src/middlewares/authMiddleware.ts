import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization?.split(" ");
  if (!authHeader || authHeader[0] !== "Bearer" || !authHeader[1]) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const token = authHeader[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    const payload = jwt.verify(token, secret) as { id: string; email: string; role: string };
    const user = await User.findById(payload.id).select("_id email role");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = { id: user._id.toString(), email: user.email, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
