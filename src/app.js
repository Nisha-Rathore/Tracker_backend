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
import { sanitizeRequest } from "./middleware/sanitize.js";
import { sendSuccess } from "./utils/http.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const explicitOrigins = [
  ...(process.env.CLIENT_URLS || "").split(",").map((v) => v.trim()).filter(Boolean),
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.trim()] : [])
];

const allowedOrigins = [
  ...new Set([
    "https://attendance-tracker-nisha.netlify.app",
    ...explicitOrigins
  ])
];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (process.env.NODE_ENV !== "production" && isLocalhost) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(sanitizeRequest);

app.get("/api/health", (req, res) => {
  return sendSuccess(res, {
    message: "Service healthy",
    data: { ok: true, timestamp: new Date().toISOString() }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/requests", requestRoutes);

app.use(errorHandler);

export default app;
