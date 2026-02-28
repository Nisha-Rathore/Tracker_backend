import { Router } from "express";
import { clockIn, clockOut, getAttendanceSummary, getHistory } from "../controllers/attendance.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getAttendanceSummary);
router.post("/clockin", protect, clockIn);
router.post("/clockout", protect, clockOut);
router.get("/history", protect, getHistory);

export default router;