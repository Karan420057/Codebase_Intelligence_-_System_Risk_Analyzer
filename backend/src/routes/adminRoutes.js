import express from "express";
import { listUsers, updateAccountStatus, getAuditLogs, getSecurityAlerts, } from "../controllers/adminController.js";
import { requireAuth, requireAdmin, } from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/users", listUsers);
router.patch("/users/:id/status", updateAccountStatus);
router.get("/audit-logs", getAuditLogs);
router.get("/security-alerts", getSecurityAlerts);

export default router;