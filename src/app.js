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

const explicitOrigins = [
  ...(process.env.CLIENT_URLS || "").split(",").map((v) => v.trim()).filter(Boolean),
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.trim()] : [])
];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
      if (process.env.NODE_ENV !== "production" && isLocalhost) {
        return callback(null, true);
      }

      if (explicitOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  })
);
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
