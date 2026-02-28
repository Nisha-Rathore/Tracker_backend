import WorkRequest from "../models/WorkRequest.js";

export const createRequest = async (req, res) => {
  const { type, dateFrom, dateTo, reason } = req.body;
  const allowedTypes = ["leave", "remote"];

  if (!type || !dateFrom || !dateTo || !reason) {
    return res.status(400).json({ message: "Type, date range, and reason are required" });
  }
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ message: "Request type must be leave or remote" });
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return res.status(400).json({ message: "Invalid dates provided" });
  }

  if (from > to) {
    return res.status(400).json({ message: "From date cannot be after To date" });
  }

  const request = await WorkRequest.create({
    user: req.user._id,
    type,
    dateFrom: from,
    dateTo: to,
    reason: reason.trim()
  });

  res.status(201).json({ message: "Request submitted successfully", request });
};

export const getMyRequests = async (req, res) => {
  const requests = await WorkRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ requests });
};
