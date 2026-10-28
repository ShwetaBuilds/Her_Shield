import bcrypt from "bcrypt";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export const signup = async (req, res, next) => {
  try {
    const { name, email, phone, age, gender, bloodGroup, address, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof phone !== "string" ||
      !/^\+?[1-9]\d{7,14}$/.test(phone.trim()) ||
      !Number.isInteger(Number(age)) ||
      Number(age) < 1 ||
      Number(age) > 120 ||
      typeof address !== "string" ||
      !address.trim() ||
      address.trim().length > 500
    ) {
      return res.status(400).json({
        message:
          "Full name, valid email, password (at least 8 characters), valid phone number, age (1 to 120), and address are required",
      });
    }
    const allowedBloodGroups = [
      "A+",
      "A-",
      "B+",
      "B-",
      "AB+",
      "AB-",
      "O+",
      "O-",
      "Prefer not to say",
    ];
    if (bloodGroup && !allowedBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({ message: "Select a valid blood group" });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Email already registered. Please login or use a different email." });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({ message: "Phone number is already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (isVerified defaults to true since we're not using email verification)
    const user = await User.create({
      name,
      email,
      phone,
      age,
      gender,
      bloodGroup,
      address,
      password: hashedPassword,
      isVerified: true, // Auto-verify since no email verification
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res
        .status(409)
        .json({ message: "Email already registered. Please login or use a different email." });
    }
    if (error?.code === 11000 && error?.keyPattern?.phone) {
      return res.status(409).json({ message: "Phone number is already registered." });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.status(200).json({ message: "Logout successful" });
};

export const forgotPassword = async (_req, res) => {
  res.status(501).json({ message: "Password reset email is not configured for this deployment" });
};

export const resetPassword = async (_req, res) => {
  res.status(501).json({ message: "Password reset is not configured for this deployment" });
};
