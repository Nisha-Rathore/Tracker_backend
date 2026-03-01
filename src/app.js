import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import managerRoutes from "./routes/manager.routes.js";
import exportRoutes from "./routes/export.routes.js";
import requestRoutes from "./routes/request.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const normalizeOrigin = (value = "") => String(value).trim().replace(/\/$/, "");

const explicitOrigins = [
  ...(process.env.CLIENT_URLS || "").split(",").map(normalizeOrigin).filter(Boolean),
  ...(process.env.CLIENT_URL ? [normalizeOrigin(process.env.CLIENT_URL)] : [])
];

const allowedOrigins = [
  ...new Set([
    "https://attendance-tracker-nisha.netlify.app",
    ...explicitOrigins
  ])
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);
  if (isLocalhost) return true;

  return allowedOrigins.includes(normalizedOrigin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400
};

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/requests", requestRoutes);

app.use(errorHandler);

export default app;
