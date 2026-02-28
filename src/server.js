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

  const allowedOrigins = [
  "http://localhost:5173",
  "https://attendance-tracker-nisha.netlify.app"
];


  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
     origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
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