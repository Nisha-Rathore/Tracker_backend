import Attendance from "../models/Attendance.js";
import { getIO } from "../config/socket.js";

const OFFICE_IP = process.env.OFFICE_IP || "";

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getRequestIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (forwardedIp || req.ip || req.socket?.remoteAddress || "").trim();
};

const buildLocationPayload = (req, location = {}) => ({
  latitude: location.latitude ?? null,
  longitude: location.longitude ?? null,
  ip: location.ip || OFFICE_IP || getRequestIp(req),
  officeName: location.officeName || null,
  officeAddress: location.officeAddress || null
});

export const getAttendanceSummary = async (req, res) => {
  const userId = req.user._id;
  const latest = await Attendance.findOne({ user: userId }).sort({ clockIn: -1 });
  const open = await Attendance.findOne({ user: userId, clockOut: { $exists: false } }).sort({ clockIn: -1 });

  res.json({
    status: open ? "present" : "absent",
    lastAttendance: latest,
    currentLocation: open?.locationIn || latest?.locationIn || null
  });
};

export const clockIn = async (req, res) => {
  const userId = req.user._id;
  const { location } = req.body;

  const existing = await Attendance.findOne({
    user: userId,
    clockIn: { $gte: startOfDay(), $lte: endOfDay() },
    clockOut: { $exists: false }
  });

  if (existing) {
    return res.status(409).json({ message: "Already clocked in" });
  }

  const attendance = await Attendance.create({
    user: userId,
    clockIn: new Date(),
    status: "present",
    locationIn: buildLocationPayload(req, location)
  });

  getIO()?.emit("attendanceUpdate", { userId: String(userId), action: "clockin" });
  res.status(201).json({ message: "Clocked in successfully", attendance });
};

export const clockOut = async (req, res) => {
  const userId = req.user._id;
  const { location } = req.body;

  const openAttendance = await Attendance.findOne({
    user: userId,
    clockOut: { $exists: false }
  }).sort({ clockIn: -1 });

  if (!openAttendance) {
    return res.status(409).json({ message: "No active clock-in found" });
  }

  openAttendance.clockOut = new Date();
  openAttendance.locationOut = buildLocationPayload(req, location);
  openAttendance.status = "absent";
  await openAttendance.save();

  getIO()?.emit("attendanceUpdate", { userId: String(userId), action: "clockout" });
  res.json({ message: "Clocked out successfully", attendance: openAttendance });
};

export const getHistory = async (req, res) => {
  const query = req.user.role === "manager" && req.query.userId ? { user: req.query.userId } : { user: req.user._id };
  const records = await Attendance.find(query).sort({ clockIn: -1 }).limit(365);
  res.json({ records });
};
