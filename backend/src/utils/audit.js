import AuditLog from "../models/AuditLog.js";

export async function writeAuditLog({
  actor = null,
  targetUser = null,
  action,
  outcome = "success",
  reason = "",
  targetEmail = "",
  request,
  metadata = {},
}) {
  try {
    await AuditLog.create({
      actor: actor?._id ?? actor ?? null,
      targetUser: targetUser?._id ?? targetUser ?? null,
      action,
      outcome,
      reason,
      targetEmail,
      ipAddress: request?.ip ?? "",
      metadata,
    });
  } catch (error) {
    // Do not silently treat a failed audit write as successful.
    console.error("Audit log write failed:", error.message);
    throw error;
  }
}