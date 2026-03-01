import Attendance from "../models/Attendance.js";
import { getIO } from "../config/socket.js";
import mongoose from "mongoose";
import { AppError, asyncHandler, sendSuccess } from "../utils/http.js";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";

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

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [latest, open] = await Promise.all([
    Attendance.findOne({ user: userId }).sort({ clockIn: -1 }).lean(),
    Attendance.findOne({ user: userId, clockOut: { $exists: false } }).sort({ clockIn: -1 }).lean()
  ]);

  return sendSuccess(res, {
    data: {
      status: open ? "present" : "absent",
      lastAttendance: latest || null,
      currentLocation: open?.locationIn || latest?.locationIn || null
    }
  });
});

export const clockIn = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { location } = req.body;

  const existing = await Attendance.findOne({
    user: userId,
    clockIn: { $gte: startOfDay(), $lte: endOfDay() },
    clockOut: { $exists: false }
  });

  if (existing) {
    throw new AppError("Already clocked in", 409);
  }

  const attendance = await Attendance.create({
    user: userId,
    clockIn: new Date(),
    status: "present",
    locationIn: buildLocationPayload(req, location)
  });

  getIO()?.emit("attendanceUpdate", { userId: String(userId), action: "clockin" });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Clocked in successfully",
    data: { attendance }
  });
});

export const clockOut = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { location } = req.body;

  const openAttendance = await Attendance.findOne({
    user: userId,
    clockOut: { $exists: false }
  }).sort({ clockIn: -1 });

  if (!openAttendance) {
    throw new AppError("No active clock-in found", 409);
  }

  openAttendance.clockOut = new Date();
  openAttendance.locationOut = buildLocationPayload(req, location);
  openAttendance.status = "absent";
  await openAttendance.save();

  getIO()?.emit("attendanceUpdate", { userId: String(userId), action: "clockout" });
  return sendSuccess(res, {
    message: "Clocked out successfully",
    data: { attendance: openAttendance }
  });
});

export const getHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 30, maxLimit: 365 });

  const query = { user: req.user._id };
  if (req.user.role === "manager" && req.query.userId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
      throw new AppError("Invalid userId", 400);
    }
    query.user = req.query.userId;
  }

  const [records, total] = await Promise.all([
    Attendance.find(query).sort({ clockIn: -1 }).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(query)
  ]);

  return sendSuccess(res, {
    data: { records },
    meta: buildPaginationMeta({ page, limit, total })
  });
});
