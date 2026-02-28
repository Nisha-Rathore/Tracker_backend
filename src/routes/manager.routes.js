import { Router } from "express";
import { getAttendanceHistory, getDashboard, getRequests, updateRequestStatus } from "../controllers/manager.controller.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", protect, authorize("manager"), getDashboard);
router.get("/history", protect, authorize("manager"), getAttendanceHistory);
router.get("/requests", protect, authorize("manager"), getRequests);
router.patch("/requests/:requestId", protect, authorize("manager"), updateRequestStatus);

export default router;
