import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError, asyncHandler } from "../utils/http.js";

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const tokenFromAuthHeader = /^Bearer\s+/i.test(authHeader)
    ? authHeader.replace(/^Bearer\s+/i, "").trim()
    : authHeader.trim();
  const token =
    tokenFromAuthHeader ||
    req.headers["x-access-token"] ||
    req.headers["x-auth-token"] ||
    req.query.token;

  if (!token) {
    throw new AppError("Unauthorized", 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId).select("_id name email role").lean();

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError("Forbidden", 403));
  }
  next();
};
