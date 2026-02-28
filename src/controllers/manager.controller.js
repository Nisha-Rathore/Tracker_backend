import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import WorkRequest from "../models/WorkRequest.js";

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

export const getDashboard = async (req, res) => {
  const filter = req.query.filter || "all";

  const employees = await User.find({ role: "employee" }).select("name email");
  const employeeIds = employees.map((emp) => emp._id);
  const todayRecords = await Attendance.find({ clockIn: { $gte: start(), $lte: end() } }).sort({ clockIn: -1 });
  const latestRecords = await Attendance.find({ user: { $in: employeeIds } }).sort({ clockIn: -1 });

  const latestByUser = new Map();
  for (const record of todayRecords) {
    const key = String(record.user);
    if (!latestByUser.has(key)) {
      latestByUser.set(key, record);
    }
  }

  const overallLatestByUser = new Map();
  for (const record of latestRecords) {
    const key = String(record.user);
    if (!overallLatestByUser.has(key)) {
      overallLatestByUser.set(key, record);
    }
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

  res.json({ employees: rows });
};

export const getRequests = async (req, res) => {
  const status = req.query.status || "all";
  const query = ["pending", "approved", "rejected"].includes(status) ? { status } : {};

  const requests = await WorkRequest.find(query)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({ requests });
};

export const updateRequestStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status must be approved or rejected" });
  }

  const request = await WorkRequest.findById(requestId);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  request.status = status;
  await request.save();

  const populated = await WorkRequest.findById(request._id).populate("user", "name email");
  res.json({ message: `Request ${status}`, request: populated });
};

export const getAttendanceHistory = async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const query = req.query.userId ? { user: req.query.userId } : {};

  const records = await Attendance.find(query)
    .populate("user", "name email")
    .sort({ clockIn: -1 })
    .limit(limit);

  res.json({ records });
};
