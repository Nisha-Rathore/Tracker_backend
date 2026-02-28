import { Router } from "express";
import { createRequest, getMyRequests } from "../controllers/request.controller.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/my", protect, authorize("employee"), getMyRequests);
router.post("/", protect, authorize("employee"), createRequest);

export default router;
