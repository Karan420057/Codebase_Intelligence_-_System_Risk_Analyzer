import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAuditLog } from "../utils/audit.js";

export const requireAuth = asyncHandler(async (request, response, next) => {
  const userId = request.session?.userId;

  if (!userId) {
    return response.status(401).json({
      error: "Authentication is required.",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return response.status(401).json({
      error: "Authentication is required.",
    });
  }

  if (user.status === "suspended" || user.status === "terminated") {
    // Destroy the current session so it cannot be reused.
    if (request.session) {
      request.session.destroy(() => {});
    }

    return response.status(403).json({
      error:
        user.status === "suspended"
          ? "This account is suspended. Contact an administrator."
          : "This account has been terminated.",
      code: `ACCOUNT_${user.status.toUpperCase()}`,
    });
  }

  request.user = user;
  next();
});

export async function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") {
    try {
      await writeAuditLog({
        actor: request.user?._id ?? null,
        action: "admin_access_denied",
        outcome: "denied",
        reason: "Administrator permission required.",
        request,
        metadata: { path: request.originalUrl },
      });
    } catch {
      // The access denial must still be enforced if logging fails.
    }

    return response.status(403).json({
      error: "Administrator access is required.",
    });
  }

  next();
}