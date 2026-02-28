import mongoose from "mongoose";

const workRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["leave", "remote"], required: true },
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

workRequestSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("WorkRequest", workRequestSchema);
