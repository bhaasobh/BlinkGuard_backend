import mongoose from "mongoose";

const UserFeedbackSchema = new mongoose.Schema(
  {
    feedback_id: { type: String, required: true, unique: true, index: true },
    user_report: { type: String, required: true, trim: true },
    retraining_status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("UserFeedback", UserFeedbackSchema);
