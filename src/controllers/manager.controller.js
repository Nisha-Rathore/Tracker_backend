import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import WorkRequest from "../models/WorkRequest.js";
import mongoose from "mongoose";
import { AppError, asyncHandler, sendSuccess } from "../utils/http.js";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";

const start = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const end = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getDashboard = asyncHandler(async (req, res) => {
  const filter = req.query.filter || "all";
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 100 });

  const employees = await User.find({ role: "employee" }).select("name email").lean();
  const employeeIds = employees.map((emp) => emp._id);

  const [todayRecords, latestRecords] = await Promise.all([
    Attendance.aggregate([
      { $match: { user: { $in: employeeIds }, clockIn: { $gte: start(), $lte: end() } } },
      { $sort: { clockIn: -1 } },
      { $group: { _id: "$user", record: { $first: "$$ROOT" } } }
    ]),
    Attendance.aggregate([
      { $match: { user: { $in: employeeIds } } },
      { $sort: { clockIn: -1 } },
      { $group: { _id: "$user", record: { $first: "$$ROOT" } } }
    ])
  ]);

  const latestByUser = new Map();
  for (const record of todayRecords) {
    latestByUser.set(String(record._id), record.record);
  }

  const overallLatestByUser = new Map();
  for (const record of latestRecords) {
    overallLatestByUser.set(String(record._id), record.record);
  }

  let rows = employees.map((emp) => {
    const today = latestByUser.get(String(emp._id));
    const latest = overallLatestByUser.get(String(emp._id));
    const status = today && !today.clockOut ? "present" : "absent";

    return {
      userId: emp._id,
      name: emp.name,
      email: emp.email,
      status,
      today: today || null,
      latest: latest || null
    };
  });

  if (filter === "present") rows = rows.filter((r) => r.status === "present");
  if (filter === "absent") rows = rows.filter((r) => r.status === "absent");
  if (filter === "today") rows = rows.filter((r) => Boolean(r.today));

  const total = rows.length;
  const pagedRows = rows.slice(skip, skip + limit);

  return sendSuccess(res, {
    data: { employees: pagedRows },
    meta: buildPaginationMeta({ page, limit, total })
  });
});

export const getRequests = asyncHandler(async (req, res) => {
  const status = req.query.status || "all";
  const query = ["pending", "approved", "rejected"].includes(status) ? { status } : {};
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25, maxLimit: 200 });

  const [requests, total] = await Promise.all([
    WorkRequest.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WorkRequest.countDocuments(query)
  ]);

  return sendSuccess(res, {
    data: { requests },
    meta: buildPaginationMeta({ page, limit, total })
  });
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new AppError("Invalid requestId", 400);
  }

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError("Status must be approved or rejected", 400);
  }

  const request = await WorkRequest.findByIdAndUpdate(
    requestId,
    { $set: { status } },
    { new: true, runValidators: true }
  ).populate("user", "name email");

  if (!request) {
    throw new AppError("Request not found", 404);
  }

  return sendSuccess(res, {
    message: `Request ${status}`,
    data: { request }
  });
});

export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 500 });
  const query = {};

  if (req.query.userId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
      throw new AppError("Invalid userId", 400);
    }
    query.user = req.query.userId;
  }

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate("user", "name email")
      .sort({ clockIn: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(query)
  ]);

  return sendSuccess(res, {
    data: { records },
    meta: buildPaginationMeta({ page, limit, total })
  });
});
