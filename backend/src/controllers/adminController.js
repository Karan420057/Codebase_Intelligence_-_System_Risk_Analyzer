import mongoose from "mongoose";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { toPublicUser } from "../utils/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAuditLog } from "../utils/audit.js";

export const listUsers = asyncHandler(async (request, response) => {
  const users = await User.find()
    .select("name email role status statusReason statusChangedAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  response.json({
    users: users.map((user) => ({
      ...toPublicUser(user),
      id: user._id.toString(),
      status: user.status ?? "active",
      statusReason: user.statusReason ?? "",
      statusChangedAt: user.statusChangedAt ?? null,
      createdAt: user.createdAt,
    })),
    activeUserCount: users.filter(
      (user) => user.role === "user" && (user.status ?? "active") === "active",
    ).length,
  });
});

export const updateAccountStatus = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const { status, reason } = request.body ?? {};

  if (!mongoose.isValidObjectId(id)) {
    return response.status(400).json({ error: "Invalid account ID." });
  }

  if (!["suspended", "active", "terminated"].includes(status)) {
    return response.status(400).json({ error: "Invalid account status." });
  }

  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    return response.status(400).json({
      error: "Provide a reason of 1 to 500 characters.",
    });
  }

  const target = await User.findById(id);

  if (!target) {
    return response.status(404).json({ error: "Account not found." });
  }

  if (String(target._id) === String(request.user._id)) {
    return response.status(400).json({
      error: "You cannot change your own account status.",
    });
  }

  // Never allow the last active administrator to be disabled.
  if (
    target.role === "admin" &&
    status !== "active" &&
    (target.status ?? "active") === "active"
  ) {
    const activeAdmins = await User.countDocuments({
      role: "admin",
      status: { $in: ["active", null] },
    });

    if (activeAdmins <= 1) {
      return response.status(400).json({
        error: "The last active administrator cannot be disabled.",
      });
    }
  }

  if (target.status === "terminated" && status !== "terminated") {
    return response.status(400).json({
      error: "Terminated accounts cannot be reactivated through this endpoint.",
    });
  }

  const previousStatus = target.status ?? "active";

  if (previousStatus === status) {
    return response.status(400).json({
      error: `This account is already ${status}.`,
    });
  }

  target.status = status;
  target.statusReason = reason.trim();
  target.statusChangedAt = new Date();
  target.statusChangedBy = request.user._id;

  await target.save();

  await writeAuditLog({
    actor: request.user._id,
    targetUser: target._id,
    targetEmail: target.email,
    action:
      status === "terminated"
        ? "account_terminated"
        : status === "suspended"
          ? "account_suspended"
          : "account_restored",
    outcome: "success",
    reason: reason.trim(),
    request,
    metadata: { previousStatus, newStatus: status },
  });

  response.json({
    success: true,
    user: {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
      statusReason: target.statusReason,
    },
  });
});

export const getAuditLogs = asyncHandler(async (request, response) => {
  const logs = await AuditLog.find()
    .populate("actor", "name email")
    .populate("targetUser", "name email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  response.json({
    logs: logs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      outcome: log.outcome,
      reason: log.reason,
      targetEmail: log.targetEmail,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
      actor: log.actor
        ? { name: log.actor.name, email: log.actor.email }
        : null,
      targetUser: log.targetUser
        ? { name: log.targetUser.name, email: log.targetUser.email }
        : null,
    })),
  });
});

export const getSecurityAlerts = asyncHandler(async (request, response) => {
  const alerts = await AuditLog.find({
    $or: [
      { outcome: { $in: ["denied", "failure"] } },
      { action: { $in: ["login_failed", "blocked_login", "admin_access_denied"] } },
    ],
  })
    .populate("actor", "name email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  response.json({
    alerts: alerts.map((item) => ({
      id: item._id.toString(),
      action: item.action,
      outcome: item.outcome,
      reason: item.reason,
      targetEmail: item.targetEmail,
      ipAddress: item.ipAddress,
      createdAt: item.createdAt,
      actor: item.actor
        ? { name: item.actor.name, email: item.actor.email }
        : null,
    })),
  });
});