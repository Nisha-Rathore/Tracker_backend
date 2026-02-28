import { Router } from "express";
import { exportCsv, exportPdf } from "../controllers/export.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/csv", protect, exportCsv);
router.get("/pdf", protect, exportPdf);

export default router;