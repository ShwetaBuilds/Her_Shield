import EmergencyContact from "../models/EmergencyContact.js";
import SOSHistory from "../models/SOSHistory.js";
import LocationHistory from "../models/LocationHistory.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import Feedback from "../models/Feedback.js";
import SafetyJourney from "../models/SafetyJourney.js";

export const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      address: user.address,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const fields = ["name", "phone", "age", "gender", "bloodGroup", "address"];
    for (const field of fields) {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    }
    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      gender: user.gender,
      bloodGroup: user.bloodGroup,
      address: user.address,
      profileImage: user.profileImage,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await EmergencyContact.deleteMany({ user: req.user._id });
    await SOSHistory.deleteMany({ user: req.user._id });
    await LocationHistory.deleteMany({ user: req.user._id });
    await Notification.deleteMany({ user: req.user._id });
    await Report.deleteMany({ user: req.user._id });
    await Feedback.deleteMany({ user: req.user._id });
    await SafetyJourney.deleteMany({ user: req.user._id });
    await req.user.deleteOne();
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const contacts = await EmergencyContact.find({ user: user._id });
    const sosHistory = await SOSHistory.find({ user: user._id }).sort({ createdAt: -1 });
    const locationHistory = await LocationHistory.find({ user: user._id })
      .sort({ recordedAt: -1 })
      .limit(10);
    const notifications = await Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    const recentReports = await Report.find({ user: user._id }).sort({ createdAt: -1 }).limit(5);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
      },
      emergencyContacts: contacts,
      sosHistory,
      locationHistory,
      notifications,
      recentReports,
    });
  } catch (error) {
    next(error);
  }
};
