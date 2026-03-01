import WorkRequest from "../models/WorkRequest.js";
import { AppError, asyncHandler, sendSuccess } from "../utils/http.js";
import { buildPaginationMeta, getPagination } from "../utils/pagination.js";

export const createRequest = asyncHandler(async (req, res) => {
  const { type, dateFrom, dateTo, reason } = req.body;
  const allowedTypes = ["leave", "remote"];

  if (!type || !dateFrom || !dateTo || !reason) {
    throw new AppError("Type, date range, and reason are required", 400);
  }
  if (!allowedTypes.includes(type)) {
    throw new AppError("Request type must be leave or remote", 400);
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError("Invalid dates provided", 400);
  }

  if (from > to) {
    throw new AppError("From date cannot be after To date", 400);
  }

  const normalizedReason = String(reason).trim();
  if (normalizedReason.length < 5) {
    throw new AppError("Reason must be at least 5 characters", 400);
  }

  const request = await WorkRequest.create({
    user: req.user._id,
    type,
    dateFrom: from,
    dateTo: to,
    reason: normalizedReason
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: "Request submitted successfully",
    data: { request }
  });
});

export const getMyRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const query = { user: req.user._id };

  const [requests, total] = await Promise.all([
    WorkRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WorkRequest.countDocuments(query)
  ]);

  return sendSuccess(res, {
    data: { requests },
    meta: buildPaginationMeta({ page, limit, total })
  });
});
