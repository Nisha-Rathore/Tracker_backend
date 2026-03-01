import { Router } from "express";
import { getAttendanceHistory, getDashboard, getRequests, updateRequestStatus } from "../controllers/manager.controller.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

const ensureManagerIdentity = (req, res, next) => {
  const { managerId } = req.params;
  if (!managerId) return next();

  if (String(req.user._id) !== String(managerId)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  return next();
};

router.get("/dashboard", protect, authorize("manager"), getDashboard);
router.get("/:managerId/dashboard", protect, authorize("manager"), ensureManagerIdentity, getDashboard);
router.get("/dashboard/:managerId", protect, authorize("manager"), ensureManagerIdentity, getDashboard);

router.get("/history", protect, authorize("manager"), getAttendanceHistory);
router.get("/:managerId/history", protect, authorize("manager"), ensureManagerIdentity, getAttendanceHistory);
router.get("/history/:managerId", protect, authorize("manager"), ensureManagerIdentity, getAttendanceHistory);

router.get("/requests", protect, authorize("manager"), getRequests);
router.get("/:managerId/requests", protect, authorize("manager"), ensureManagerIdentity, getRequests);
router.get("/requests/:managerId", protect, authorize("manager"), ensureManagerIdentity, getRequests);

router.patch("/requests/:requestId", protect, authorize("manager"), updateRequestStatus);
router.patch("/:managerId/requests/:requestId", protect, authorize("manager"), ensureManagerIdentity, updateRequestStatus);

export default router;
