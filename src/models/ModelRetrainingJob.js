import mongoose from "mongoose";

const ModelRetrainingJobSchema = new mongoose.Schema(
  {
    job_id: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true, trim: true },
    started_at: { type: Date },
    finished_at: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("ModelRetrainingJob", ModelRetrainingJobSchema);
