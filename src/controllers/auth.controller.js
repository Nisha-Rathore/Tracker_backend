import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError, asyncHandler, sendSuccess } from "../utils/http.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(["employee", "manager"]);

const getRedirectPath = (role, userId) => (
  role === "manager" ? `/manager/${userId}/dashboard` : "/dashboard"
);

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required", 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError("Invalid email format", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const normalizedRole = role || "employee";
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    throw new AppError("Invalid role", 400);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: String(email).toLowerCase(),
    password: hashed,
    role: normalizedRole
  });

  const token = generateToken({ userId: user._id, role: user.role });
  return sendSuccess(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      redirectTo: getRedirectPath(user.role, user._id)
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email: String(email).toLowerCase() })
    .select("name email role password")
    .lean();

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken({ userId: user._id, role: user.role });
  return sendSuccess(res, {
    message: "Login successful",
    data: {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      redirectTo: getRedirectPath(user.role, user._id)
    }
  });
});
