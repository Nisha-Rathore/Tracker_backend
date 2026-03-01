import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { setSocketServer } from "./config/socket.js";

const basePort = Number(process.env.PORT || 5000);
const maxPortRetries = Number(process.env.PORT_RETRIES || 10);

const start = async () => {
  await connectDB();

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

  const server = http.createServer(app);
  const io = new Server(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  setSocketServer(io);

  let attempts = 0;

  const listen = (port) => {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  };

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempts < maxPortRetries) {
      attempts += 1;
      const nextPort = basePort + attempts;
      console.warn(`Port ${basePort + attempts - 1} is in use. Retrying on ${nextPort}...`);
      listen(nextPort);
      return;
    }

    console.error("Server failed to start", err);
    process.exit(1);
  });

  listen(basePort);
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
