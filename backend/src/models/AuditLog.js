import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      maxlength: 100,
      index: true,
    },
    outcome: {
      type: String,
      enum: ["success", "denied", "failure"],
      required: true,
      default: "success",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    targetEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    ipAddress: {
      type: String,
      maxlength: 100,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);