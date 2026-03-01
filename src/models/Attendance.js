import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    status: { type: String, enum: ["present", "absent"], default: "present" },
    locationIn: {
      latitude: Number,
      longitude: Number,
      ip: String,
      officeName: String,
      officeAddress: String
    },
    locationOut: {
      latitude: Number,
      longitude: Number,
      ip: String,
      officeName: String,
      officeAddress: String
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, clockIn: -1 });
attendanceSchema.index({ clockIn: -1 });
attendanceSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { clockOut: { $exists: false } },
    name: "unique_open_attendance_per_user"
  }
);

export default mongoose.model("Attendance", attendanceSchema);
